import { FeaturedContent } from "@/components/FeaturedContent/FeaturedContent";
import { AnimatedHeader } from "@/components/Header/AnimatedHeader";
import { MovieList } from "@/components/MovieList/MovieList";
import { WatchedFilmsRow } from "@/components/MovieList/WatchedFilmsRow";
import { VisionContainer } from "@/components/ui/VisionContainer";
import { useDeviceMotion } from "@/hooks/useDeviceMotion";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useVisionOS } from "@/hooks/useVisionOS";
import { useJellyfinHome } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import { usePreferencesStore } from "@/src/stores/preferencesStore";
import { styles } from "@/styles";
import { useScrollToTop } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FALLBACK_FEATURED = {
  id: "placeholder",
  title: "JellyStream",
  thumbnail: "",
  categories: ["Films", "Séries", "Documentaires"],
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const { rows, featured, genres, isLoading, isError } = useJellyfinHome();
  const serverName = useAuthStore((s) => s.serverName);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const setServer = useAuthStore((s) => s.setServer);
  const showServerName = usePreferencesStore((s) => s.showServerName);

  // Récupérer le nom du serveur s'il n'est pas encore connu
  useEffect(() => {
    if (serverName || !serverUrl) return;
    fetch(`${serverUrl}/System/Info/Public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (info?.ServerName) setServer(serverUrl, info.ServerName);
      })
      .catch(() => {});
  }, [serverName, serverUrl]);
  const insets = useSafeAreaInsets();
  const dominantColor = useDominantColor(featured?.thumbnail);
  const { tiltX, tiltY } = useDeviceMotion();
  const { isVisionOS } = useVisionOS();
  const [activeFilter, setActiveFilter] = useState<"Movie" | "Series" | null>(
    null,
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Filtrer les rows selon le filtre actif et le genre sélectionné
  const filteredRows = useMemo(() => {
    let result = rows;
    if (activeFilter) {
      result = result
        .map((row) => ({
          ...row,
          movies: row.movies.filter((m) => m.mediaType === activeFilter),
        }))
        .filter((row) => row.movies.length > 0);
    }
    if (selectedGenre) {
      result = result
        .map((row) => ({
          ...row,
          movies: row.movies.filter((m) => m.genres?.includes(selectedGenre)),
        }))
        .filter((row) => row.movies.length > 0);
    }
    return result;
  }, [rows, activeFilter, selectedGenre]);

  const SCROLL_THRESHOLD = 4;
  const SLIDE_ACTIVATION_POINT = 90; // Point at which sliding can start
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollDirection = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentScrollY = event.contentOffset.y;
      const scrollDelta = currentScrollY - lastScrollY.value;

      // Only trigger direction change if we've scrolled past SLIDE_ACTIVATION_POINT
      if (currentScrollY >= SLIDE_ACTIVATION_POINT) {
        if (scrollDelta > SCROLL_THRESHOLD) {
          // Scrolling down - hide tabs
          scrollDirection.value = withTiming(1, { duration: 400 });
        } else if (scrollDelta < -SCROLL_THRESHOLD) {
          // Scrolling up - show tabs
          scrollDirection.value = withTiming(0, { duration: 400 });
        }
      } else {
        // Before SLIDE_ACTIVATION_POINT, always show tabs
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

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 0.7 },
      { translateY: tiltY.value * 0.7 },
      { scale: 1.05 },
    ],
  }));

  const categoriesStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * -0.35 },
      { translateY: tiltY.value * -0.35 },
    ],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * -0.45 },
      { translateY: tiltY.value * -0.45 },
    ],
  }));

  const scrollViewRef = useRef(null);

  useScrollToTop(scrollViewRef);

  return (
    <VisionContainer style={styles.container}>
      <StatusBar style="light" />
      <AnimatedHeader
        headerAnimatedProps={headerAnimatedProps}
        title={showServerName && serverName ? serverName : "Accueil"}
        scrollDirection={scrollDirection}
        scrollY={scrollY}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        genres={genres}
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
      />

      {isLoading && rows.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          }}
        >
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, isVisionOS && { paddingHorizontal: 20 }]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LinearGradient
            colors={[dominantColor, "#11111d", "#07070c"]}
            locations={[0, 0.4, 0.8]}
            style={[styles.gradient, { height: SCREEN_HEIGHT * 0.8 }]}
          />

          <FeaturedContent
            movie={featured ?? FALLBACK_FEATURED}
            imageStyle={imageStyle}
            categoriesStyle={categoriesStyle}
            buttonsStyle={buttonsStyle}
            topMargin={insets.top + 90}
            dominantColor={dominantColor}
          />

          {filteredRows.map((row, index) => (
            <React.Fragment key={row.rowTitle}>
              <MovieList {...row} />
              {index === 4 && <WatchedFilmsRow />}
            </React.Fragment>
          ))}
          {filteredRows.length <= 4 && <WatchedFilmsRow />}
        </Animated.ScrollView>
      )}
    </VisionContainer>
  );
}
