import { BigCardRow } from "@/components/MovieList/BigCardRow";
import { useRecentlyPlayed } from "@/src/api/queries/useMediaQueries";
import { toMovie } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import React, { useMemo } from "react";

export function WatchedFilmsRow() {
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const { data } = useRecentlyPlayed(20);

  const movies = useMemo(() => {
    if (!data) return [];
    return data
      .filter((item) => item.Type === "Movie")
      .map((item) => toMovie(item, serverUrl));
  }, [data, serverUrl]);

  if (movies.length === 0) return null;

  return <BigCardRow rowTitle="Vous avez regardé" movies={movies} cardWidth={160.32} cardHeight={300.48} />;
}
