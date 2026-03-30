import React, { useRef, useState, useMemo } from 'react';
import { View, Dimensions, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { styles } from '@/styles';
import { AnimatedHeader } from '@/components/Header/AnimatedHeader';
import { FeaturedContent } from '@/components/FeaturedContent/FeaturedContent';
import { MovieList } from '@/components/MovieList/MovieList';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';
import { usePathname } from 'expo-router';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { GameList } from '@/components/GameList/GameList';
import { useScrollToTop } from '@react-navigation/native';
import { useVisionOS } from '@/hooks/useVisionOS';
import { VisionContainer, HoverableView } from '@/components/ui/VisionContainer';
import { useJellyfinHome } from '@/src/hooks/useJellyfinHome';
import { useAuthStore } from '@/src/stores/authStore';

const FALLBACK_FEATURED = {
  id: 'placeholder',
  title: 'JellyStream',
  thumbnail: '',
  categories: ['Films', 'Séries', 'Documentaires'],
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const { rows, featured, isLoading, isError } = useJellyfinHome();
  const userName = useAuthStore((s) => s.userName);
  const insets = useSafeAreaInsets();
  const { tiltX, tiltY } = useDeviceMotion();
  const { isVisionOS } = useVisionOS();
  const [activeFilter, setActiveFilter] = useState<'Movie' | 'Series' | null>(null);

  // Filtrer les rows selon le filtre actif
  const filteredRows = useMemo(() => {
    if (!activeFilter) return rows;
    return rows
      .map((row) => ({
        ...row,
        movies: row.movies.filter((m) => m.mediaType === activeFilter),
      }))
      .filter((row) => row.movies.length > 0);
  }, [rows, activeFilter]);

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
      intensity: interpolate(
        scrollY.value,
        [0, 90],
        [0, 85],
        'clamp'
      )
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

  const pathname = usePathname();
  const isActive = pathname === '/' || pathname === '/index';

  const currentTabIndex = TAB_SCREENS.findIndex(screen =>
    screen.name === 'index'
  );
  const activeTabIndex = TAB_SCREENS.findIndex(screen =>
    pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
  );

  const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

  const scrollViewRef = useRef(null);

  useScrollToTop(scrollViewRef);

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
      <VisionContainer style={styles.container}>
        <StatusBar style="light" />
        <AnimatedHeader
          headerAnimatedProps={headerAnimatedProps}
          title={userName ? `Pour ${userName}` : 'Accueil'}
          scrollDirection={scrollDirection}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {isLoading && rows.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#E50914" />
          </View>
        ) : (
          <Animated.ScrollView
            ref={scrollViewRef}
            style={[
              styles.scrollView,
              isVisionOS && { paddingHorizontal: 20 }
            ]}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <LinearGradient
              colors={['#202036', '#11111d', '#07070c']}
              locations={[0, 0.4, 0.8]}
              style={[styles.gradient, { height: SCREEN_HEIGHT * 0.8 }]}
            />

            <FeaturedContent
              movie={featured ?? FALLBACK_FEATURED}
              imageStyle={imageStyle}
              categoriesStyle={categoriesStyle}
              buttonsStyle={buttonsStyle}
              topMargin={insets.top + 90}
            />

            {filteredRows.map(row => (
              <MovieList key={row.rowTitle} {...row} />
            ))}
          </Animated.ScrollView>
        )}
      </VisionContainer>
    </TabScreenWrapper>
  );
}


