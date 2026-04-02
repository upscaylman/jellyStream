// Queries TanStack pour les films et médias Jellyfin
import { useAuthStore } from "@/src/stores/authStore";
import {
  BaseItemKind,
  ItemFields,
  ItemFilter,
  ItemSortBy,
  MetadataRefreshMode,
  SortOrder,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getCollectionApi } from "@jellyfin/sdk/lib/utils/api/collection-api";
import { getItemRefreshApi } from "@jellyfin/sdk/lib/utils/api/item-refresh-api";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { getPlaystateApi } from "@jellyfin/sdk/lib/utils/api/playstate-api";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api/tv-shows-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";
import { getVideosApi } from "@jellyfin/sdk/lib/utils/api/videos-api";
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
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Thumb", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
    staleTime: 0,
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
        limit: searchTerm.length >= 3 ? 50 : 30,
        fields: [ItemFields.Overview, ItemFields.Genres],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId && searchTerm.length >= 1,
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
    staleTime: 0,
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
        fields: [
          ItemFields.Overview,
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

// Vérifie si un item est marqué comme vu (UserData.Played)
export function useIsPlayed(itemId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["isPlayed", itemId],
    queryFn: async () => {
      const userLibApi = getUserLibraryApi(api!);
      const result = await userLibApi.getItem({ userId: userId!, itemId });
      return result.data.UserData?.Played ?? false;
    },
    enabled: !!api && !!userId && !!itemId,
  });
}

// Toggle played (marquer comme vu / non vu)
// Si childItemIds est fourni, marque tous ces items (ex: épisodes d'une saison, films d'une collection)
export function useTogglePlayed() {
  const { api, userId } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      isPlayed,
      childItemIds,
    }: {
      itemId: string;
      isPlayed: boolean;
      childItemIds?: string[];
    }) => {
      const playstateApi = getPlaystateApi(api!);
      const idsToToggle = childItemIds ?? [itemId];

      await Promise.all(
        idsToToggle.map((id) =>
          isPlayed
            ? playstateApi.markUnplayedItem({ itemId: id, userId: userId! })
            : playstateApi.markPlayedItem({ itemId: id, userId: userId! }),
        ),
      );
      return !isPlayed;
    },
    onSuccess: (newValue, { itemId, childItemIds }) => {
      // Invalider le cache pour l'item parent et tous les enfants
      queryClient.setQueryData(["isPlayed", itemId], newValue);
      if (childItemIds) {
        for (const id of childItemIds) {
          queryClient.setQueryData(["isPlayed", id], newValue);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["recently-played"] });
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      queryClient.invalidateQueries({ queryKey: ["collection-for-item"] });
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
        filters: [ItemFilter.Likes],
        sortBy: [ItemSortBy.DatePlayed],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
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

// Vue récemment (films/séries joués récemment, triés par date de lecture)
export function useRecentlyPlayed(limit = 20) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["recently-played", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
        filters: [ItemFilter.IsPlayed],
        sortBy: [ItemSortBy.DatePlayed],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
          ItemFields.DateLastMediaAdded,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      if (__DEV__) {
        console.log(
          "[useRecentlyPlayed] TotalRecordCount:",
          result.data.TotalRecordCount,
          "Items:",
          result.data.Items?.length,
        );
      }
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

// Prochain épisode à regarder pour une série (Next Up)
export function useNextUp(seriesId: string) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["nextUp", seriesId],
    queryFn: async () => {
      const tvApi = getTvShowsApi(api!);
      const result = await tvApi.getNextUp({
        userId,
        seriesId,
        limit: 1,
        fields: [ItemFields.Overview],
      });
      return result.data.Items?.[0] ?? null;
    },
    enabled: !!api && !!userId && !!seriesId,
    staleTime: 0,
  });
}

const TMDB_API_KEY = "0d6ab6b7b423555a44bd9a18c7330e06";

