import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============= TypeScript Interfaces =============

interface AuthContext {
  tenantId: string;
  apiKeyId: string;
  supabase: SupabaseClient;
}

interface Pagination {
  limit: number;
  cursor?: string;
}

interface PaginationMeta {
  total: number | null;
  limit: number;
  next_cursor: string | null;
}

interface ApiResponse {
  data: unknown;
  meta: {
    timestamp: string;
    pagination?: PaginationMeta;
  };
  links?: Record<string, string>;
}

interface Filters {
  [key: string]: string;
}

// ============= CORS Headers =============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

// ============= Helper Functions =============

async function authenticate(req: Request, supabase: SupabaseClient): Promise<AuthContext | null> {
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

function parsePagination(url: URL): Pagination {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const cursor = url.searchParams.get('cursor') || undefined;
  return { limit, cursor };
}

function parseFilters(url: URL): Filters {
  const filters: Filters = {};
  const params = url.searchParams;
  
  for (const [key, value] of params.entries()) {
    if (!['limit', 'cursor', 'include', 'tag', 'category', 'category_name', 'assigned_to', 'created_by'].includes(key)) {
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

// deno-lint-ignore no-explicit-any
function applyFilters(query: any, filters: Filters): any {
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

// deno-lint-ignore no-explicit-any
function formatTags(item: any, tagRelationKey: string): any {
  if (!item[tagRelationKey]) return item;
  
  const tags = item[tagRelationKey]
    .map((ct: any) => ct.tags)
    .filter(Boolean);
  
  const { [tagRelationKey]: _, ...rest } = item;
  return { ...rest, tags };
}

// deno-lint-ignore no-explicit-any
function formatProductCategories(product: any): any {
  if (!product?.product_categories) return product;
  
  const categories = product.product_categories
    .map((pc: any) => pc.categories)
    .filter(Boolean);
  
  const { product_categories: _, ...rest } = product;
  return { ...rest, categories };
}

async function triggerWebhooks(supabase: SupabaseClient, tenantId: string, eventType: string, payload: unknown): Promise<void> {
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

function formatResponse(data: unknown, pagination?: PaginationMeta | null, links?: Record<string, string> | null): ApiResponse {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination })
    },
    ...(links && { links })
  };
}

// ============= CRUD Handlers for Contacts =============

async function handleContacts(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

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

      // deno-lint-ignore no-explicit-any
      const formattedData = data.map((item: any) => formatTags(item, 'contact_tags'));
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

async function handleContactTags(req: Request, ctx: AuthContext, contactId: string): Promise<Response> {
  const method = req.method;

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

// ============= CRUD Handlers for Products (COM CATEGORIAS) =============

async function handleProducts(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('products')
        .select('*, product_categories(category_id, categories(*))')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(formatProductCategories(data))), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);
      const categoryFilter = url.searchParams.get('category');
      const categoryNameFilter = url.searchParams.get('category_name');

      let query;
      
      if (categoryFilter || categoryNameFilter) {
        let categoryId = categoryFilter;
        
        if (categoryNameFilter && !categoryId) {
          const { data: categoryData } = await ctx.supabase
            .from('categories')
            .select('id')
            .eq('tenant_id', ctx.tenantId)
            .ilike('name', categoryNameFilter)
            .single();

          if (!categoryData) {
            return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          categoryId = categoryData.id;
        }

        const { data: productCategoriesData } = await ctx.supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', categoryId);

        const productIds = productCategoriesData?.map(pc => pc.product_id) || [];

        if (productIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        query = ctx.supabase
          .from('products')
          .select('*, product_categories(category_id, categories(*))', { count: 'exact' })
          .eq('tenant_id', ctx.tenantId)
          .in('id', productIds)
          .order('created_at', { ascending: false })
          .limit(pagination.limit);
      } else {
        query = ctx.supabase
          .from('products')
          .select('*, product_categories(category_id, categories(*))', { count: 'exact' })
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

      // deno-lint-ignore no-explicit-any
      const formattedData = data.map((item: any) => formatProductCategories(item));
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
    const { category_ids, ...productData } = body;
    
    const { data, error } = await ctx.supabase
      .from('products')
      .insert({ ...productData, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const productCategories = category_ids.map(categoryId => ({
        product_id: data.id,
        category_id: categoryId
      }));

      await ctx.supabase
        .from('product_categories')
        .insert(productCategories);
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'product.created', data);

    const { data: productWithCategories } = await ctx.supabase
      .from('products')
      .select('*, product_categories(category_id, categories(*))')
      .eq('id', data.id)
      .single();

    return new Response(JSON.stringify(formatResponse(formatProductCategories(productWithCategories))), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { category_ids, ...productData } = body;
    
    const { data, error } = await ctx.supabase
      .from('products')
      .update(productData)
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

    if (category_ids && Array.isArray(category_ids)) {
      await ctx.supabase
        .from('product_categories')
        .delete()
        .eq('product_id', id);

      if (category_ids.length > 0) {
        const productCategories = category_ids.map(categoryId => ({
          product_id: id,
          category_id: categoryId
        }));

        await ctx.supabase
          .from('product_categories')
          .insert(productCategories);
      }
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'product.updated', data);

    const { data: productWithCategories } = await ctx.supabase
      .from('products')
      .select('*, product_categories(category_id, categories(*))')
      .eq('id', id)
      .single();

    return new Response(JSON.stringify(formatResponse(formatProductCategories(productWithCategories))), {
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

// ============= CRUD Handlers for Appointments (COM OWNER_ID) =============

async function handleAppointments(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
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
        .order('start_time', { ascending: true })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.gt('start_time', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].start_time : null;

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

// ============= CRUD Handlers for Tasks (COM OWNER_ID) =============

async function handleTasks(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
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
      const assignedToFilter = url.searchParams.get('assigned_to');

      let query = ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(pagination.limit);

      if (assignedToFilter) {
        query = query.eq('assigned_to', assignedToFilter);
      }

      query = applyFilters(query, filters);

      if (pagination.cursor) {
        query = query.gt('due_date', pagination.cursor);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextCursor = data.length === pagination.limit ? data[data.length - 1].due_date : null;

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

// ============= CRUD Handlers for Pipelines =============

async function handlePipelines(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (id && path[2] === 'stages') {
    return handlePipelineStages(req, ctx, id);
  }

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('pipelines')
        .select('*, stages(*)')
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
        .select('*, stages(*)', { count: 'exact' })
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

async function handlePipelineStages(req: Request, ctx: AuthContext, pipelineId: string): Promise<Response> {
  const method = req.method;

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

  if (method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('order', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ============= CRUD Handlers for Stages =============

async function handleStages(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
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
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
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

      if (!pipelineId) {
        return new Response(JSON.stringify({ error: 'pipeline_id query parameter is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: pipeline } = await ctx.supabase
        .from('pipelines')
        .select('tenant_id')
        .eq('id', pipelineId)
        .single();

      if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let query = ctx.supabase
        .from('stages')
        .select('*', { count: 'exact' })
        .eq('pipeline_id', pipelineId)
        .order('order', { ascending: true })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: null
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { pipeline_id } = body;

    if (!pipeline_id) {
      return new Response(JSON.stringify({ error: 'pipeline_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
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
    
    const { data: stage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', id)
      .single();

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', stage.pipeline_id)
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
    const { data: stage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', id)
      .single();

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', stage.pipeline_id)
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

// ============= CRUD Handlers for Cards (COM OWNER_ID) =============

async function handleCards(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (id && path[2] === 'tags') {
    return handleCardTags(req, ctx, id);
  }

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('cards')
        .select('*, card_tags(tag_id, tags(*))')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: stage } = await ctx.supabase
        .from('stages')
        .select('pipeline_id')
        .eq('id', data.stage_id)
        .single();

      if (!stage) {
        return new Response(JSON.stringify({ error: 'Stage not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: pipeline } = await ctx.supabase
        .from('pipelines')
        .select('tenant_id')
        .eq('id', stage.pipeline_id)
        .single();

      if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(formatTags(data, 'card_tags'))), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const pagination = parsePagination(url);
      const filters = parseFilters(url);
      const stageId = url.searchParams.get('stage_id');
      const pipelineId = url.searchParams.get('pipeline_id');
      const tagFilter = url.searchParams.get('tag');
      const createdByFilter = url.searchParams.get('created_by');

      let stageIds: string[] = [];

      if (stageId) {
        stageIds = [stageId];
        
        const { data: stage } = await ctx.supabase
          .from('stages')
          .select('pipeline_id')
          .eq('id', stageId)
          .single();

        if (!stage) {
          return new Response(JSON.stringify({ error: 'Stage not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: pipeline } = await ctx.supabase
          .from('pipelines')
          .select('tenant_id')
          .eq('id', stage.pipeline_id)
          .single();

        if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
          return new Response(JSON.stringify({ error: 'Not authorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else if (pipelineId) {
        const { data: pipeline } = await ctx.supabase
          .from('pipelines')
          .select('tenant_id')
          .eq('id', pipelineId)
          .single();

        if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
          return new Response(JSON.stringify({ error: 'Not authorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: stages } = await ctx.supabase
          .from('stages')
          .select('id')
          .eq('pipeline_id', pipelineId);

        stageIds = stages?.map(s => s.id) || [];

        if (stageIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Nenhum filtro fornecido - buscar todos os cards do tenant
        const { data: pipelines } = await ctx.supabase
          .from('pipelines')
          .select('id')
          .eq('tenant_id', ctx.tenantId);

        const pipelineIds = pipelines?.map(p => p.id) || [];

        if (pipelineIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: stages } = await ctx.supabase
          .from('stages')
          .select('id')
          .in('pipeline_id', pipelineIds);

        stageIds = stages?.map(s => s.id) || [];

        if (stageIds.length === 0) {
          return new Response(JSON.stringify(formatResponse([], { total: 0, limit: pagination.limit, next_cursor: null })), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      let query;
      
      if (tagFilter) {
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
          .in('stage_id', stageIds)
          .in('id', cardIds)
          .order('position', { ascending: true })
          .limit(pagination.limit);
      } else {
        query = ctx.supabase
          .from('cards')
          .select('*, card_tags(tag_id, tags(*))', { count: 'exact' })
          .in('stage_id', stageIds)
          .order('position', { ascending: true })
          .limit(pagination.limit);
      }

      if (createdByFilter) {
        query = query.eq('created_by', createdByFilter);
      }

      query = applyFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // deno-lint-ignore no-explicit-any
      const formattedData = data.map((item: any) => formatTags(item, 'card_tags'));

      return new Response(JSON.stringify(formatResponse(formattedData, {
        total: count,
        limit: pagination.limit,
        next_cursor: null
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { stage_id } = body;

    if (!stage_id) {
      return new Response(JSON.stringify({ error: 'stage_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: stage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', stage_id)
      .single();

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', stage.pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
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
    
    const { data: card } = await ctx.supabase
      .from('cards')
      .select('stage_id')
      .eq('id', id)
      .single();

    if (!card) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: stage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', card.stage_id)
      .single();

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', stage.pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await ctx.supabase
      .from('cards')
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

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'card.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { data: card } = await ctx.supabase
      .from('cards')
      .select('stage_id')
      .eq('id', id)
      .single();

    if (!card) {
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: stage } = await ctx.supabase
      .from('stages')
      .select('pipeline_id')
      .eq('id', card.stage_id)
      .single();

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: pipeline } = await ctx.supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', stage.pipeline_id)
      .single();

    if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await ctx.supabase
      .from('cards')
      .delete()
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

async function handleCardTags(req: Request, ctx: AuthContext, cardId: string): Promise<Response> {
  const method = req.method;

  const { data: card } = await ctx.supabase
    .from('cards')
    .select('stage_id')
    .eq('id', cardId)
    .single();

  if (!card) {
    return new Response(JSON.stringify({ error: 'Card not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: stage } = await ctx.supabase
    .from('stages')
    .select('pipeline_id')
    .eq('id', card.stage_id)
    .single();

  if (!stage) {
    return new Response(JSON.stringify({ error: 'Stage not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: pipeline } = await ctx.supabase
    .from('pipelines')
    .select('tenant_id')
    .eq('id', stage.pipeline_id)
    .single();

  if (!pipeline || pipeline.tenant_id !== ctx.tenantId) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 403,
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

// ============= CRUD Handlers for Tags =============

async function handleTags(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
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

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: null
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

// ============= NOVO: CRUD Handlers for Categories =============

async function handleCategories(req: Request, ctx: AuthContext, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const id = path[1];

  if (method === 'GET') {
    if (id) {
      const { data, error } = await ctx.supabase
        .from('categories')
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
        .from('categories')
        .select('*', { count: 'exact' })
        .eq('tenant_id', ctx.tenantId)
        .order('name', { ascending: true })
        .limit(pagination.limit);

      query = applyFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(formatResponse(data, {
        total: count,
        limit: pagination.limit,
        next_cursor: null
      })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('categories')
      .insert({ ...body, tenant_id: ctx.tenantId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'category.created', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const body = await req.json();
    const { data, error } = await ctx.supabase
      .from('categories')
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

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'category.updated', data);

    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'DELETE' && id) {
    const { error } = await ctx.supabase
      .from('categories')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await triggerWebhooks(ctx.supabase, ctx.tenantId, 'category.deleted', { id });

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

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ctx = await authenticate(req, supabase);

    if (!ctx) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Ex.: /functions/v1/api-v1/contacts ou /functions/v1/api-v1/v1/contacts
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

    // Encontrar o índice da própria função (api-v1) e pegar só o que vem depois
    const apiIndex = segments.findIndex((s) => s === 'api-v1');
    const apiPathSegments = apiIndex >= 0 ? segments.slice(apiIndex + 1) : segments;

    // Suportar opcionalmente prefixo /v1
    const path = apiPathSegments[0] === 'v1' ? apiPathSegments.slice(1) : apiPathSegments;
    const resource = path[0];

    console.log('API Request', { pathname: url.pathname, segments, path, resource });

    let response: Response;

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
      case 'categories':
        response = await handleCategories(req, ctx, path);
        break;
      default:
        response = new Response(JSON.stringify({ error: 'Resource not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return response;

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
