import React, { useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Hook qui garde le skeleton visible 2 frames après l'arrivée des données,
 * pour laisser le contenu se peindre avant de retirer l'overlay skeleton.
 * Élimine le flash noir entre skeleton et contenu.
 */
export function useSmoothLoading(hasData: boolean): boolean {
  const [showSkeleton, setShowSkeleton] = useState(!hasData);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasData) {
      // Attendre 2 animation frames pour que le contenu soit peint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mountedRef.current) setShowSkeleton(false);
        });
      });
    } else {
      setShowSkeleton(true);
    }
  }, [hasData]);

  return showSkeleton;
}

// Composant de base : rectangle avec animation shimmer
interface SkeletonBoxProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width,
  height,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.ease }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.6]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: "#2a2a2a",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Skeleton pour le Hero/Featured Content (528px)
export function FeaturedSkeleton({ topMargin = 0 }: { topMargin?: number }) {
  return (
    <View style={[featuredStyles.container, { marginTop: topMargin }]}>
      <View style={featuredStyles.wrapper}>
        <SkeletonBox width="100%" height="100%" borderRadius={8} />
        <View style={featuredStyles.overlay}>
          <SkeletonBox width={180} height={60} borderRadius={4} />
          <SkeletonBox
            width={200}
            height={14}
            borderRadius={4}
            style={{ marginTop: 12 }}
          />
          <View style={featuredStyles.buttons}>
            <SkeletonBox width="48%" height={40} borderRadius={4} />
            <SkeletonBox width="48%" height={40} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

const featuredStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: 528,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  wrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
});

// Skeleton pour une row horizontale de cartes (BigCard style)
const CARD_WIDTH = SCREEN_WIDTH * 0.46;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export function BigCardRowSkeleton() {
  return (
    <View style={rowStyles.container}>
      <SkeletonBox
        width={140}
        height={18}
        borderRadius={4}
        style={{ marginLeft: 16, marginBottom: 10 }}
      />
      <View style={rowStyles.row}>
        {[0, 1, 2].map((i) => (
          <SkeletonBox
            key={i}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            borderRadius={8}
          />
        ))}
      </View>
    </View>
  );
}

// Skeleton pour une row horizontale de posters (MovieList standard)
export function MovieRowSkeleton() {
  return (
    <View style={rowStyles.container}>
      <SkeletonBox
        width={140}
        height={18}
        borderRadius={4}
        style={{ marginLeft: 16, marginBottom: 10 }}
      />
      <View style={rowStyles.row}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ marginRight: 12 }}>
            <SkeletonBox width={120} height={180} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
});

// Skeleton pour la grille poster 3 colonnes (Search)
const POSTER_WIDTH = (SCREEN_WIDTH - 16 * 2 - 6 * 2) / 3;

export function PosterGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <View style={gridStyles.container}>
      <SkeletonBox
        width={100}
        height={18}
        borderRadius={4}
        style={{ marginBottom: 12 }}
      />
      <View style={gridStyles.grid}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBox
            key={i}
            width={POSTER_WIDTH}
            height={POSTER_WIDTH * 1.5}
            borderRadius={6}
          />
        ))}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});

// Skeleton pour les cartes de chaînes TV
const CHANNEL_CARD_WIDTH = SCREEN_WIDTH * 0.42;

export function ChannelRowSkeleton() {
  return (
    <View style={channelStyles.section}>
      <SkeletonBox
        width={120}
        height={18}
        borderRadius={4}
        style={{ marginLeft: 12, marginBottom: 10 }}
      />
      <View style={channelStyles.row}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={channelStyles.gameCardContainer}>
            <SkeletonBox width={120} height={120} borderRadius={16} />
            <SkeletonBox
              width={80}
              height={10}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
            <SkeletonBox
              width={60}
              height={8}
              borderRadius={4}
              style={{ marginTop: 4 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ChannelGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={channelStyles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={channelStyles.gameCardContainer}>
          <SkeletonBox width={120} height={120} borderRadius={16} />
          <SkeletonBox
            width={80}
            height={10}
            borderRadius={4}
            style={{ marginTop: 8 }}
          />
          <SkeletonBox
            width={60}
            height={8}
            borderRadius={4}
            style={{ marginTop: 4 }}
          />
        </View>
      ))}
    </View>
  );
}

const channelStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 10,
  },
  gameCardContainer: {
    alignItems: "center",
    width: 120,
  },
});

