import { FeaturedContent } from "@/components/FeaturedContent/FeaturedContent";
import { MovieList } from "@/components/MovieList/MovieList";
import { useAllItemsByType } from "@/src/api/queries/useMediaQueries";
import { toMovie } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl } from "@/src/utils/imageUrl";
import { FeaturedMovie, MovieRow } from "@/types/movie";
import { Ionicons } from "@expo/vector-icons";
import {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CastButton = Platform.OS !== "web"
  ? require("react-native-google-cast").CastButton
  : () => null;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

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
  const candidate =
    items.find(
      (item) => item.BackdropImageTags?.length || item.ImageTags?.["Backdrop"],
    ) ?? items[0];
  if (!candidate) {
    return { id: "", title: "Films", thumbnail: "", categories: [] };
  }
  const backdropTag =
    candidate.BackdropImageTags?.[0] ?? candidate.ImageTags?.["Backdrop"];
  return {
    id: candidate.Id ?? "",
    title: candidate.Name ?? "",
    thumbnail: backdropTag
      ? getBackdropUrl(serverUrl, candidate.Id ?? "", 1280, 80, backdropTag)
      : getBackdropUrl(serverUrl, candidate.Id ?? "", 1280, 80),
    categories: candidate.Genres?.slice(0, 3) ?? [],
  };
}

export default function FilmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const { data: allMovies, isLoading } = useAllItemsByType(BaseItemKind.Movie);

  const rows = useMemo(
    () => groupByGenre(allMovies ?? [], serverUrl),
    [allMovies, serverUrl],
  );

  const featured = useMemo(
    () => pickFeatured(allMovies ?? [], serverUrl),
    [allMovies, serverUrl],
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedProps = useAnimatedProps(() => {
    return {
      intensity: interpolate(scrollY.value, [0, 90], [0, 85], "clamp"),
    };
  });

  const headerOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 10], [0, 1], "clamp"),
    };
  });

  const dummyAnimStyle = { transform: [] };

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Header blur adaptatif */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerOpacityStyle]}>
          <AnimatedBlurView
            tint="systemThickMaterialDark"
            style={{ width: "100%", height: "100%" }}
            animatedProps={headerAnimatedProps}
          />
        </Animated.View>
        <View style={s.headerContent}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            style={s.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={s.headerTitle}>Films</Text>
          <CastButton style={{ width: 24, height: 24, tintColor: "#fff" }} />
        </View>
      </View>

      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={s.scrollContent}
        >
          <LinearGradient
            colors={["#202036", "#11111d", "#07070c"]}
            locations={[0, 0.4, 0.8]}
            style={[s.gradient, { height: SCREEN_HEIGHT * 0.8 }]}
          />

          <FeaturedContent
            movie={featured}
            imageStyle={dummyAnimStyle}
            categoriesStyle={dummyAnimStyle}
            buttonsStyle={dummyAnimStyle}
            topMargin={insets.top + 90}
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
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurContainer: {
    width: "100%",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
