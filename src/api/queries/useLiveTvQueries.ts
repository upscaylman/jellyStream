// Queries TanStack pour la TV en direct Jellyfin
import { useAuthStore } from "@/src/stores/authStore";
import {
  BaseItemDto,
  ItemFields,
  ItemSortBy,
  SortOrder,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getLiveTvApi } from "@jellyfin/sdk/lib/utils/api/live-tv-api";
import { useQuery } from "@tanstack/react-query";

// Hook utilitaire : récupère api + userId depuis le store
function useJellyfinApi() {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  return { api, userId: userId ?? undefined };
}

// Chaînes TV en direct avec programme en cours
export function useLiveTvChannels() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["liveTv", "channels"],
    queryFn: async () => {
      const liveTvApi = getLiveTvApi(api!);
      const result = await liveTvApi.getLiveTvChannels({
        userId,
        addCurrentProgram: true,
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb"],
        enableFavoriteSorting: true,
        fields: [ItemFields.Overview],
        sortBy: [ItemSortBy.SortName],
        sortOrder: SortOrder.Ascending,
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    refetchInterval: 60_000, // Rafraîchir toutes les 60s pour le programme en cours
  });
}

// Chaînes favorites uniquement
export function useFavoriteChannels() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["liveTv", "channels", "favorites"],
    queryFn: async () => {
      const liveTvApi = getLiveTvApi(api!);
      const result = await liveTvApi.getLiveTvChannels({
        userId,
        isFavorite: true,
        addCurrentProgram: true,
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb"],
        fields: [ItemFields.Overview],
        sortBy: [ItemSortBy.SortName],
        sortOrder: SortOrder.Ascending,
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    refetchInterval: 60_000,
  });
}

// Programmes en cours de diffusion
export function useCurrentPrograms() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["liveTv", "programs", "current"],
    queryFn: async () => {
      const liveTvApi = getLiveTvApi(api!);
      const result = await liveTvApi.getRecommendedPrograms({
        userId,
        isAiring: true,
        limit: 30,
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb"],
        fields: [ItemFields.Overview],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    refetchInterval: 60_000,
  });
}

// Programme guide — à venir
export function useUpcomingPrograms() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["liveTv", "programs", "upcoming"],
    queryFn: async () => {
      const liveTvApi = getLiveTvApi(api!);
      const result = await liveTvApi.getRecommendedPrograms({
        userId,
        isAiring: false,
        hasAired: false,
        limit: 30,
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb"],
        fields: [ItemFields.Overview],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    refetchInterval: 5 * 60_000, // Rafraîchir toutes les 5min
  });
}

// Extraire les groupes de chaînes (par préfixe de nom ou groupe Jellyfin)
export function groupChannelsByCategory(
  channels: BaseItemDto[],
): Record<string, BaseItemDto[]> {
  const groups: Record<string, BaseItemDto[]> = {};
  for (const channel of channels) {
    // Utiliser ChannelType ou un fallback "Toutes les chaînes"
    const groupName = channel.ChannelType ?? "Toutes les chaînes";
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(channel);
  }
  return groups;
}
