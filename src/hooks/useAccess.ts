import { useQuery } from '@tanstack/react-query';

export function useAccess(userId: string, tabla: string, campo: string, valor: string) {
  const query = useQuery({
    queryKey: ['access', userId, tabla, campo, valor],
    queryFn: () =>
      fetch(`/api/access/check?userId=${userId}&tabla=${tabla}&campo=${campo}&valor=${valor}`)
        .then(res => res.json()),
    staleTime: 5 * 60 * 1000,
    retry: 0
  });

  return {
    hasAccess: query.data?.hasAccess || false,
    isLoading: query.isLoading,
    error: query.error
  };
}