// Liste des BoxSets avec ProviderIds (1 seule requête, pas de chargement d'enfants)
export function useBoxSetIndex() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["boxset-index"],
    queryFn: async (): Promise<{
      byTmdb: Record<string, BaseItemDto>; // tmdbCollectionId → boxSet
      byId: Record<string, BaseItemDto>; // boxSetId → boxSet
    }> => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.BoxSet],
        recursive: true,
        fields: [ItemFields.ProviderIds],
      });
      const boxSets = result.data.Items ?? [];
      const byTmdb: Record<string, BaseItemDto> = {};
      const byId: Record<string, BaseItemDto> = {};
      for (const bs of boxSets) {
        if (bs.Id) byId[bs.Id] = bs;
        const tmdbId = bs.ProviderIds?.Tmdb;
        if (tmdbId) byTmdb[tmdbId] = bs;
      }
      console.log(
        `[BOXSET-INDEX] ✅ ${boxSets.length} BoxSets indexés (${Object.keys(byTmdb).length} avec TMDB ID)`,
      );
      return { byTmdb, byId };
    },
    enabled: !!api && !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Récupère le TMDB collection ID d'un film via l'API TMDB (1 appel léger)
function useTmdbCollectionId(tmdbMovieId: string | undefined) {
  return useQuery({
    queryKey: ["tmdb-collection", tmdbMovieId],
    queryFn: async (): Promise<string | null> => {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.belongs_to_collection?.id?.toString() ?? null;
    },
    enabled: !!tmdbMovieId,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// Récupère les ProviderIds d'un item Jellyfin (pour obtenir son TMDB ID)
function useItemProviderIds(itemId: string | undefined) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["item-providers", itemId],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        ids: [itemId!],
        fields: [ItemFields.ProviderIds],
      });
      return result.data.Items?.[0]?.ProviderIds ?? null;
    },
    enabled: !!api && !!userId && !!itemId,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// Charge les enfants d'un BoxSet (1 requête, cachée par boxSetId)
function useBoxSetChildren(boxSetId: string | undefined) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["boxset-children", boxSetId],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const children = await itemsApi.getItems({
        userId,
        parentId: boxSetId!,
        sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName],
        sortOrder: [SortOrder.Ascending],
        fields: [ItemFields.Overview, ItemFields.People],
      });
      return children.data.Items ?? [];
    },
    enabled: !!api && !!userId && !!boxSetId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Pipeline : itemId → ProviderIds → TMDB collectionId → BoxSet → enfants
// Total : 3-4 requêtes (dont 1 cachée globalement) au lieu de 212
export function useCollectionForItem(itemId: string, itemType?: string) {
  const { data: index, isLoading: indexLoading } = useBoxSetIndex();

  // Si c'est déjà un BoxSet, on le connaît directement
  const isBoxSet = itemType === "BoxSet";
  const directBoxSet = isBoxSet && itemId ? index?.byId[itemId] : undefined;

  // Sinon, récupérer le TMDB ID du film
  const shouldLookup = !!itemId && !isBoxSet;
  const { data: providerIds } = useItemProviderIds(
    shouldLookup ? itemId : undefined,
  );
  const tmdbMovieId = providerIds?.Tmdb;

  // Appeler TMDB pour trouver la collection
  const { data: tmdbCollectionId } = useTmdbCollectionId(tmdbMovieId);

  // Trouver le BoxSet Jellyfin correspondant
  const matchedBoxSet = tmdbCollectionId
    ? index?.byTmdb[tmdbCollectionId]
    : undefined;
  const boxSet = directBoxSet ?? matchedBoxSet;
  const boxSetId = boxSet?.Id;

  // Charger les enfants du BoxSet trouvé
  const { data: items, isLoading: childrenLoading } =
    useBoxSetChildren(boxSetId);

  const data = boxSet && items && items.length > 0 ? { boxSet, items } : null;
  const isLoading = indexLoading || (!data && childrenLoading);

  return { data, isLoading };
}

