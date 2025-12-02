import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import { useMemo, useState, useEffect } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'contact' | 'card' | 'task' | 'product';
  path: string;
}

export const useGlobalSearch = (query: string) => {
  const { currentUser } = useCurrentUser();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce de 300ms para evitar requisições excessivas
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['global-search', currentUser?.tenant_id, debouncedQuery],
    queryFn: async () => {
      if (!currentUser?.tenant_id || !debouncedQuery) return [];

      const tenantId = currentUser.tenant_id;
      const searchPattern = `%${debouncedQuery}%`;

      console.log('[GlobalSearch] Buscando:', { tenantId, debouncedQuery, searchPattern });

      // Buscar contatos por nome
      const contactsByName = supabase
        .from('contacts')
        .select('id, name, email, company')
        .eq('tenant_id', tenantId)
        .ilike('name', searchPattern)
        .limit(5);

      // Buscar contatos por email
      const contactsByEmail = supabase
        .from('contacts')
        .select('id, name, email, company')
        .eq('tenant_id', tenantId)
        .ilike('email', searchPattern)
        .limit(5);

      // Buscar cards por título
      const cardsByTitle = supabase
        .from('cards')
        .select('id, title, description')
        .eq('tenant_id', tenantId)
        .ilike('title', searchPattern)
        .limit(5);

      // Buscar tasks por título
      const tasksByTitle = supabase
        .from('tasks')
        .select('id, title, description')
        .eq('tenant_id', tenantId)
        .ilike('title', searchPattern)
        .limit(5);

      // Buscar produtos por nome
      const productsByName = supabase
        .from('products')
        .select('id, name, description, sku')
        .eq('tenant_id', tenantId)
        .ilike('name', searchPattern)
        .limit(5);

      // Buscar produtos por SKU
      const productsBySku = supabase
        .from('products')
        .select('id, name, description, sku')
        .eq('tenant_id', tenantId)
        .ilike('sku', searchPattern)
        .limit(5);

      // Executar todas as queries em paralelo
      const [
        contactsNameRes,
        contactsEmailRes,
        cardsRes,
        tasksRes,
        productsNameRes,
        productsSkuRes,
      ] = await Promise.all([
        contactsByName,
        contactsByEmail,
        cardsByTitle,
        tasksByTitle,
        productsByName,
        productsBySku,
      ]);

      console.log('[GlobalSearch] Resultados:', {
        contactsByName: contactsNameRes.data?.length || 0,
        contactsNameError: contactsNameRes.error,
        contactsByEmail: contactsEmailRes.data?.length || 0,
        contactsEmailError: contactsEmailRes.error,
        cards: cardsRes.data?.length || 0,
        cardsError: cardsRes.error,
        tasks: tasksRes.data?.length || 0,
        tasksError: tasksRes.error,
        productsByName: productsNameRes.data?.length || 0,
        productsNameError: productsNameRes.error,
        productsBySku: productsSkuRes.data?.length || 0,
        productsSkuError: productsSkuRes.error,
      });

      // Combinar e remover duplicatas
      const contactsMap = new Map();
      [...(contactsNameRes.data || []), ...(contactsEmailRes.data || [])].forEach((c) => {
        if (!contactsMap.has(c.id)) {
          contactsMap.set(c.id, c);
        }
      });

      const productsMap = new Map();
      [...(productsNameRes.data || []), ...(productsSkuRes.data || [])].forEach((p) => {
        if (!productsMap.has(p.id)) {
          productsMap.set(p.id, p);
        }
      });

      const results: SearchResult[] = [];

      // Mapear contatos
      contactsMap.forEach((c) => {
        results.push({
          id: c.id,
          title: c.name || c.email,
          subtitle: c.company || c.email,
          type: 'contact',
          path: '/dashboard/contacts',
        });
      });

      // Mapear cards
      (cardsRes.data || []).forEach((c) => {
        results.push({
          id: c.id,
          title: c.title,
          subtitle: c.description,
          type: 'card',
          path: '/dashboard/pipelines',
        });
      });

      // Mapear tarefas
      (tasksRes.data || []).forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: t.description,
          type: 'task',
          path: '/dashboard/tasks',
        });
      });

      // Mapear produtos
      productsMap.forEach((p) => {
        results.push({
          id: p.id,
          title: p.name,
          subtitle: p.description || p.sku,
          type: 'product',
          path: '/dashboard/products',
        });
      });

      return results;
    },
    enabled: !!currentUser?.tenant_id && debouncedQuery.length > 0,
    staleTime: 30 * 1000,
  });

  const groupedResults = useMemo(() => {
    if (!results) return {};

    return results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);
  }, [results]);

  return {
    results: results || [],
    groupedResults,
    isLoading: isLoading || isFetching,
    isDebouncing: query.trim() !== debouncedQuery,
  };
};
