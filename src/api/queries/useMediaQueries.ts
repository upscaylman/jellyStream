// Queries TanStack pour les films et médias Jellyfin
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { BaseItemKind, SortOrder, ItemSortBy, ItemFields } from '@jellyfin/sdk/lib/generated-client/models';
import { useAuthStore } from '@/src/stores/authStore';

// Hook utilitaire : récupère api + userId depuis le store
function useJellyfinApi() {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  return { api, userId: userId ?? undefined };
}

// Films récents
export function useLatestMovies(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['movies', 'latest', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.People, ItemFields.Genres, ItemFields.DateCreated, ItemFields.DateLastMediaAdded, ItemFields.ChildCount],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Séries récentes
export function useLatestSeries(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['series', 'latest', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Series],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.People, ItemFields.Genres, ItemFields.DateCreated, ItemFields.DateLastMediaAdded, ItemFields.ChildCount],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Continue Watching (reprendre la lecture)
export function useResumeItems(limit = 12) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['resume', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getResumeItems({
        userId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Ajoutés récemment (tous types)
export function useRecentlyAdded(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['recent', limit],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getLatestMedia({
        userId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Tendances (les plus joués)
export function useTrending(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.PlayCount],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.Genres, ItemFields.DateCreated, ItemFields.DateLastMediaAdded, ItemFields.ChildCount],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Recherche
export function useSearchItems(searchTerm: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        searchTerm,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        recursive: true,
        limit: 30,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId && searchTerm.length >= 2,
  });
}

// Genres disponibles
export function useGenres() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        recursive: true,
        sortBy: [ItemSortBy.SortName],
        sortOrder: [SortOrder.Ascending],
      });
      // Extraire les genres uniques depuis les items
      const genreSet = new Set<string>();
      for (const item of result.data.Items ?? []) {
        for (const genre of item.Genres ?? []) {
          genreSet.add(genre);
        }
      }
      return Array.from(genreSet).sort();
    },
    enabled: !!api && !!userId,
    staleTime: 30 * 60 * 1000, // 30 min
  });
}

// Items par genre
export function useItemsByGenre(genre: string, limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['genre', genre, limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        genres: [genre],
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.Random],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId && genre.length > 0,
  });
}

// Détail d'un item (film, série, épisode)
export function useItemDetail(itemId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getItem({
        userId: userId!,
        itemId,
      });
      return result.data;
    },
    enabled: !!api && !!userId && !!itemId,
  });
}

// Items similaires
export function useSimilarItems(itemId: string, limit = 12) {
  const { api } = useJellyfinApi();

  return useQuery({
    queryKey: ['similar', itemId, limit],
    queryFn: async () => {
      const libApi = getLibraryApi(api!);
      const result = await libApi.getSimilarItems({
        itemId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!itemId,
  });
}

// Items favoris / Ma Liste
export function useFavoriteItems(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['favorites', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        isFavorite: true,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Ajouts récents (pour écran "New & Hot")
export function useNewlyAdded(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ['newly-added', limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [ItemFields.Overview, ItemFields.Genres, ItemFields.People, ItemFields.DateCreated, ItemFields.DateLastMediaAdded, ItemFields.ChildCount],
        imageTypeLimit: 1,
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}
