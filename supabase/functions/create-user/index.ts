import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('[CREATE-USER] Request received');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-USER] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado - header de autenticação ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[CREATE-USER] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] User authenticated:', user.id);

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin')) {
      console.error('[CREATE-USER] Role check failed:', { roleError, roleData });
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] User role verified:', roleData.role);

    const { data: adminData, error: adminError } = await supabaseClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData?.tenant_id) {
      console.error('[CREATE-USER] Tenant check failed:', adminError);
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] Tenant verified:', adminData.tenant_id);

    const { email, role, name, password } = await req.json();

    if (!email || !role) {
      console.error('[CREATE-USER] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Email e role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password) {
      console.error('[CREATE-USER] Missing password');
      return new Response(
        JSON.stringify({ error: 'Senha é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] Creating user with email:', email);

    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });

    if (createError) {
      console.error('[CREATE-USER] User creation error:', createError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário no Auth: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] User created in auth:', newUser.user.id);

    const { error: usersError } = await supabaseClient
      .from('users')
      .insert({
        id: newUser.user.id,
        email,
        name: name || email.split('@')[0],
        tenant_id: adminData.tenant_id,
      });

    if (usersError) {
      console.error('[CREATE-USER] Error adding user to users table:', usersError);
      return new Response(
        JSON.stringify({ error: `Erro ao adicionar usuário na tabela users: ${usersError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] User added to users table');

    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleInsertError) {
      console.error('[CREATE-USER] Error adding user role:', roleInsertError);
      return new Response(
        JSON.stringify({ error: `Erro ao adicionar role: ${roleInsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-USER] User role added successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CREATE-USER] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: `Erro inesperado: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
