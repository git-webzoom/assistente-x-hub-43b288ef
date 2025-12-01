import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import { useMemo } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'contact' | 'card' | 'task' | 'product';
  path: string;
}

export const useGlobalSearch = (query: string) => {
  const { currentUser } = useCurrentUser();

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', currentUser?.tenant_id, query],
    queryFn: async () => {
      if (!currentUser?.tenant_id || !query.trim()) return [];

      const searchTerm = `%${query}%`;
      const results: SearchResult[] = [];

      // Buscar em Contatos
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, company')
        .eq('tenant_id', currentUser.tenant_id)
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
        .limit(5);

      if (contacts) {
        results.push(
          ...contacts.map((c) => ({
            id: c.id,
            title: c.name || c.email,
            subtitle: c.company || c.email,
            type: 'contact' as const,
            path: `/dashboard/contacts`,
          }))
        );
      }

      // Buscar em Cards
      const { data: cards } = await supabase
        .from('cards')
        .select('id, title, description')
        .eq('tenant_id', currentUser.tenant_id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5);

      if (cards) {
        results.push(
          ...cards.map((c) => ({
            id: c.id,
            title: c.title,
            subtitle: c.description,
            type: 'card' as const,
            path: `/dashboard/pipelines`,
          }))
        );
      }

      // Buscar em Tarefas
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description')
        .eq('tenant_id', currentUser.tenant_id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5);

      if (tasks) {
        results.push(
          ...tasks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.description,
            type: 'task' as const,
            path: `/dashboard/tasks`,
          }))
        );
      }

      // Buscar em Produtos
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description, sku')
        .eq('tenant_id', currentUser.tenant_id)
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},sku.ilike.${searchTerm}`)
        .limit(5);

      if (products) {
        results.push(
          ...products.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.description || p.sku,
            type: 'product' as const,
            path: `/dashboard/products`,
          }))
        );
      }

      return results;
    },
    enabled: !!currentUser?.tenant_id && query.trim().length > 0,
    staleTime: 30 * 1000, // 30 segundos
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
    isLoading,
  };
};