// Top 10 séries TV (les plus jouées)
export function useTop10Series(limit = 10) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["top10-series", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Series],
        sortBy: [ItemSortBy.PlayCount],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Top 10 films (les plus joués)
export function useTop10Movies(limit = 10) {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["top10-movies", limit],
    queryFn: async () => {
      const itemsApi = getItemsApi(api!);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.Movie],
        sortBy: [ItemSortBy.PlayCount],
        sortOrder: [SortOrder.Descending],
        limit,
        recursive: true,
        fields: [
          ItemFields.Overview,
          ItemFields.Genres,
          ItemFields.DateCreated,
        ],
        imageTypeLimit: 1,
        enableImageTypes: ["Primary", "Backdrop", "Logo"],
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// ─── ACTIONS ADMIN JELLYFIN ────────────────────────────────────────

// Rafraîchir les métadonnées d'un item
export function useRefreshMetadata() {
  const { api } = useJellyfinApi();

  return useMutation({
    mutationFn: async ({
      itemId,
      mode = MetadataRefreshMode.Default,
      replaceAllMetadata = false,
      replaceAllImages = false,
    }: {
      itemId: string;
      mode?: MetadataRefreshMode;
      replaceAllMetadata?: boolean;
      replaceAllImages?: boolean;
    }) => {
      if (!api) throw new Error("API non disponible");
      const refreshApi = getItemRefreshApi(api);
      await refreshApi.refreshItem({
        itemId,
        metadataRefreshMode: mode,
        imageRefreshMode: mode,
        replaceAllMetadata,
        replaceAllImages,
      });
    },
  });
}

// Supprimer un item du serveur
export function useDeleteItem() {
  const { api } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!api) throw new Error("API non disponible");
      const libraryApi = getLibraryApi(api);
      await libraryApi.deleteItem({ itemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["latest"] });
    },
  });
}

// Lister toutes les collections (BoxSets) existantes
export function useAllCollections() {
  const { api, userId } = useJellyfinApi();

  return useQuery({
    queryKey: ["all-collections"],
    queryFn: async () => {
      if (!api || !userId) return [];
      const itemsApi = getItemsApi(api);
      const result = await itemsApi.getItems({
        userId,
        includeItemTypes: [BaseItemKind.BoxSet],
        sortBy: [ItemSortBy.SortName],
        sortOrder: [SortOrder.Ascending],
        recursive: true,
      });
      return result.data.Items ?? [];
    },
    enabled: !!api && !!userId,
  });
}

// Ajouter un item à une collection existante
export function useAddToCollection() {
  const { api } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      itemIds,
    }: {
      collectionId: string;
      itemIds: string[];
    }) => {
      if (!api) throw new Error("API non disponible");
      const collectionApi = getCollectionApi(api);
      await collectionApi.addToCollection({ collectionId, ids: itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-for-item"] });
      queryClient.invalidateQueries({ queryKey: ["boxset-index"] });
      queryClient.invalidateQueries({ queryKey: ["all-collections"] });
    },
  });
}

// Créer une nouvelle collection
export function useCreateCollection() {
  const { api } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      itemIds,
    }: {
      name: string;
      itemIds?: string[];
    }) => {
      if (!api) throw new Error("API non disponible");
      const collectionApi = getCollectionApi(api);
      const result = await collectionApi.createCollection({
        name,
        ids: itemIds,
        isLocked: false,
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxset-index"] });
      queryClient.invalidateQueries({ queryKey: ["all-collections"] });
    },
  });
}

// Fusionner les versions (merge alternatives) de vidéos
export function useMergeVersions() {
  const { api } = useJellyfinApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds }: { itemIds: string[] }) => {
      if (!api) throw new Error("API non disponible");
      const videosApi = getVideosApi(api);
      await videosApi.mergeVersions({ ids: itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}
