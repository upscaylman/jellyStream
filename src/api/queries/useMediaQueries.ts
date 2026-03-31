// Queries TanStack pour les films et médias Jellyfin
import { useAuthStore } from "@/src/stores/authStore";
import {
  BaseItemKind,
  ItemFields,
  ItemSortBy,
  SortOrder,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api/tv-shows-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    queryKey: ["movies", "latest", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.People,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
          ItemFields.ChildCount,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb", "Logo"],
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
    queryKey: ["series", "latest", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Series],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.People,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
          ItemFields.ChildCount,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
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
    queryKey: ["resume", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getResumeItems({
        userId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb", "Logo"],
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
    queryKey: ["recent", limit],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getLatestMedia({
        userId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
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
    queryKey: ["trending", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.PlayCount],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
          ItemFields.ChildCount,
          ItemFields.RemoteTrailers,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
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
    queryKey: ["search", searchTerm],
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
        enableImageTypes: ["Primary", "Backdrop"],
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
    queryKey: ["genres"],
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

// Tous les items d'un type donné (pour écrans Films / Séries par genre)
export function useAllItemsByType(itemType: BaseItemKind) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["allItems", itemType],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [itemType],
        sortBy: [ItemSortBy.SortName],
        sortOrder: [SortOrder.Ascending],
        recursive: true,
        fields: [
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

// Items par genre
export function useItemsByGenre(genre: string, limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["genre", genre, limit],
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
        enableImageTypes: ["Primary", "Backdrop"],
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
    queryKey: ["item", itemId],
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

// Items similaires — avec fallback par genre pour les anime/animation
export function useSimilarItems(itemId: string, limit = 12, genres?: string[]) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["similar", itemId, limit, genres],
    queryFn: async () => {
      const libApi = getLibraryApi(api!);
      const result = await libApi.getSimilarItems({
        itemId,
        limit,
        fields: [ItemFields.Overview, ItemFields.Genres],
      });
      const items = result.data.Items ?? [];
      if (items.length > 0) return items;

      // Fallback : chercher par genre si aucun résultat similaire
      const animeGenres = (genres ?? []).filter((g) =>
        /anime|animation/i.test(g),
      );
      if (animeGenres.length > 0) {
        const itemsApi = getItemsApi(api!);
        const fallback = await itemsApi.getItems({
          userId,
          includeItemTypes: [BaseItemKind.Series, BaseItemKind.Movie],
          genres: animeGenres,
          sortBy: [ItemSortBy.Random],
          limit,
          recursive: true,
          fields: [ItemFields.Overview, ItemFields.Genres],
          excludeItemIds: [itemId],
        });
        return fallback.data.Items ?? [];
      }

      return items;
    },
    enabled: !!api && !!itemId,
  });
}

// Items favoris / Ma Liste
export function useFavoriteItems(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["favorites", limit],
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
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Vérifier si un item est favori
export function useIsFavorite(itemId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["isFavorite", itemId],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getItem({ userId: userId!, itemId });
      return result.data.UserData?.IsFavorite ?? false;
    },
    enabled: !!api && !!userId && !!itemId,
  });
}

// Toggle favori (ajouter/retirer de Ma liste)
export function useToggleFavorite() {
  const { api, userId } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      isFavorite,
    }: {
      itemId: string;
      isFavorite: boolean;
    }) => {
      const userLibApi = getUserLibraryApi(api!);
      if (isFavorite) {
        await userLibApi.unmarkFavoriteItem({ userId: userId!, itemId });
      } else {
        await userLibApi.markFavoriteItem({ userId: userId!, itemId });
      }
      return !isFavorite;
    },
    onSuccess: (newValue, { itemId }) => {
      queryClient.setQueryData(["isFavorite", itemId], newValue);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

// Vérifie si l'utilisateur a liké un item (UserData.Likes)
export function useIsLiked(itemId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["isLiked", itemId],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getItem({ userId: userId!, itemId });
      return result.data.UserData?.Likes ?? false;
    },
    enabled: !!api && !!userId && !!itemId,
  });
}

// Toggle like (évaluer un item)
export function useToggleLike() {
  const { api, userId } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      isLiked,
    }: {
      itemId: string;
      isLiked: boolean;
    }) => {
      const userLibApi = getUserLibraryApi(api!);
      if (isLiked) {
        await userLibApi.deleteUserItemRating({ userId: userId!, itemId });
      } else {
        await userLibApi.updateUserItemRating({
          userId: userId!,
          itemId,
          likes: true,
        });
      }
      return !isLiked;
    },
    onSuccess: (newValue, { itemId }) => {
      queryClient.setQueryData(["isLiked", itemId], newValue);
      queryClient.invalidateQueries({ queryKey: ["trending"] });
    },
  });
}

