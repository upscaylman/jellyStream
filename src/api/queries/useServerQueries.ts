// Queries TanStack pour les données serveur Jellyfin (utilisateurs, sessions, infos système)
import { useAuthStore } from "@/src/stores/authStore";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { useQuery } from "@tanstack/react-query";

function useJellyfinApi() {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  return { api, userId: userId ?? undefined };
}

// Tous les utilisateurs du serveur (nécessite authentification)
export function usePublicUsers() {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ["server", "publicUsers"],
    queryFn: async () => {
      const userApi = getUserApi(api!);
      // Essayer getUsers (tous les users, nécessite admin) puis fallback getPublicUsers
      try {
        const result = await userApi.getUsers();
        return result.data ?? [];
      } catch {
        const result = await userApi.getPublicUsers();
        return result.data ?? [];
      }
    },
    enabled: !!api,
    staleTime: 5 * 60 * 1000,
  });
}

// Infos système complètes (version, OS, transcodage, etc.)
export function useSystemInfo() {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ["server", "systemInfo"],
    queryFn: async () => {
      const sysApi = getSystemApi(api!);
      const result = await sysApi.getSystemInfo();
      return result.data;
    },
    enabled: !!api,
    staleTime: 10 * 60 * 1000,
  });
}

// Infos système publiques (pas besoin d'admin)
export function usePublicSystemInfo() {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ["server", "publicSystemInfo"],
    queryFn: async () => {
      const sysApi = getSystemApi(api!);
      const result = await sysApi.getPublicSystemInfo();
      return result.data;
    },
    enabled: !!api,
    staleTime: 10 * 60 * 1000,
  });
}

// Sessions actives sur le serveur (qui regarde quoi)
export function useActiveSessions() {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ["server", "sessions"],
    queryFn: async () => {
      const sessionApi = getSessionApi(api!);
      const result = await sessionApi.getSessions();
      return result.data ?? [];
    },
    enabled: !!api,
    refetchInterval: 30 * 1000, // Refresh toutes les 30s
    staleTime: 15 * 1000,
  });
}

// Utilisateur courant avec config complète
export function useCurrentUser() {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ["server", "currentUser"],
    queryFn: async () => {
      const userApi = getUserApi(api!);
      const result = await userApi.getCurrentUser();
      return result.data;
    },
    enabled: !!api,
    staleTime: 5 * 60 * 1000,
  });
}
