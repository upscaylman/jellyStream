// Hook qui agrège les données Jellyfin en rows pour la Home
// Convertit les BaseItemDto[] en MovieRow[] compatibles avec les composants existants
import {
  useFavoriteItems,
  useLatestMovies,
  useLatestSeries,
  useLikedItems,
  useNewlyAdded,
  useRecentlyAdded,
  useResumeItems,
  useTopRated,
  useTrending,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getImageUrl, getLogoUrl } from "@/src/utils/imageUrl";
import { MovieRow } from "@/types/movie";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useMemo, useRef } from "react";

interface JellyfinHomeData {
  rows: MovieRow[];
  featured: {
    id: string;
    title: string;
    thumbnail: string;
    categories: string[];
    logoUrl?: string;
  } | null;
  genres: string[];
  isLoading: boolean;
  isError: boolean;
}

// Détermine le badge à afficher sur l'affiche (style Netflix)
export function computeBadge(item: BaseItemDto): string | undefined {
  // Nouvelle saison : série avec plus d'une saison dont du contenu ajouté il y a ≤ 7 jours
  if (item.Type === "Series" && (item.ChildCount ?? 0) > 1) {
    const lastMedia = item.DateLastMediaAdded;
    if (lastMedia) {
      const daysSince =
        (Date.now() - new Date(lastMedia).getTime()) / 86_400_000;
      if (daysSince <= 7) return "Nouvelle saison";
    }
  }
  // Ajout récent : ajouté il y a ≤ 7 jours
  const dateAdded = item.DateCreated;
  if (dateAdded) {
    const daysSince = (Date.now() - new Date(dateAdded).getTime()) / 86_400_000;
    if (daysSince <= 7) return "Ajout récent";
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
    genres: item.Genres ?? [],
  };
}

// Construit l'objet featured à partir d'un BaseItemDto
function buildFeatured(
  item: BaseItemDto,
  serverUrl: string,
): JellyfinHomeData["featured"] {
  const backdropTag =
    item.BackdropImageTags?.[0] ?? item.ImageTags?.["Backdrop"];
  const primaryTag = item.ImageTags?.["Primary"];
  return {
    id: item.Id ?? "",
    title: item.Name ?? "",
    thumbnail: backdropTag
      ? getBackdropUrl(serverUrl, item.Id ?? "", 1280, 80, backdropTag)
      : primaryTag
        ? getImageUrl({
            serverUrl,
            itemId: item.Id ?? "",
            maxWidth: 1280,
            quality: 80,
            tag: primaryTag,
          })
        : "",
    categories: item.Genres ?? [],
    logoUrl: item.ImageTags?.["Logo"]
      ? getLogoUrl(serverUrl, item.Id ?? "", 500, 90, item.ImageTags["Logo"])
      : undefined,
  };
}

export function useJellyfinHome(): JellyfinHomeData {
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";

  const resume = useResumeItems(12);
  const latestMovies = useLatestMovies(20);
  const latestSeries = useLatestSeries(20);
  const trending = useTrending(40);
  const topRated = useTopRated(40);
  const likedItems = useLikedItems(40);
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

  // Algorithme Tendances : combine PlayCount, CommunityRating, CriticRating et likes
  const trendingRows = useMemo(() => {
    const allCandidates = [
      ...(trending.data ?? []),
      ...(topRated.data ?? []),
      ...(likedItems.data ?? []),
    ];
    // Dédupliquer par Id
    const seen = new Map<string, BaseItemDto>();
    for (const item of allCandidates) {
      if (item.Id && !seen.has(item.Id)) {
        seen.set(item.Id, item);
      }
    }
    const likedIds = new Set(
      (likedItems.data ?? []).map((item) => item.Id).filter(Boolean),
    );

    // Score composite : PlayCount (40%) + CommunityRating (30%) + CriticRating (20%) + Like bonus (10%)
    const scored = [...seen.values()].map((item) => {
      const playCount = item.UserData?.PlayCount ?? 0;
      const communityRating = item.CommunityRating ?? 0;
      const criticRating = item.CriticRating ?? 0;
      const isLiked = likedIds.has(item.Id);

      const score =
        playCount * 0.4 +
        communityRating * 0.3 +
        (criticRating / 10) * 0.2 +
        (isLiked ? 5 : 0);

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 20).map((s) => s.item);
  }, [trending.data, topRated.data, likedItems.data]);

  if (trendingRows.length > 0) {
    rows.push({
      rowTitle: "Tendances",
      movies: trendingRows.map((item) => toMovie(item, serverUrl)),
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

  // Featured : choisir parmi les derniers ajouts avec backdrop
  // On fige le choix dès que les données principales sont chargées pour éviter
  // le changement de poster à chaque arrivée progressive de données
  const featuredRef = useRef<string | null>(null);

  const featured: JellyfinHomeData["featured"] = useMemo(() => {
    const allItems = [
      ...(newlyAdded.data ?? []),
      ...(trending.data ?? []),
      ...(latestMovies.data ?? []),
      ...(recentlyAdded.data ?? []),
    ];
    if (allItems.length === 0) return null;

    const withBackdrop = allItems.filter(
      (item) => item.BackdropImageTags?.length || item.ImageTags?.["Backdrop"],
    );
    const candidates = withBackdrop.length > 0 ? withBackdrop : allItems;

    // Si un featured a déjà été figé et qu'il est toujours dans les candidats, le garder
    if (featuredRef.current) {
      const existing = candidates.find((c) => c.Id === featuredRef.current);
      if (existing) {
        return buildFeatured(existing, serverUrl);
      }
    }

    // Index déterministe basé sur le jour — change toutes les 24h
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const chosen = candidates[dayIndex % candidates.length];
    if (chosen) {
      featuredRef.current = chosen.Id ?? null;
      return buildFeatured(chosen, serverUrl);
    }
    return null;
  }, [
    newlyAdded.data,
    trending.data,
    latestMovies.data,
    recentlyAdded.data,
    serverUrl,
  ]);

  // Extraire les genres uniques depuis tous les items
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    const allRawItems = [
      ...(latestMovies.data ?? []),
      ...(latestSeries.data ?? []),
      ...(trending.data ?? []),
      ...(recentlyAdded.data ?? []),
      ...(newlyAdded.data ?? []),
      ...(favorites.data ?? []),
    ];
    for (const item of allRawItems) {
      for (const genre of item.Genres ?? []) {
        genreSet.add(genre);
      }
    }
    return [...genreSet].sort((a, b) => a.localeCompare(b));
  }, [
    latestMovies.data,
    latestSeries.data,
    trending.data,
    recentlyAdded.data,
    newlyAdded.data,
    favorites.data,
  ]);

  return { rows, featured, genres, isLoading, isError };
}
