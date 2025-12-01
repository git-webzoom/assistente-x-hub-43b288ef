-- ============================================
-- MIGRATION: API Keys System
-- Execute this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create api_keys table if not exists
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage api_keys in tenant" ON public.api_keys;

-- Create RLS policy
CREATE POLICY "Users can manage api_keys in tenant"
ON public.api_keys
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- Create function to generate API keys
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_name TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_api_key TEXT;
  v_key_prefix TEXT;
  v_key_hash TEXT;
  v_api_key_id UUID;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a tenant';
  END IF;

  -- Generate random API key (32 bytes = 64 hex characters)
  v_api_key := 'ak_' || encode(gen_random_bytes(32), 'hex');
  
  -- Extract prefix (first 12 characters after 'ak_')
  v_key_prefix := substring(v_api_key from 1 for 12);
  
  -- Hash the full key for storage
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');

  -- Insert into api_keys table
  INSERT INTO public.api_keys (
    tenant_id,
    name,
    key_prefix,
    key_hash,
    expires_at,
    is_active
  )
  VALUES (
    v_tenant_id,
    p_name,
    v_key_prefix,
    v_key_hash,
    p_expires_at,
    true
  )
  RETURNING id INTO v_api_key_id;

  -- Return the API key (only time it will be shown)
  RETURN json_build_object(
    'id', v_api_key_id,
    'api_key', v_api_key,
    'key_prefix', v_key_prefix
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_api_key(TEXT, TIMESTAMPTZ) TO authenticated;

-- Create function to validate API keys
CREATE OR REPLACE FUNCTION public.validate_api_key(p_api_key TEXT)
RETURNS TABLE (
  api_key_id UUID,
  tenant_id UUID,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_hash TEXT;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

  -- Return matching key info
  RETURN QUERY
  SELECT 
    ak.id,
    ak.tenant_id,
    (ak.is_active AND (ak.expires_at IS NULL OR ak.expires_at > now()))::BOOLEAN as is_valid
  FROM public.api_keys ak
  WHERE ak.key_hash = v_key_hash;

  -- Update last_used_at if key was found and valid
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = v_key_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_api_key(TEXT) TO anon;

COMMENT ON TABLE public.api_keys IS 'Stores API keys for external integrations';
COMMENT ON FUNCTION public.create_api_key IS 'Creates a new API key and returns it (only shown once)';
COMMENT ON FUNCTION public.validate_api_key IS 'Validates an API key and returns tenant info';
