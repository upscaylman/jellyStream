import { TAB_SCREENS } from "@/app/(tabs)/_layout";
import { TabScreenWrapper } from "@/components/TabScreenWrapper";
import {
  useNewlyAdded,
  useTop10Movies,
  useTop10Series,
  useTrending,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getImageUrl } from "@/src/utils/imageUrl";
import { newStyles } from "@/styles/new";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useScrollToTop } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Extraire l'ID YouTube d'une URL
function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

// Preview YouTube avec bouton mute/unmute
function YouTubePreview({
  ytId,
  fallbackUri,
}: {
  ytId: string;
  fallbackUri?: string;
}) {
  const [muted, setMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const origin = Platform.OS === "web" ? window.location.origin : "";

  return (
    <View style={{ width: "100%", height: "100%" } as any}>
      {fallbackUri && (
        <ExpoImage
          source={{ uri: fallbackUri }}
          style={
            [
              newStyles.previewImage,
              { position: "absolute", top: 0, left: 0, zIndex: 0 },
            ] as any
          }
          cachePolicy="memory-disk"
        />
      )}
      <iframe
        ref={(el: HTMLIFrameElement | null) => {
          iframeRef.current = el;
        }}
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&origin=${origin}`}
        style={
          {
            width: "100%",
            height: "100%",
            border: "none",
            position: "relative",
            zIndex: 1,
          } as any
        }
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
      <Pressable
        style={
          {
            position: "absolute",
            bottom: 10,
            right: 10,
            zIndex: 2,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 20,
            width: 32,
            height: 32,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.3)",
          } as any
        }
        onPress={() => {
          const next = !muted;
          setMuted(next);
          if (iframeRef.current?.contentWindow) {
            const cmd = next ? "mute" : "unMute";
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: cmd, args: [] }),
              "*",
            );
          }
        }}
      >
        <Ionicons
          name={muted ? "volume-mute" : "volume-medium"}
          size={16}
          color="white"
        />
      </Pressable>
    </View>
  );
}

const TAB_OPTIONS = [
  { id: "newly-added", label: "Nouveautés", emoji: "🍿" },
  { id: "trending", label: "Les plus regardés", emoji: "🔥" },
  { id: "top10-tv", label: "Top 10 séries", emoji: "🔟" },
  { id: "top10-movies", label: "Top 10 films", emoji: "🔟" },
];

export default function NewScreen() {
  const pathname = usePathname();
  const isActive = pathname === "/new";
  const currentTabIndex = TAB_SCREENS.findIndex(
    (screen) => screen.name === "new",
  );
  const activeTabIndex = TAB_SCREENS.findIndex(
    (screen) =>
      pathname === `/${screen.name}` ||
      (screen.name === "index" && pathname === "/"),
  );
  const slideDirection = activeTabIndex > currentTabIndex ? "right" : "left";

  const router = useRouter();
  const scrollY = useSharedValue(0);
  const [activeTab, setActiveTab] = useState("newly-added");
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";

  const { data: newlyAdded, isLoading: isLoadingNew } = useNewlyAdded(30);
  const { data: trending, isLoading: isLoadingTrending } = useTrending(30);
  const { data: top10Series, isLoading: isLoadingTop10Tv } = useTop10Series();
  const { data: top10Movies, isLoading: isLoadingTop10Movies } =
    useTop10Movies();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollViewRef = useRef(null);
  useScrollToTop(scrollViewRef);

  const displayItems =
    activeTab === "newly-added"
      ? newlyAdded
      : activeTab === "trending"
        ? trending
        : activeTab === "top10-tv"
          ? top10Series
          : top10Movies;
  const isLoading =
    activeTab === "newly-added"
      ? isLoadingNew
      : activeTab === "trending"
        ? isLoadingTrending
        : activeTab === "top10-tv"
          ? isLoadingTop10Tv
          : isLoadingTop10Movies;
  const isTop10 = activeTab === "top10-tv" || activeTab === "top10-movies";

  const getItemBackdrop = (item: BaseItemDto) => {
    const backdropTag = item.BackdropImageTags?.[0];
    if (backdropTag) {
      return getBackdropUrl(serverUrl, item.Id ?? "", 800, 80, backdropTag);
    }
    const primaryTag = item.ImageTags?.["Primary"];
    if (primaryTag) {
      return getImageUrl({
        serverUrl,
        itemId: item.Id ?? "",
        maxWidth: 800,
        quality: 80,
        tag: primaryTag,
      });
    }
    // Fallback sans tag — Jellyfin peut quand même servir l'image s'il en existe une
    if (item.Id) {
      return getBackdropUrl(serverUrl, item.Id, 800, 80);
    }
    return "";
  };

  const renderItem = (item: BaseItemDto) => {
    const imageUri = getItemBackdrop(item);
    const year = item.PremiereDate
      ? new Date(item.PremiereDate).getFullYear().toString()
      : (item.ProductionYear?.toString() ?? "");
    const genres = item.Genres?.slice(0, 3).join(" • ") ?? "";

    return (
      <Pressable
        key={item.Id}
        style={newStyles.comingSoonItem}
        onPress={() => router.push(`/movie/${item.Id}`)}
      >
        <View style={newStyles.contentContainer}>
          <View style={newStyles.previewCard}>
            {item.OfficialRating && (
              <View style={newStyles.ratedContainer}>
                <Text style={newStyles.rated}>{item.OfficialRating}</Text>
              </View>
            )}
            {(() => {
              const ytId = extractYouTubeId(item.RemoteTrailers?.[0]?.Url);
              if (ytId && Platform.OS === "web") {
                return <YouTubePreview ytId={ytId} fallbackUri={imageUri} />;
              }
              if (imageUri) {
                return (
                  <ExpoImage
                    source={{ uri: imageUri }}
                    style={newStyles.previewImage}
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                );
              }
              return (
                <View
                  style={[
                    newStyles.previewImage,
                    {
                      backgroundColor: "#1a1a2e",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="film-outline" size={32} color="#555" />
                </View>
              );
            })()}
          </View>

          <View style={newStyles.titleContainer}>
            <Text style={newStyles.title} numberOfLines={2}>
              {item.Name}
            </Text>
            {year ? (
              <Text style={newStyles.eventDate}>
                {year}
                {genres ? ` • ${genres}` : ""}
              </Text>
            ) : null}
            {item.Overview ? (
              <Text style={newStyles.description} numberOfLines={3}>
                {item.Overview}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderTop10Item = (item: BaseItemDto, index: number) => {
    const posterTag = item.ImageTags?.["Primary"];
    const posterUri = posterTag
      ? getImageUrl({
          serverUrl,
          itemId: item.Id ?? "",
          maxWidth: 300,
          quality: 80,
          tag: posterTag,
        })
      : "";
    const rank = index + 1;

    return (
      <Pressable
        key={item.Id}
        style={newStyles.top10Item}
        onPress={() => router.push(`/movie/${item.Id}`)}
      >
        <View style={newStyles.top10RankContainer}>
          <Text
            style={[
              newStyles.top10Rank,
              rank >= 10 && newStyles.top10RankSmall,
            ]}
          >
            {rank}
          </Text>
        </View>
        <View style={newStyles.top10PosterContainer}>
          {posterUri ? (
            <ExpoImage
              source={{ uri: posterUri }}
              style={newStyles.top10Poster}
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View
              style={[
                newStyles.top10Poster,
                {
                  backgroundColor: "#1a1a2e",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="film-outline" size={28} color="#555" />
            </View>
          )}
        </View>
        <View style={newStyles.top10Info}>
          <Text style={newStyles.top10Title} numberOfLines={2}>
            {item.Name}
          </Text>
          <Text style={newStyles.top10Meta} numberOfLines={1}>
            {item.ProductionYear ?? ""}
            {item.Genres?.length
              ? ` • ${item.Genres.slice(0, 2).join(", ")}`
              : ""}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderTab = (tab: (typeof TAB_OPTIONS)[0]) => (
    <Pressable
      key={tab.id}
      style={[
        newStyles.categoryTab,
        activeTab === tab.id && newStyles.activeTab,
      ]}
      onPress={() => setActiveTab(tab.id)}
    >
      <Text style={{ fontSize: 16, marginRight: 6 }}>{tab.emoji}</Text>
      <Text
        style={[
          newStyles.categoryTabText,
          activeTab === tab.id && newStyles.activeTabText,
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
      <View style={newStyles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[newStyles.header]}>
            <View style={newStyles.headerContent}>
              <Text style={newStyles.headerTitle}>Nouveautés</Text>
              <View style={newStyles.headerRight}>
                <Pressable onPress={() => router.push("/search")}>
                  <Ionicons name="search" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={newStyles.categoryTabs}
            >
              {TAB_OPTIONS.map(renderTab)}
            </ScrollView>
          </View>

          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : (
            <Animated.ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingBottom: 90 }}
            >
              {isTop10 ? (
                <View style={newStyles.top10List}>
                  <View style={newStyles.top10Header}>
                    <Ionicons
                      name={
                        activeTab === "top10-tv" ? "tv-outline" : "film-outline"
                      }
                      size={20}
                      color="#E50914"
                    />
                    <Text style={newStyles.top10HeaderTitle}>
                      {activeTab === "top10-tv"
                        ? "Top 10 des séries aujourd'hui"
                        : "Top 10 des films aujourd'hui"}
                    </Text>
                  </View>
                  {(displayItems ?? []).map((item, index) =>
                    renderTop10Item(item, index),
                  )}
                </View>
              ) : (
                <View style={newStyles.comingSoonList}>
                  {(displayItems ?? []).map(renderItem)}
                </View>
              )}
            </Animated.ScrollView>
          )}
        </SafeAreaView>
      </View>
    </TabScreenWrapper>
  );
}
