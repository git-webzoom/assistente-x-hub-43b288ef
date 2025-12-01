import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

// Helper: Authenticate request
async function authenticate(req, supabase) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return null;
  }

  const { data: keyData, error } = await supabase.rpc('verify_api_key', {
    p_api_key: apiKey
  });

  if (error || !keyData || keyData.length === 0) {
    console.error('API key verification failed:', error);
    return null;
  }

  const apiKeyRecord = keyData[0];

  if (!apiKeyRecord.is_active) {
    return null;
  }

  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return null;
  }

  await supabase.from('api_keys').update({
    last_used_at: new Date().toISOString()
  }).eq('id', apiKeyRecord.id);

  return {
    tenantId: apiKeyRecord.tenant_id,
    apiKeyId: apiKeyRecord.id,
    supabase
  };
}

// Helper: Parse pagination params
function parsePagination(url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const cursor = url.searchParams.get('cursor') || undefined;
  return { limit, cursor };
}

// Helper: Parse filters
function parseFilters(url) {
  const filters = {};
  const params = url.searchParams;
  
  for (const [key, value] of params.entries()) {
    if (!['limit', 'cursor', 'include', 'tag'].includes(key)) {
      if (key.startsWith('custom_fields.')) {
        const fieldName = key.substring('custom_fields.'.length);
        filters[`custom_fields->${fieldName}`] = value;
      } else {
        filters[key] = value;
      }
    }
  }
  return filters;
}

// Helper: Build query with filters
function applyFilters(query, filters) {
  for (const [key, value] of Object.entries(filters)) {
    if (key.includes('->')) {
      query = query.filter(key, 'eq', value);
    } else if (key.endsWith('_gte')) {
      query = query.gte(key.replace('_gte', ''), value);
    } else if (key.endsWith('_lte')) {
      query = query.lte(key.replace('_lte', ''), value);
    } else if (key.endsWith('_like')) {
      query = query.ilike(key.replace('_like', ''), `%${value}%`);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

// Helper: Format tags from joined data
function formatTags(item, tagRelationKey) {
  if (!item[tagRelationKey]) return item;
  
  const tags = item[tagRelationKey]
    .map(ct => ct.tags)
    .filter(Boolean);
  
  const { [tagRelationKey]: _, ...rest } = item;
  return { ...rest, tags };
}

// Helper: Trigger webhooks
async function triggerWebhooks(supabase, tenantId, eventType, payload) {
  try {
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!webhooks || webhooks.length === 0) return;

    for (const webhook of webhooks) {
      const signature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(webhook.secret + JSON.stringify(payload))
      );
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signatureHex,
          'X-Event-Type': eventType
        },
        body: JSON.stringify(payload)
      }).then(async (response) => {
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: response.status,
          response_body: await response.text()
        });
      }).catch(async (error) => {
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: 0,
          response_body: error.message
        });
      });
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

// Helper: Format response with metadata
function formatResponse(data, pagination, links) {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination })
    },
    ...(links && { links })
  };
}

