// Provider TanStack Query — wraps l'app pour le cache serveur
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min avant refetch
      gcTime: 30 * 60 * 1000, // 30 min en cache
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Empêche le re-fetch au unfreeze des tabs (react-freeze)
    },
  },
});

export function JellyQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
