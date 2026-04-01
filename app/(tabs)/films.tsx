import { FeaturedContent } from "@/components/FeaturedContent/FeaturedContent";
import { AnimatedHeader } from "@/components/Header/AnimatedHeader";
import { MovieList } from "@/components/MovieList/MovieList";
import { useAllItemsByType } from "@/src/api/queries/useMediaQueries";
import { toMovie } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getLogoUrl } from "@/src/utils/imageUrl";
import { styles } from "@/styles";
import { FeaturedMovie, MovieRow } from "@/types/movie";
import {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDominantColor } from "@/hooks/useDominantColor";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function groupByGenre(items: BaseItemDto[], serverUrl: string): MovieRow[] {
  const genreMap = new Map<string, BaseItemDto[]>();
  for (const item of items) {
    for (const genre of item.Genres ?? []) {
      const list = genreMap.get(genre) ?? [];
      list.push(item);
      genreMap.set(genre, list);
    }
  }
  // Trier genres par nombre d'items décroissant
  const sorted = [...genreMap.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  return sorted.map(([genre, genreItems]) => ({
    rowTitle: genre,
    movies: genreItems.map((item) => toMovie(item, serverUrl)),
  }));
}

function pickFeatured(items: BaseItemDto[], serverUrl: string): FeaturedMovie {
  const withBackdrop = items.filter(
    (item) => item.BackdropImageTags?.length || item.ImageTags?.["Backdrop"],
  );
  const candidates = withBackdrop.length > 0 ? withBackdrop : items;
  // Index déterministe basé sur le jour — change toutes les 24h
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const candidate =
    candidates.length > 0
      ? candidates[dayIndex % candidates.length]
      : undefined;
  if (!candidate) {
    return { id: "", title: "Films", thumbnail: "", categories: [] };
  }
  const backdropTag =
    candidate.BackdropImageTags?.[0] ?? candidate.ImageTags?.["Backdrop"];
  const logoTag = candidate.ImageTags?.["Logo"];
  return {
    id: candidate.Id ?? "",
    title: candidate.Name ?? "",
    thumbnail: backdropTag
      ? getBackdropUrl(serverUrl, candidate.Id ?? "", 1280, 80, backdropTag)
      : getBackdropUrl(serverUrl, candidate.Id ?? "", 1280, 80),
    categories: candidate.Genres?.slice(0, 3) ?? [],
    logoUrl: logoTag
      ? getLogoUrl(serverUrl, candidate.Id ?? "", 500, 90, logoTag)
      : undefined,
  };
}

export default function FilmsScreen() {
  const insets = useSafeAreaInsets();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const { data: allMovies, isLoading } = useAllItemsByType(BaseItemKind.Movie);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const genres = useMemo(() => {
    if (!allMovies) return [];
    const genreSet = new Set<string>();
    for (const item of allMovies) {
      for (const genre of item.Genres ?? []) {
        genreSet.add(genre);
      }
    }
    return [...genreSet].sort((a, b) => a.localeCompare(b));
  }, [allMovies]);

  const filteredMovies = useMemo(() => {
    if (!selectedGenre || !allMovies) return allMovies;
    return allMovies.filter((m) => m.Genres?.includes(selectedGenre));
  }, [allMovies, selectedGenre]);

  const rows = useMemo(
    () => groupByGenre(filteredMovies ?? [], serverUrl),
    [filteredMovies, serverUrl],
  );

  const featured = useMemo(
    () => pickFeatured(filteredMovies ?? [], serverUrl),
    [filteredMovies, serverUrl],
  );

  const dominantColor = useDominantColor(featured?.thumbnail);

  const SCROLL_THRESHOLD = 4;
  const SLIDE_ACTIVATION_POINT = 90;
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentScrollY = event.contentOffset.y;
      const scrollDelta = currentScrollY - lastScrollY.value;

      if (currentScrollY >= SLIDE_ACTIVATION_POINT) {
        if (scrollDelta > SCROLL_THRESHOLD) {
          scrollDirection.value = withTiming(1, { duration: 400 });
        } else if (scrollDelta < -SCROLL_THRESHOLD) {
          scrollDirection.value = withTiming(0, { duration: 400 });
        }
      } else {
        scrollDirection.value = withTiming(0, { duration: 400 });
      }

      lastScrollY.value = currentScrollY;
      scrollY.value = currentScrollY;
    },
  });

  const headerAnimatedProps = useAnimatedProps(() => {
    return {
      intensity: interpolate(scrollY.value, [0, 90], [0, 85], "clamp"),
    };
  });

  const dummyAnimStyle = { transform: [] };

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <AnimatedHeader
        headerAnimatedProps={headerAnimatedProps}
        title="Films"
        scrollDirection={scrollDirection}
        scrollY={scrollY}
        subPage
        genres={genres}
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
        itemCount={filteredMovies?.length ?? 0}
      />

      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <Animated.ScrollView
          style={styles.scrollView}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <LinearGradient
            colors={[dominantColor, "#11111d", "#07070c"]}
            locations={[0, 0.4, 0.8]}
            style={[s.gradient, { height: SCREEN_HEIGHT * 0.8 }]}
          />

          <FeaturedContent
            movie={featured}
            imageStyle={dummyAnimStyle}
            categoriesStyle={dummyAnimStyle}
            buttonsStyle={dummyAnimStyle}
            topMargin={insets.top + 90}
            dominantColor={dominantColor}
          />

          {rows.map((row) => (
            <MovieList key={row.rowTitle} {...row} />
          ))}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