// Items les mieux notés (CommunityRating + CriticRating)
export function useTopRated(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["topRated", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.CommunityRating],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        minCommunityRating: 1,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
          ItemFields.ChildCount,
          ItemFields.RemoteTrailers,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Items likés par l'utilisateur
export function useLikedItems(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["liked", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        filters: ["Likes" as any],
        sortBy: [ItemSortBy.DatePlayed],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.ChildCount,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
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
    queryKey: ["newly-added", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        sortBy: [ItemSortBy.DateCreated],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.People,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
          ItemFields.ChildCount,
          ItemFields.RemoteTrailers,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Saisons d'une série
export function useSeasons(seriesId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["seasons", seriesId],
    queryFn: async () => {
      const tvApi = getTvShowsApi(api!);
      const result = await tvApi.getSeasons({
        seriesId,
        userId,
        fields: [ItemFields.Overview],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId && !!seriesId,
  });
}

// Épisodes d'une saison
export function useEpisodes(seriesId: string, seasonId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["episodes", seriesId, seasonId],
    queryFn: async () => {
      const tvApi = getTvShowsApi(api!);
      const result = await tvApi.getEpisodes({
        seriesId,
        seasonId,
        userId,
        fields: [ItemFields.Overview, ItemFields.People],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Thumb"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId && !!seriesId && !!seasonId,
  });
}

// Collection (BoxSet) contenant un item donné
// Stratégie : tenter getAncestors d'abord (1 appel), puis fallback itération BoxSets
export function useCollectionForItem(itemId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["collection-for-item", itemId],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const libApi = getLibraryApi(api!);

      // Stratégie 1 : vérifier les ancêtres de l'item pour trouver un BoxSet parent
      try {
        const ancestors = await libApi.getAncestors({ itemId, userId });
        const boxSetAncestor = (ancestors.data ?? []).find(
          (a) => a.Type === BaseItemKind.BoxSet,
        );
        if (boxSetAncestor?.Id) {
          const children = await itemsApi.getItems({
            userId,
            parentId: boxSetAncestor.Id,
            sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName],
            sortOrder: [SortOrder.Ascending],
            fields: [ItemFields.Overview, ItemFields.People],
          });
          const items = children.data.Items ?? [];
          if (items.length > 0) {
            return { boxSet: boxSetAncestor, items };
          }
        }
      } catch (_e) {
        // Fallback vers itération
      }

      // Stratégie 2 : itérer tous les BoxSets et chercher celui qui contient notre item
      const boxSetsResult = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.BoxSet],
        recursive: true,
      });
      const boxSets = boxSetsResult.data.Items ?? [];
      if (boxSets.length === 0) return null;

      // Pour chaque BoxSet, récupérer ses enfants
      for (const bs of boxSets) {
        try {
          const children = await itemsApi.getItems({
            userId,
            parentId: bs.Id!,
            fields: [ItemFields.Overview, ItemFields.People],
          });
          const items = children.data.Items ?? [];
          const found = items.some((i) => i.Id === itemId);
          if (found) {
            return { boxSet: bs, items };
          }
        } catch (_e) {
          // Ignorer les erreurs individuelles
        }
      }

      return null;
    },
    enabled: !!api && !!userId && !!itemId,
    staleTime: 10 * 60 * 1000,
  });
}
