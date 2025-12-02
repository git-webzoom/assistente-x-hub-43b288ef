import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[CREATE-TENANT-WITH-ADMIN] Request received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1) Autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-TENANT-WITH-ADMIN] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado - header de autenticação ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] User authenticated:', user.id);

    // 2) Verificar se é superadmin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[CREATE-TENANT-WITH-ADMIN] Role check:', { roleData, roleError });

    if (roleError) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Role query error:', roleError);
      return new Response(
        JSON.stringify({ error: `Erro ao verificar permissões: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData || roleData.role !== 'superadmin') {
      console.error('[CREATE-TENANT-WITH-ADMIN] Not superadmin:', roleData);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas superadmins podem criar tenants.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] Superadmin verified');

    // 3) Validar body
    const body = await req.json();
    const { tenantName, adminEmail, adminPassword, adminName } = body;

    console.log('[CREATE-TENANT-WITH-ADMIN] Request body:', { tenantName, adminEmail, adminName, hasPassword: !!adminPassword });

    if (!tenantName || !adminEmail || !adminPassword) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Nome do tenant, email do admin e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (adminPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] Creating tenant:', tenantName);

    // 4) Criar tenant
    const { data: newTenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name: tenantName,
        is_active: true,
      })
      .select()
      .single();

    if (tenantError || !newTenant) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Tenant creation error:', tenantError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar tenant: ${tenantError?.message || 'Erro desconhecido'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] Tenant created:', newTenant.id);

    // 5) Criar usuário admin no Auth
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName || adminEmail.split('@')[0],
      },
    });

    if (createError || !newUser?.user) {
      console.error('[CREATE-TENANT-WITH-ADMIN] User creation error:', createError);
      // Rollback: deletar tenant criado
      await supabaseClient.from('tenants').delete().eq('id', newTenant.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário admin: ${createError?.message || 'Erro desconhecido'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] Admin user created:', newUser.user.id);

    // 6) Inserir na tabela users
    const { error: usersError } = await supabaseClient
      .from('users')
      .insert({
        id: newUser.user.id,
        email: adminEmail,
        name: adminName || adminEmail.split('@')[0],
        tenant_id: newTenant.id,
      });

    if (usersError) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Error inserting user:', usersError);
      // Rollback
      await supabaseClient.from('tenants').delete().eq('id', newTenant.id);
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao adicionar usuário: ${usersError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] User added to users table');

    // 7) Definir role admin
    const { error: roleUpsertError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin',
      });

    if (roleUpsertError) {
      console.error('[CREATE-TENANT-WITH-ADMIN] Error setting role:', roleUpsertError);
      // Rollback
      await supabaseClient.from('tenants').delete().eq('id', newTenant.id);
      await supabaseClient.from('users').delete().eq('id', newUser.user.id);
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao definir role: ${roleUpsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TENANT-WITH-ADMIN] Admin role set successfully');

    // 8) Log audit (opcional - não falha se der erro)
    try {
      await supabaseClient.from('audit_logs').insert({
        action: 'CREATE',
        table_name: 'tenants',
        record_id: newTenant.id,
        tenant_id: newTenant.id,
        changes: { tenant: newTenant, admin: { email: adminEmail, name: adminName } },
      });
      console.log('[CREATE-TENANT-WITH-ADMIN] Audit log created');
    } catch (auditError) {
      console.warn('[CREATE-TENANT-WITH-ADMIN] Audit log failed (non-critical):', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: newTenant,
        admin: {
          id: newUser.user.id,
          email: adminEmail,
          name: adminName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CREATE-TENANT-WITH-ADMIN] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: `Erro inesperado: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
