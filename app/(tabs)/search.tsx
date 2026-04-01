import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import { useSearchItems, useTrending } from "@/src/api/queries/useMediaQueries";
import { computeBadge } from "@/src/hooks/useJellyfinHome";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationBadgeCount } from "@/src/stores/notificationStore";
import { getBackdropUrl, getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDebounce } from "use-debounce";

const { width } = Dimensions.get("window");
const POSTER_WIDTH = (width - 16 * 2 - 6 * 2) / 3;

function BadgeOverlay({ item }: { item: BaseItemDto }) {
  const badge = computeBadge(item);
  if (!badge) return null;
  return (
    <View style={searchBadgeStyles.container}>
      <View style={searchBadgeStyles.badge}>
        <Text style={searchBadgeStyles.text} numberOfLines={1}>
          {badge}
        </Text>
      </View>
    </View>
  );
}

export default function SearchTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchQuery, 300);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const insets = useSafeAreaInsets();
  const badgeCount = useNotificationBadgeCount();
  const openCast = useCastSheet();

  const { data: searchResults, isLoading: isSearching } =
    useSearchItems(debouncedSearchTerm);
  const { data: trendingItems } = useTrending(30);

  const isSearchActive = debouncedSearchTerm.length >= 1;
  const displayItems = isSearchActive ? searchResults : trendingItems;
  const isLoading = isSearchActive && isSearching;

  // Mode poster : 1-2 lettres, mode genre rows : 3+ lettres
  const isShortSearch =
    debouncedSearchTerm.length >= 1 && debouncedSearchTerm.length <= 2;
  const isFullSearch = debouncedSearchTerm.length >= 3;

  // Grouper les résultats par genre pour les recherches 3+
  const genreGroupedResults = useMemo(() => {
    if (!isFullSearch || !searchResults?.length) return [];
    const genreMap = new Map<string, BaseItemDto[]>();
    for (const item of searchResults) {
      for (const genre of item.Genres ?? []) {
        const list = genreMap.get(genre) ?? [];
        list.push(item);
        genreMap.set(genre, list);
      }
    }
    return [...genreMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
      .map(([genre, items]) => ({ genre, items }));
  }, [isFullSearch, searchResults]);

  const startVoiceSearch = () => {
    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };
      recognition.start();
    }
  };

  const getItemImage = (item: BaseItemDto, type: "poster" | "backdrop") => {
    if (type === "backdrop") {
      const backdropTag = item.BackdropImageTags?.[0];
      if (backdropTag) {
        return getBackdropUrl(serverUrl, item.Id ?? "", 400, 80, backdropTag);
      }
    }
    const primaryTag = item.ImageTags?.["Primary"];
    if (primaryTag) {
      return getImageUrl({
        serverUrl,
        itemId: item.Id ?? "",
        maxWidth: 300,
        quality: 90,
        tag: primaryTag,
      });
    }
    if (item.Id) {
      return getImageUrl({
        serverUrl,
        itemId: item.Id,
        maxWidth: 300,
        quality: 90,
      });
    }
    return "";
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Rechercher</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerIcon} onPress={openCast}>
              <CastIcon size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push("/downloads")}
            >
              <ExpoImage
                source={require("../../assets/images/replace-these/download-netflix-transparent.png")}
                style={{ width: 28, height: 28 }}
                cachePolicy="memory-disk"
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIcon, { position: "relative" }]}
              onPress={() => {
                router.push("/notifications");
              }}
            >
              <Ionicons name="notifications-outline" size={28} color="#fff" />
              {badgeCount > 0 && (
                <View
                  style={{
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
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Rechercher films, séries..."
            placeholderTextColor="#6b6b6b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ marginRight: 4 }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={startVoiceSearch}>
            <Ionicons name="mic-outline" size={22} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : isSearchActive && (!searchResults || searchResults.length === 0) ? (
        <View style={styles.noResults}>
          <Text style={styles.noResultsTitle}>Aucun résultat</Text>
          <Text style={styles.noResultsSubtitle}>
            Essayez de rechercher un autre film, série, acteur ou genre.
          </Text>
        </View>
      ) : isShortSearch && searchResults?.length ? (
        /* 1-2 lettres : grille de posters comme les titres similaires */
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 70 }}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résultats</Text>
            <View style={styles.posterGrid}>
              {searchResults.map((item) => {
                const tag = item.ImageTags?.["Primary"];
                const uri = item.Id
                  ? getImageUrl({
                      serverUrl,
                      itemId: item.Id,
                      maxWidth: 300,
                      quality: 80,
                      tag: tag ?? undefined,
                    })
                  : "";
                return (
                  <TouchableOpacity
                    key={item.Id}
                    style={styles.posterCard}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/movie/[id]",
                        params: { id: item.Id ?? "" },
                      })
                    }
                  >
                    {uri ? (
                      <ExpoImage
                        source={{ uri }}
                        style={styles.posterImage}
                        cachePolicy="memory-disk"
                        transition={200}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.posterImage,
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
                    <BadgeOverlay item={item} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : isFullSearch && searchResults?.length ? (
        /* 3+ lettres : meilleurs résultats + rows par genre */
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 70 }}
        >
          {/* Meilleurs résultats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meilleurs résultats</Text>
            <FlatList
              data={searchResults.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.Id ?? ""}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const tag = item.ImageTags?.["Primary"];
                const uri = item.Id
                  ? getImageUrl({
                      serverUrl,
                      itemId: item.Id,
                      maxWidth: 300,
                      quality: 80,
                      tag: tag ?? undefined,
                    })
                  : "";
                return (
                  <TouchableOpacity
                    style={styles.rowPoster}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/movie/[id]",
                        params: { id: item.Id ?? "" },
                      })
                    }
                  >
                    {uri ? (
                      <ExpoImage
                        source={{ uri }}
                        style={styles.rowPosterImage}
                        cachePolicy="memory-disk"
                        transition={200}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.rowPosterImage,
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
                    <BadgeOverlay item={item} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Rows par genre */}
          {genreGroupedResults.map(({ genre, items }) => (
            <View key={genre} style={styles.section}>
              <Text style={styles.sectionTitle}>{genre}</Text>
              <FlatList
                data={items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => `${genre}-${item.Id}`}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const tag = item.ImageTags?.["Primary"];
                  const uri = item.Id
                    ? getImageUrl({
                        serverUrl,
                        itemId: item.Id,
                        maxWidth: 300,
                        quality: 80,
                        tag: tag ?? undefined,
                      })
                    : "";
                  return (
                    <TouchableOpacity
                      style={styles.rowPoster}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/movie/[id]",
                          params: { id: item.Id ?? "" },
                        })
                      }
                    >
                      {uri ? (
                        <ExpoImage
                          source={{ uri }}
                          style={styles.rowPosterImage}
                          cachePolicy="memory-disk"
                          transition={200}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.rowPosterImage,
                            {
                              backgroundColor: "#2a2a2a",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Ionicons
                            name="film-outline"
                            size={20}
                            color="#555"
                          />
                        </View>
                      )}
                      <BadgeOverlay item={item} />
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Default : séries et films suggérés en liste */
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 70 }}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Séries et films suggérés</Text>
            <View style={styles.listContainer}>
              {(trendingItems ?? []).map((item) => {
                const imageUri = getItemImage(item, "backdrop");
                const year = item.ProductionYear?.toString() ?? "";
                const duration = item.RunTimeTicks
                  ? `${Math.round(item.RunTimeTicks / 600000000)}m`
                  : "";
                return (
                  <TouchableOpacity
                    key={item.Id}
                    style={styles.itemRow}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/movie/[id]",
                        params: { id: item.Id ?? "" },
                      })
                    }
                  >
                    <View style={styles.itemThumbContainer}>
                      {imageUri ? (
                        <ExpoImage
                          source={{ uri: imageUri }}
                          style={styles.itemThumb}
                          cachePolicy="memory-disk"
                          transition={200}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.itemThumb,
                            {
                              backgroundColor: "#2a2a2a",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Ionicons
                            name="film-outline"
                            size={24}
                            color="#555"
                          />
                        </View>
                      )}
                      <BadgeOverlay item={item} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.Name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {year}
                        {duration ? ` • ${duration}` : ""}
                      </Text>
                    </View>
                    <View style={styles.playButton}>
                      <Ionicons
                        name="play-circle-outline"
                        size={40}
                        color="white"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
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
  searchInputContainer: {
    height: 40,
    backgroundColor: "#323232",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    outlineStyle: "none",
  } as any,
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: 24,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  posterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 6,
  },
  posterCard: {
    width: POSTER_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: 6,
    marginBottom: 2,
    overflow: "hidden",
  },
  posterImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  rowPoster: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: 6,
    marginRight: 8,
    overflow: "hidden",
  },
  rowPosterImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  itemThumbContainer: {
    width: 130,
    aspectRatio: 16 / 9,
    borderRadius: 4,
    overflow: "hidden",
  },
  itemThumb: {
    width: "100%",
    height: "100%",
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemMeta: {
    color: "#808080",
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  noResults: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  noResultsTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  noResultsSubtitle: {
    color: "#6b6b6b",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 0.5,
  },
});

const searchBadgeStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#E50914",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  text: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});