// CRUD Handlers for Contacts
async function handleContacts(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  // Check for nested routes
  if (id && path[2] === 'tags') {
    return handleContactTags(req, ctx, id);
  }

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('contacts')
        .select('*, contact_tags(tag_id, tags(*))')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(formatTags(data, 'contact_tags'))), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);
      const tagFilter = url.searchParams.get('tag');

      let query;
      
      if (tagFilter) {
        // Filter by tag name
        const { data: tagData } = await ctx.supabase
          .from('tags')
          .select('id')
          .eq('tenant_id', ctx.tenantId)
          .ilike('name', tagFilter)
          .single();

        if (!tagData) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get contacts with this tag
        const { data: contactTagsData } = await ctx.supabase
          .from('contact_tags')
          .select('contact_id')
          .eq('tag_id', tagData.id);

        const contactIds = contactTagsData?.map(ct => ct.contact_id) || [];

        if (contactIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        query = ctx.supabase
          .from('contacts')
          .select('*, contact_tags(tag_id, tags(*))', { count: 'exact' })
          .eq('tenant_id', ctx.tenantId)
          .in('id', contactIds)
          .order('created_at', { ascending: false })
          .limit(pagination.limit);
      } else {
        query = ctx.supabase
          .from('contacts')
          .select('*, contact_tags(tag_id, tags(*))', { count: 'exact' })
          .eq('tenant_id', ctx.tenantId)
          .order('created_at', { ascending: false })
          .limit(pagination.limit);
      }

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const formattedData = data.map(item => formatTags(item, 'contact_tags'));
      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(formattedData, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('contacts')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'contact.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('contacts')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'contact.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('contacts')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'contact.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Contact Tags
async function handleContactTags(req, ctx, contactId) {
  const method = req.method;

  // Verify contact ownership
  const { data: contact } = await ctx.supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!contact) {
    return new Response(JSON.stringify({ error: 'Contact not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('contact_tags')
      .select('*, tags(*)')
      .eq('contact_id', contactId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tags = data.map(ct => ct.tags).filter(Boolean);

    return new Response(JSON.stringify(formatResponse(tags)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    const body = await req.json();
    const { tag_id } = body;

    if (!tag_id) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('contact_tags')
      .insert({ contact_id: contactId, tag_id })
      .select('*, tags(*)')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(formatResponse(data.tags)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE') {
    const url = new URL(req.url);
    const tagId = url.searchParams.get('tag_id');

    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await ctx.supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Products
async function handleProducts(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('products')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      let query = ctx.supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('products')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'product.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('products')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'product.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('products')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'product.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Appointments
async function handleAppointments(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      let query = ctx.supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('appointments')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'appointment.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('appointments')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'appointment.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('appointments')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'appointment.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Tasks
async function handleTasks(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      let query = ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('tasks')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'task.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('tasks')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'task.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('tasks')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'task.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Pipelines
async function handlePipelines(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      let query = ctx.supabase
        .from('pipelines')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('pipelines')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'pipeline.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('pipelines')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'pipeline.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('pipelines')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'pipeline.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Stages
async function handleStages(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('stages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: pipeline } = await ctx.supabase
        .from('pipelines')
        .select('tenant_id')
        .eq('id', data.pipeline_id)
        .single();

      if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      const pipelineId = url.searchParams.get('pipeline_id');
      if (pipelineId) {
        const { data: pipeline } = await ctx.supabase
          .from('pipelines')
          .select('id')
          .eq('id', pipelineId)
          .eq('tenant_id', ctx.tenantId)
          .single();

        if (!pipeline) {
          return new Response(JSON.stringify({ error: 'Pipeline not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      let query = ctx.supabase
        .from('stages')
        .select('*', { count: 'exact' })
        .order('order_index', { ascending: true })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('id')
      .eq('id', body.pipeline_id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (!pipeline) {
      return new Response(JSON.stringify({ error: 'Pipeline not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('stages')
      .insert(body)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'stage.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();

    const { data: existingStage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', id)
      .single();

    if (!existingStage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', existingStage.pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('stages')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'stage.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { data: existingStage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', id)
      .single();

    if (!existingStage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', existingStage.pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await ctx.supabase
      .from('stages')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'stage.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Cards
async function handleCards(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  // Check for nested routes
  if (id && path[2] === 'tags') {
    return handleCardTags(req, ctx, id);
  }

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('cards')
        .select('*, card_tags(tag_id, tags(*))')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(formatTags(data, 'card_tags'))), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);
      const tagFilter = url.searchParams.get('tag');

      let query;
      
      if (tagFilter) {
        // Filter by tag name
        const { data: tagData } = await ctx.supabase
          .from('tags')
          .select('id')
          .eq('tenant_id', ctx.tenantId)
          .ilike('name', tagFilter)
          .single();

        if (!tagData) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get cards with this tag
        const { data: cardTagsData } = await ctx.supabase
          .from('card_tags')
          .select('card_id')
          .eq('tag_id', tagData.id);

        const cardIds = cardTagsData?.map(ct => ct.card_id) || [];

        if (cardIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        query = ctx.supabase
          .from('cards')
          .select('*, card_tags(tag_id, tags(*))', { count: 'exact' })
          .eq('tenant_id', ctx.tenantId)
          .in('id', cardIds)
          .order('position', { ascending: true })
          .limit(pagination.limit);
      } else {
        query = ctx.supabase
          .from('cards')
          .select('*, card_tags(tag_id, tags(*))', { count: 'exact' })
          .eq('tenant_id', ctx.tenantId)
          .order('position', { ascending: true })
          .limit(pagination.limit);
      }

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const formattedData = data.map(item => formatTags(item, 'card_tags'));
      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(formattedData, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('id')
      .eq('id', body.pipeline_id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (!pipeline) {
      return new Response(JSON.stringify({ error: 'Pipeline not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('cards')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'card.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('cards')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'card.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('cards')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'card.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Card Tags
async function handleCardTags(req, ctx, cardId) {
  const method = req.method;

  // Verify card ownership
  const { data: card } = await ctx.supabase
    .from('cards')
    .select('id')
    .eq('id', cardId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('card_tags')
      .select('*, tags(*)')
      .eq('card_id', cardId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tags = data.map(ct => ct.tags).filter(Boolean);

    return new Response(JSON.stringify(formatResponse(tags)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    const body = await req.json();
    const { tag_id } = body;

    if (!tag_id) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('card_tags')
      .insert({ card_id: cardId, tag_id })
      .select('*, tags(*)')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(formatResponse(data.tags)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE') {
    const url = new URL(req.url);
    const tagId = url.searchParams.get('tag_id');

    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await ctx.supabase
      .from('card_tags')
      .delete()
      .eq('card_id', cardId)
      .eq('tag_id', tagId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handler for Tags
async function handleTags(req, ctx, path) {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('tags')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);

      let query = ctx.supabase
        .from('tags')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('name', { ascending: true })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.lt('created_at', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].created_at : null;

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: nextCursor
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('tags')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'tag.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('tags')
      .update(body)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'tag.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('tags')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'tag.deleted', { id });

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const ctx = await authenticate(req, supabase);
    if (!ctx) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const apiIndex = segments.indexOf('api-v1');
    const path = apiIndex >= 0 ? segments.slice(apiIndex + 1) : segments;

    if (!path[0]) {
      return new Response(JSON.stringify({ error: 'Resource not specified' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resource = path[0];
    let response;

    switch (resource) {
      case 'contacts':
        response = await handleContacts(req, ctx, path);
        break;
      case 'products':
        response = await handleProducts(req, ctx, path);
        break;
      case 'appointments':
        response = await handleAppointments(req, ctx, path);
        break;
      case 'tasks':
        response = await handleTasks(req, ctx, path);
        break;
      case 'pipelines':
        response = await handlePipelines(req, ctx, path);
        break;
      case 'stages':
        response = await handleStages(req, ctx, path);
        break;
      case 'cards':
        response = await handleCards(req, ctx, path);
        break;
      case 'tags':
        response = await handleTags(req, ctx, path);
        break;
      default:
        response = new Response(JSON.stringify({ error: 'Resource not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const responseTime = Date.now() - startTime;
    await supabase.from('api_logs').insert({
      tenant_id: ctx.tenantId,
      api_key_id: ctx.apiKeyId,
      method: req.method,
      path: url.pathname,
      status_code: response.status,
      response_time_ms: responseTime,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return response;
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', message: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
