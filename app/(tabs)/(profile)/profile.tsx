import { TAB_SCREENS } from "@/app/(tabs)/_layout";
import { TabScreenWrapper } from "@/components/TabScreenWrapper";
import {
  useFavoriteItems,
  useResumeItems,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationBadgeCount } from "@/src/stores/notificationStore";
import { getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useScrollToTop } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function ProfileScreen() {
  const userName = useAuthStore((s) => s.userName);
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "U")}&background=E50914&color=fff&size=120`;
  const pathname = usePathname();
  const isActive = pathname === "/profile";
  const router = useRouter();
  const scrollViewRef = useRef(null);
  useScrollToTop(scrollViewRef);
  const insets = useSafeAreaInsets();
  const badgeCount = useNotificationBadgeCount();

  const { data: favorites, isLoading: isLoadingFav } = useFavoriteItems(20);
  const { data: resumeItems, isLoading: isLoadingResume } = useResumeItems(20);

  const currentTabIndex = TAB_SCREENS.findIndex(
    (screen) => screen.name === "profile",
  );
  const activeTabIndex = TAB_SCREENS.findIndex(
    (screen) =>
      pathname === `/${screen.name}` ||
      (screen.name === "index" && pathname === "/"),
  );

  const slideDirection = activeTabIndex > currentTabIndex ? "right" : "left";

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

  const getItemPoster = useCallback(
    (item: BaseItemDto) => {
      const tag = item.ImageTags?.["Primary"];
      if (tag) {
        return getImageUrl({
          serverUrl,
          itemId: item.Id ?? "",
          maxWidth: 200,
          quality: 80,
          tag,
        });
      }
      return "";
    },
    [serverUrl],
  );

  const renderMediaItem = useCallback(
    ({ item }: { item: BaseItemDto }) => {
      const uri = getItemPoster(item);
      return (
        <TouchableOpacity
          style={styles.likedItemContainer}
          onPress={() => router.push(`/movie/${item.Id}`)}
        >
          {uri ? (
            <ExpoImage
              source={{ uri }}
              style={styles.likedShowImage}
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.likedShowImage,
                {
                  backgroundColor: "#2a2a2a",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="film-outline" size={20} color="#555" />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [getItemPoster, router],
  );

  const renderFavorites = () => (
    <View style={styles.likedContent}>
      {isLoadingFav ? (
        <ActivityIndicator
          size="small"
          color="#E50914"
          style={{ padding: 20 }}
        />
      ) : (favorites?.length ?? 0) > 0 ? (
        <FlatList
          horizontal
          data={favorites}
          keyExtractor={(item) => item.Id ?? ""}
          renderItem={renderMediaItem}
          showsHorizontalScrollIndicator={false}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews={true}
        />
      ) : (
        <Text style={{ color: "#666", padding: 16 }}>
          Aucun favori pour le moment
        </Text>
      )}
    </View>
  );

  const renderResumeList = () => (
    <View style={styles.likedContent}>
      {isLoadingResume ? (
        <ActivityIndicator
          size="small"
          color="#E50914"
          style={{ padding: 20 }}
        />
      ) : (resumeItems?.length ?? 0) > 0 ? (
        <FlatList
          horizontal
          data={resumeItems}
          keyExtractor={(item) => item.Id ?? ""}
          renderItem={renderMediaItem}
          showsHorizontalScrollIndicator={false}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews={true}
        />
      ) : (
        <Text style={{ color: "#666", padding: 16 }}>
          Rien en cours de lecture
        </Text>
      )}
    </View>
  );

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
      <View style={styles.container}>
        <AnimatedBlurView
          tint="dark"
          style={[styles.headerBlur]}
          animatedProps={headerAnimatedProps}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Mon Profil</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => router.push("/search")}
              >
                <Ionicons name="search" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton}>
                <Ionicons name="menu" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedBlurView>
        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 50,
            paddingBottom: 100,
          }}
        >
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => router.push("/switch-profile")}
          >
            <ExpoImage
              source={{ uri: avatarUri }}
              style={styles.profileImage}
              cachePolicy="memory-disk"
            />
            <View style={styles.profileNameContainer}>
              <Text style={styles.profileName}>{userName}</Text>
              <Ionicons name="chevron-down" size={16} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/notifications")}
          >
            <View style={[styles.menuIconContainer, { position: "relative" }]}>
              <View
                style={[
                  styles.notificationIconContainer,
                  { backgroundColor: "#E51013" },
                ]}
              >
                <Ionicons name="notifications" size={24} color="#fff" />
              </View>
              {badgeCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    backgroundColor: "#E50914",
                    borderRadius: 9,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/downloads")}
          >
            <View style={styles.menuIconContainer}>
              <View
                style={[
                  styles.downloadIconContainer,
                  { backgroundColor: "#0071EB" },
                ]}
              >
                <Ionicons name="download-outline" size={24} color="#fff" />
              </View>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Téléchargements</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Mes Favoris</Text>
            {renderFavorites()}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeader}>En cours de lecture</Text>
            </View>
            {renderResumeList()}
          </View>
        </Animated.ScrollView>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  searchButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconContainer: {
    // marginBottom: 8,
  },
  profileNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  menuText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
  },
  notificationPreview: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#E51013",
    position: "absolute",
    left: 8,
    top: 40,
  },
  notificationImage: {
    width: 120,
    height: 70,
    borderRadius: 4,
    marginLeft: 12,
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#999",
  },
  notificationDate: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  menuButton: {
    padding: 8,
  },
  likedContent: {
    marginTop: 12,
  },
  likedItemContainer: {
    marginRight: 10,
    width: 110,
    backgroundColor: "#161616",
    alignItems: "center",
    borderRadius: 8,
  },
  likedShowImage: {
    width: 110,
    height: 150,
    borderRadius: 8,
    // borderBottomLeftRadius: 0,
    // borderBottomRightRadius: 0,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  shareText: {
    color: "white",
    fontSize: 13,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAll: {
    color: "white",
    fontSize: 14,
  },
  myList: {
    marginTop: 12,
  },
  myListImage: {
    width: 120,
    height: 180,
    borderRadius: 4,
    marginRight: 8,
  },
  headerBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
