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

      const searchTerm = `*${debouncedQuery}*`;
      const tenantId = currentUser.tenant_id;

      console.log('[GlobalSearch] Buscando:', { tenantId, debouncedQuery, searchTerm });

      // Executar todas as queries em paralelo
      const [contactsRes, cardsRes, tasksRes, productsRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, name, email, company')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
          .limit(5),

        supabase
          .from('cards')
          .select('id, title, description')
          .eq('tenant_id', tenantId)
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5),

        supabase
          .from('tasks')
          .select('id, title, description')
          .eq('tenant_id', tenantId)
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5),

        supabase
          .from('products')
          .select('id, name, description, sku')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},sku.ilike.${searchTerm}`)
          .limit(5),
      ]);

      console.log('[GlobalSearch] Resultados:', {
        contacts: contactsRes.data?.length || 0,
        contactsError: contactsRes.error,
        cards: cardsRes.data?.length || 0,
        cardsError: cardsRes.error,
        tasks: tasksRes.data?.length || 0,
        tasksError: tasksRes.error,
        products: productsRes.data?.length || 0,
        productsError: productsRes.error,
      });

      const contactsResult = contactsRes.data || [];
      const cardsResult = cardsRes.data || [];
      const tasksResult = tasksRes.data || [];
      const productsResult = productsRes.data || [];

      const results: SearchResult[] = [];

      // Mapear contatos
      contactsResult.forEach((c) => {
        results.push({
          id: c.id,
          title: c.name || c.email,
          subtitle: c.company || c.email,
          type: 'contact',
          path: '/dashboard/contacts',
        });
      });

      // Mapear cards
      cardsResult.forEach((c) => {
        results.push({
          id: c.id,
          title: c.title,
          subtitle: c.description,
          type: 'card',
          path: '/dashboard/pipelines',
        });
      });

      // Mapear tarefas
      tasksResult.forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: t.description,
          type: 'task',
          path: '/dashboard/tasks',
        });
      });

      // Mapear produtos
      productsResult.forEach((p) => {
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
