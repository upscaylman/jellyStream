// Hook qui agrège les données Jellyfin en rows pour la Home
// Convertit les BaseItemDto[] en MovieRow[] compatibles avec les composants existants
import {
  useFavoriteItems,
  useLatestMovies,
  useLatestSeries,
  useNewlyAdded,
  useRecentlyAdded,
  useResumeItems,
  useTrending,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getImageUrl } from "@/src/utils/imageUrl";
import { MovieRow } from "@/types/movie";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

interface JellyfinHomeData {
  rows: MovieRow[];
  featured: {
    id: string;
    title: string;
    thumbnail: string;
    categories: string[];
  } | null;
  isLoading: boolean;
  isError: boolean;
}

// Détermine le badge à afficher sur l'affiche (style Netflix)
export function computeBadge(item: BaseItemDto): string | undefined {
  // Nouvelle saison : série avec plus d'une saison dont du contenu a été ajouté récemment
  if (item.Type === "Series" && (item.ChildCount ?? 0) > 1) {
    const lastMedia = item.DateLastMediaAdded;
    if (lastMedia) {
      const daysSince =
        (Date.now() - new Date(lastMedia).getTime()) / 86_400_000;
      if (daysSince <= 90) return "Nouvelle saison";
    }
  }
  // Ajout récent : ajouté il y a moins de 90 jours
  const dateAdded = item.DateCreated;
  if (dateAdded) {
    const daysSince = (Date.now() - new Date(dateAdded).getTime()) / 86_400_000;
    if (daysSince <= 90) return "Ajout récent";
  }
  return undefined;
}

// Convertit un BaseItemDto en Movie pour les composants existants
export function toMovie(item: BaseItemDto, serverUrl: string) {
  const imageTag = item.ImageTags?.["Primary"];
  // Toujours construire une URL d'image si on a un itemId — Jellyfin servira
  // l'image même sans tag (le tag est optionnel, juste pour le cache)
  const itemId = item.Id ?? "";
  return {
    id: itemId,
    imageUrl: itemId
      ? getImageUrl({
          serverUrl,
          itemId,
          maxWidth: 300,
          quality: 90,
          tag: imageTag,
        })
      : "",
    title: item.Name ?? "",
    year: item.ProductionYear?.toString() ?? "",
    duration: item.RunTimeTicks
      ? `${Math.round(item.RunTimeTicks / 600000000)}m`
      : "",
    rating: item.OfficialRating ?? "",
    description: item.Overview ?? "",
    mediaType: item.Type ?? "",
    badge: computeBadge(item),
  };
}

export function useJellyfinHome(): JellyfinHomeData {
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";

  const resume = useResumeItems(12);
  const latestMovies = useLatestMovies(20);
  const latestSeries = useLatestSeries(20);
  const trending = useTrending(20);
  const recentlyAdded = useRecentlyAdded(20);
  const newlyAdded = useNewlyAdded(20);
  const favorites = useFavoriteItems(20);

  const isLoading =
    resume.isLoading ||
    latestMovies.isLoading ||
    latestSeries.isLoading ||
    trending.isLoading ||
    recentlyAdded.isLoading ||
    newlyAdded.isLoading;

  const isError =
    resume.isError &&
    latestMovies.isError &&
    latestSeries.isError &&
    newlyAdded.isError;

  // Debug : log les erreurs des queries pour diagnostiquer
  if (__DEV__) {
    if (latestMovies.isError)
      console.warn("[Home] latestMovies error:", latestMovies.error);
    if (latestSeries.isError)
      console.warn("[Home] latestSeries error:", latestSeries.error);
    if (trending.isError)
      console.warn("[Home] trending error:", trending.error);
    if (recentlyAdded.isError)
      console.warn("[Home] recentlyAdded error:", recentlyAdded.error);
    if (newlyAdded.isError)
      console.warn("[Home] newlyAdded error:", newlyAdded.error);
  }

  // Construire les rows à partir des résultats
  const rows: MovieRow[] = [];

  if (resume.data?.length) {
    rows.push({
      rowTitle: "Reprendre la lecture",
      movies: resume.data.map((item) => toMovie(item, serverUrl)),
    });
  }

  if (favorites.data?.length) {
    rows.push({
      rowTitle: "Ma liste",
      movies: favorites.data.map((item) => toMovie(item, serverUrl)),
      showAll: true,
    });
  }

  if (trending.data?.length) {
    rows.push({
      rowTitle: "Tendances",
      movies: trending.data.map((item) => toMovie(item, serverUrl)),
      type: "top_10",
    });
  }

  if (latestMovies.data?.length) {
    rows.push({
      rowTitle: "Films récents",
      movies: latestMovies.data.map((item) => toMovie(item, serverUrl)),
      showAll: true,
      showAllRoute: "/films",
    });
  }

  if (latestSeries.data?.length) {
    rows.push({
      rowTitle: "Séries récentes",
      movies: latestSeries.data.map((item) => toMovie(item, serverUrl)),
      showAll: true,
      showAllRoute: "/series-list",
    });
  }

  if (recentlyAdded.data?.length) {
    rows.push({
      rowTitle: "Ajoutés récemment",
      movies: recentlyAdded.data.map((item) => toMovie(item, serverUrl)),
    });
  }

  // Fallback : si aucune row n'est remplie, utiliser useNewlyAdded (même query que New & Hot, toujours fiable)
  if (rows.length === 0 && newlyAdded.data?.length) {
    rows.push({
      rowTitle: "Votre bibliothèque",
      movies: newlyAdded.data.map((item) => toMovie(item, serverUrl)),
    });
  }

  // Featured : prendre le premier item avec un backdrop
  let featured: JellyfinHomeData["featured"] = null;
  const allItems = [
    ...(newlyAdded.data ?? []),
    ...(trending.data ?? []),
    ...(latestMovies.data ?? []),
    ...(recentlyAdded.data ?? []),
  ];
  const featuredItem =
    allItems.find(
      (item) => item.BackdropImageTags?.length || item.ImageTags?.["Backdrop"],
    ) ?? allItems[0];

  if (featuredItem) {
    const backdropTag =
      featuredItem.BackdropImageTags?.[0] ??
      featuredItem.ImageTags?.["Backdrop"];
    const primaryTag = featuredItem.ImageTags?.["Primary"];
    featured = {
      id: featuredItem.Id ?? "",
      title: featuredItem.Name ?? "",
      thumbnail: backdropTag
        ? getBackdropUrl(
            serverUrl,
            featuredItem.Id ?? "",
            1280,
            80,
            backdropTag,
          )
        : primaryTag
          ? getImageUrl({
              serverUrl,
              itemId: featuredItem.Id ?? "",
              maxWidth: 1280,
              quality: 80,
              tag: primaryTag,
            })
          : "",
      categories: featuredItem.Genres ?? [],
    };
  }

  return { rows, featured, isLoading, isError };
}
