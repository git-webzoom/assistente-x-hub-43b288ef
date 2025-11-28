import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useApiConfig() {
  const queryClient = useQueryClient();

  const { data: apiBaseUrl, isLoading } = useQuery({
    queryKey: ['api-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'API_BASE_URL')
        .maybeSingle();

      if (error) {
        console.error('Error fetching API_BASE_URL:', error);
        return import.meta.env.VITE_SUPABASE_URL;
      }

      return data?.value || import.meta.env.VITE_SUPABASE_URL;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  const invalidateApiConfig = () => {
    queryClient.invalidateQueries({ queryKey: ['api-config'] });
  };

  return {
    apiBaseUrl: apiBaseUrl || import.meta.env.VITE_SUPABASE_URL,
    isLoading,
    invalidateApiConfig,
  };
}

// Helper function para usar fora de componentes React
export async function getApiBaseUrl(): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'API_BASE_URL')
      .maybeSingle();

    return data?.value || import.meta.env.VITE_SUPABASE_URL;
  } catch (error) {
    console.error('Error fetching API_BASE_URL:', error);
    return import.meta.env.VITE_SUPABASE_URL;
  }
}