// Skeleton pour les items de liste (My List, Notifications)
export function ListItemSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={listStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={listStyles.row}>
          <SkeletonBox width={130} height={75} borderRadius={4} />
          <View style={listStyles.info}>
            <SkeletonBox width="80%" height={16} borderRadius={4} />
            <SkeletonBox
              width="50%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const listStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  info: {
    flex: 1,
  },
});

// Skeleton pour les items New & Hot (carte + texte)
export function NewItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={newStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={newStyles.item}>
          <View style={newStyles.card}>
            <SkeletonBox width="100%" height="100%" borderRadius={0} />
          </View>
          <View style={newStyles.info}>
            <SkeletonBox width={180} height={50} borderRadius={4} />
            <SkeletonBox
              width="60%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
            <SkeletonBox
              width="90%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 6 }}
            />
            <SkeletonBox
              width="70%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 6 }}
            />
            <View style={newStyles.buttons}>
              <SkeletonBox width={100} height={36} borderRadius={4} />
              <SkeletonBox width={100} height={36} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// Skeleton pour la liste Top 10
export function Top10Skeleton({ count = 10 }: { count?: number }) {
  return (
    <View style={top10Styles.container}>
      <SkeletonBox
        width={220}
        height={20}
        borderRadius={4}
        style={{ marginBottom: 16 }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={top10Styles.item}>
          <SkeletonBox width={40} height={50} borderRadius={4} />
          <SkeletonBox width={70} height={100} borderRadius={4} />
          <View style={top10Styles.info}>
            <SkeletonBox width="60%" height={16} borderRadius={4} />
            <SkeletonBox
              width="40%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const top10Styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  info: {
    flex: 1,
  },
});

const newStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  item: {
    marginBottom: 32,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ffffff36",
    borderRadius: 8,
    overflow: "hidden",
  },
  card: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  info: {
    padding: 12,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
});

// Skeleton pour la page de détail film
export function MovieDetailSkeleton() {
  return (
    <View style={detailStyles.container}>
      <SkeletonBox width="100%" height={250} borderRadius={0} />
      <View style={detailStyles.content}>
        <SkeletonBox width={200} height={24} borderRadius={4} />
        <View style={detailStyles.meta}>
          <SkeletonBox width={60} height={14} borderRadius={4} />
          <SkeletonBox width={40} height={14} borderRadius={4} />
          <SkeletonBox width={50} height={14} borderRadius={4} />
        </View>
        <SkeletonBox
          width="100%"
          height={40}
          borderRadius={4}
          style={{ marginTop: 16 }}
        />
        <SkeletonBox
          width="100%"
          height={14}
          borderRadius={4}
          style={{ marginTop: 16 }}
        />
        <SkeletonBox
          width="90%"
          height={14}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
        <SkeletonBox
          width="80%"
          height={14}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  content: {
    padding: 16,
  },
  meta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
});

// Skeleton pour la page Recherche — état par défaut (liste suggérés)
export function SearchDefaultSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View style={searchStyles.container}>
      <SkeletonBox
        width={200}
        height={18}
        borderRadius={4}
        style={{ marginBottom: 16, marginLeft: 16 }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={searchStyles.row}>
          <SkeletonBox width={130} height={73} borderRadius={4} />
          <View style={searchStyles.info}>
            <SkeletonBox width="75%" height={14} borderRadius={4} />
            <SkeletonBox
              width="45%"
              height={12}
              borderRadius={4}
              style={{ marginTop: 6 }}
            />
          </View>
          <SkeletonBox width={40} height={40} borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
});

// Skeleton pour la page Profil (rows de posters + récemment vus)
export function ProfileSkeleton() {
  return (
    <View style={{ paddingTop: 10 }}>
      <MovieRowSkeleton />
      <MovieRowSkeleton />
      <MovieRowSkeleton />
      {/* Section "Vue récemment" — cards horizontales 200x112 */}
      <View style={profileStyles.section}>
        <SkeletonBox
          width={160}
          height={18}
          borderRadius={4}
          style={{ marginLeft: 16, marginBottom: 10 }}
        />
        <View style={profileStyles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginRight: 10 }}>
              <SkeletonBox width={200} height={112} borderRadius={6} />
              <SkeletonBox
                width={140}
                height={12}
                borderRadius={4}
                style={{ marginTop: 6 }}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
});

// Skeleton complet pour Home/Films/Séries (Featured + rows)
export function HomeScreenSkeleton({ topMargin = 0 }: { topMargin?: number }) {
  return (
    <View style={{ paddingTop: 20 }}>
      <FeaturedSkeleton topMargin={topMargin} />
      <MovieRowSkeleton />
      <MovieRowSkeleton />
      <BigCardRowSkeleton />
      <MovieRowSkeleton />
    </View>
  );
}
