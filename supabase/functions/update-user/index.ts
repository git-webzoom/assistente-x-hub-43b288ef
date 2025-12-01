import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se usuário é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin')) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem atualizar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter tenant do admin
    const { data: adminData } = await supabaseClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!adminData?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, email, role, name } = await req.json();

    if (!userId || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'userId, email e role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário pertence ao mesmo tenant
    const { data: targetUser } = await supabaseClient
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (!targetUser || targetUser.tenant_id !== adminData.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado ou não pertence ao seu tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar email no Auth
    const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { email }
    );

    if (updateAuthError) {
      console.error('Erro ao atualizar email:', updateAuthError);
    }

    // Atualizar dados na tabela users
    const { error: updateUserError } = await supabaseClient
      .from('users')
      .update({
        email,
        name: name || email.split('@')[0],
      })
      .eq('id', userId);

    if (updateUserError) {
      return new Response(
        JSON.stringify({ error: updateUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar role
    const { error: updateRoleError } = await supabaseClient
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId);

    if (updateRoleError) {
      return new Response(
        JSON.stringify({ error: updateRoleError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
