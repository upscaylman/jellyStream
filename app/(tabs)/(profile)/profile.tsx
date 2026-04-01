import { MovieList } from "@/components/MovieList/MovieList";
import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import {
  useFavoriteItems,
  useLikedItems,
  useRecentlyPlayed,
  useResumeItems,
} from "@/src/api/queries/useMediaQueries";
import { computeBadge, toMovie } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationBadgeCount } from "@/src/stores/notificationStore";
import { getBackdropUrl, getImageUrl, getLogoUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useScrollToTop } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function ProfileScreen() {
  const userName = useAuthStore((s) => s.userName);
  const userId = useAuthStore((s) => s.userId);
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  const jellyfinAvatar =
    serverUrl && userId
      ? `${serverUrl.replace(/\/+$/, "")}/Users/${userId}/Images/Primary?maxWidth=120&quality=90${avatarVersion ? `&_r=${avatarVersion}` : ""}`
      : null;
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "U")}&background=E50914&color=fff&size=120`;
  const avatarUri = jellyfinAvatar ?? fallbackAvatar;
  const router = useRouter();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const insets = useSafeAreaInsets();
  const badgeCount = useNotificationBadgeCount();
  const openCast = useCastSheet();

  // Scroll animation (même pattern que Home)
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

  const headerAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(scrollY.value, [0, 90], [0, 85], "clamp"),
  }));

  const blurOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 90], [0, 1], "clamp"),
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const { data: likedItems, error: likedErr } = useLikedItems(20);
  const { data: favorites } = useFavoriteItems(20);
  const { data: resumeItems } = useResumeItems(20);
  const { data: recentlyPlayed, error: recentErr } = useRecentlyPlayed(20);

  if (__DEV__) {
    if (likedErr) console.warn("[Profile] likedItems error:", likedErr);
    if (recentErr) console.warn("[Profile] recentlyPlayed error:", recentErr);
    console.log(
      "[Profile] likedItems:",
      likedItems?.length,
      "recentlyPlayed:",
      recentlyPlayed?.length,
    );
  }

  // Badge map : propager les badges entre toutes les sources du profil
  const badgeMap = useMemo(() => {
    const map = new Map<string, string>();
    const allItems = [
      ...(likedItems ?? []),
      ...(favorites ?? []),
      ...(resumeItems ?? []),
      ...(recentlyPlayed ?? []),
    ];
    for (const item of allItems) {
      const badge = computeBadge(item);
      if (badge && item.Id) {
        map.set(item.Id, badge);
      }
    }
    return map;
  }, [likedItems, favorites, resumeItems, recentlyPlayed]);

  const likedRow = (likedItems ?? []).map((item) =>
    toMovie(item, serverUrl, badgeMap),
  );
  const favoritesRow = (favorites ?? []).map((item) =>
    toMovie(item, serverUrl, badgeMap),
  );
  const resumeRow = (resumeItems ?? []).map((item) =>
    toMovie(item, serverUrl, badgeMap),
  );

  const getBackdrop = useCallback(
    (item: BaseItemDto) => {
      const backdropTag = item.BackdropImageTags?.[0];
      if (backdropTag) {
        return getBackdropUrl(serverUrl, item.Id ?? "", 600, 80, backdropTag);
      }
      const primaryTag = item.ImageTags?.["Primary"];
      if (primaryTag) {
        return getImageUrl({
          serverUrl,
          itemId: item.Id ?? "",
          maxWidth: 400,
          quality: 80,
          tag: primaryTag,
        });
      }
      return "";
    },
    [serverUrl],
  );

  const getLogoUri = useCallback(
    (item: BaseItemDto) => {
      const logoTag = item.ImageTags?.["Logo"];
      if (logoTag) {
        return getLogoUrl(serverUrl, item.Id ?? "", 300, 90, logoTag);
      }
      return "";
    },
    [serverUrl],
  );

  const renderRecentItem = useCallback(
    ({ item }: { item: BaseItemDto }) => {
      const uri = getBackdrop(item);
      const logoUri = getLogoUri(item);
      return (
        <TouchableOpacity
          style={styles.recentItem}
          onPress={() => router.push(`/(tabs)/movie/${item.Id}`)}
        >
          <View style={styles.recentImageWrapper}>
            {uri ? (
              <ExpoImage
                source={{ uri }}
                style={styles.recentImage}
                cachePolicy="memory-disk"
                transition={200}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.recentImage,
                  {
                    backgroundColor: "#2a2a2a",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Ionicons name="film-outline" size={24} color="#555" />
              </View>
            )}
            {logoUri ? (
              <View style={styles.logoOverlay}>
                <ExpoImage
                  source={{ uri: logoUri }}
                  style={styles.logoImage}
                  cachePolicy="memory-disk"
                  contentFit="contain"
                />
              </View>
            ) : null}
          </View>
          <View style={styles.recentTitleContainer}>
            <Text style={styles.recentTitle} numberOfLines={1}>
              {item.Name}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [getBackdrop, getLogoUri, router],
  );

  return (
    <View style={styles.container}>
      {/* Header animé — même style que Home */}
      <Animated.View style={styles.header}>
        <Animated.View
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            blurOpacityStyle,
          ]}
        >
          <AnimatedBlurView
            tint="systemThickMaterialDark"
            style={{ width: "100%", height: "100%" }}
            animatedProps={headerAnimatedProps}
          />
        </Animated.View>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <Animated.View style={[styles.headerRow, headerTitleStyle]}>
            <Pressable
              style={styles.headerLeft}
              onPress={() => router.push("/switch-profile")}
            >
              <ExpoImage
                source={{ uri: avatarUri }}
                placeholder={{ uri: fallbackAvatar }}
                style={styles.headerAvatar}
                cachePolicy="memory-disk"
                contentFit="cover"
              />
              <Text style={styles.headerTitle}>{userName}</Text>
              <Ionicons name="chevron-down" size={18} color="#fff" />
            </Pressable>
            <View style={styles.headerButtons}>
              <Pressable style={styles.headerIcon} onPress={openCast}>
                <CastIcon size={28} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.headerIcon}
                onPress={() => router.push("/downloads")}
              >
                <ExpoImage
                  source={require("../../../assets/images/replace-these/download-netflix-transparent.png")}
                  style={{ width: 28, height: 28 }}
                  cachePolicy="memory-disk"
                  contentFit="contain"
                />
              </Pressable>
              <Pressable
                style={[styles.headerIcon, { position: "relative" }]}
                onPress={() => router.push("/notifications")}
              >
                <Ionicons name="notifications-outline" size={28} color="#fff" />
                {badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Contenu scrollable */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: 100,
        }}
      >
        {/* Séries et films que vous avez aimés */}
        {likedRow.length > 0 && (
          <MovieList
            rowTitle="Séries et films que vous avez aimés"
            movies={likedRow}
          />
        )}

        {/* Ma liste */}
        {favoritesRow.length > 0 && (
          <MovieList
            rowTitle="Ma liste"
            movies={favoritesRow}
            showAll
            showAllRoute="/my-list"
          />
        )}

        {/* Reprendre la lecture */}
        {resumeRow.length > 0 && (
          <MovieList rowTitle="Reprendre la lecture" movies={resumeRow} />
        )}

        {/* Vue récemment */}
        {(recentlyPlayed?.length ?? 0) > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Vue récemment</Text>
            <FlatList
              horizontal
              data={recentlyPlayed}
              keyExtractor={(item) => item.Id ?? ""}
              renderItem={renderRecentItem}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    // Conteneur intérieur du header
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 4,
  },
  headerIcon: {
    padding: 8,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#E50914",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  recentSection: {
    marginTop: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 16,
  },
  recentItem: {
    marginRight: 10,
    width: 200,
  },
  recentImageWrapper: {
    position: "relative",
    width: 200,
    height: 112,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: "hidden",
  },
  recentImage: {
    width: 200,
    height: 112,
  },
  logoOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  recentTitleContainer: {
    backgroundColor: "#1a1a1a",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  recentTitle: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "bold",
  },
});
