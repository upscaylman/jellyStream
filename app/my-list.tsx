import {
  useFavoriteItems,
  useToggleFavorite,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAIN_TABS = [{ id: "all", label: "Séries et films" }] as const;

const FILTER_TABS = [
  { id: "not-started", label: "Pas commencé" },
  { id: "started", label: "Commencé" },
  { id: "series", label: "Séries" },
  { id: "movies", label: "Films" },
] as const;

type MainTab = (typeof MAIN_TABS)[number]["id"];
type FilterTab = (typeof FILTER_TABS)[number]["id"] | null;

const EDIT_RED = "rgb(251, 51, 51)";

export default function MyListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const { data: favorites, isLoading } = useFavoriteItems(100);

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("all");
  const [activeFilter, setActiveFilter] = useState<FilterTab>(null);
  const [isEditing, setIsEditing] = useState(false);
  const toggleFavorite = useToggleFavorite();

  // Filtrer les favoris
  const filteredItems = useMemo(() => {
    if (!favorites) return [];
    let items = [...favorites];

    if (activeFilter === "not-started") {
      items = items.filter((item) => {
        const played = item.UserData?.PlayedPercentage ?? 0;
        return played === 0 && !item.UserData?.Played;
      });
    } else if (activeFilter === "started") {
      items = items.filter((item) => {
        const played = item.UserData?.PlayedPercentage ?? 0;
        return played > 0 && !item.UserData?.Played;
      });
    } else if (activeFilter === "series") {
      items = items.filter((item) => item.Type === "Series");
    } else if (activeFilter === "movies") {
      items = items.filter((item) => item.Type === "Movie");
    }

    return items;
  }, [favorites, activeFilter]);

  const getItemImage = useCallback(
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
          maxWidth: 600,
          quality: 80,
          tag: primaryTag,
        });
      }
      if (item.Id) {
        return getBackdropUrl(serverUrl, item.Id, 600, 80);
      }
      return "";
    },
    [serverUrl],
  );

  const renderItem = useCallback(
    ({ item }: { item: BaseItemDto }) => {
      const imageUri = getItemImage(item);
      const year = item.ProductionYear?.toString() ?? "";
      const duration = item.RunTimeTicks
        ? `${Math.round(item.RunTimeTicks / 600000000)}m`
        : "";

      return (
        <Pressable
          style={s.itemRow}
          onPress={() => router.push(`/movie/${item.Id}`)}
        >
          <View style={s.itemThumbContainer}>
            {imageUri ? (
              <ExpoImage
                source={{ uri: imageUri }}
                style={s.itemThumb}
                cachePolicy="memory-disk"
                transition={200}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  s.itemThumb,
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
          </View>
          <View style={s.itemInfo}>
            <Text style={s.itemTitle} numberOfLines={2}>
              {item.Name}
            </Text>
            <Text style={s.itemMeta}>
              {year}
              {duration ? ` • ${duration}` : ""}
            </Text>
          </View>
          <Pressable
            style={s.playButton}
            onPress={() => {
              if (isEditing && item.Id) {
                toggleFavorite.mutate({ itemId: item.Id, isFavorite: true });
              } else if (item.Id) {
                router.push({
                  pathname: "/player",
                  params: { itemId: item.Id, title: item.Name ?? "" },
                });
              }
            }}
          >
            <Ionicons
              name={isEditing ? "trash-outline" : "play-circle-outline"}
              size={isEditing ? 28 : 40}
              color={isEditing ? EDIT_RED : "white"}
            />
          </Pressable>
        </Pressable>
      );
    },
    [getItemImage, router, isEditing, toggleFavorite],
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[s.header, isEditing && s.headerEditing]}>
        <Pressable
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={s.backButton}
        >
          <Ionicons
            name={isEditing ? "close" : "arrow-back"}
            size={24}
            color={isEditing ? "#141414" : "white"}
          />
        </Pressable>
        <Text style={[s.headerTitle, isEditing && s.headerTitleEditing]}>
          {isEditing ? "Modifier" : "Ma liste"}
        </Text>
        {!isEditing && (
          <Pressable style={s.editButton} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={22} color="white" />
          </Pressable>
        )}
      </View>

      {/* Séparateur + onglet principal avec trait rouge */}
      <View style={s.mainTabBar}>
        <View style={s.tabSeparator} />
        {MAIN_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[
              s.mainTabItem,
              activeMainTab === tab.id && s.mainTabItemActive,
            ]}
            onPress={() => setActiveMainTab(tab.id)}
          >
            <Text
              style={[
                s.mainTabText,
                activeMainTab === tab.id && s.mainTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sous-filtres pills */}
      <View style={s.filterTabs}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[
              s.filterPill,
              activeFilter === tab.id && s.filterPillActive,
            ]}
            onPress={() =>
              setActiveFilter(activeFilter === tab.id ? null : tab.id)
            }
          >
            <Text
              style={[
                s.filterPillText,
                activeFilter === tab.id && s.filterPillTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Trier par */}
      <View style={s.sortRow}>
        <View style={s.sortTextCol}>
          <Text style={s.sortLabel}>Trier par</Text>
          <Pressable style={s.sortButton}>
            <Text style={s.sortValue}>Titres suggérés</Text>
            <Ionicons name="swap-vertical" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Liste */}
      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.Id ?? ""}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
  },
  headerEditing: {
    backgroundColor: EDIT_RED,
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
  headerTitleEditing: {
    color: "#141414",
  },
  editButton: {
    padding: 4,
  },
  // Onglet principal avec trait rouge
  mainTabBar: {
    flexDirection: "row",
    position: "relative",
    paddingHorizontal: 16,
  },
  tabSeparator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(51,51,51,1)",
  },
  mainTabItem: {
    paddingVertical: 12,
    marginRight: 24,
    borderTopWidth: 4,
    borderTopColor: "transparent",
  },
  mainTabItemActive: {
    borderTopColor: "#db0000",
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#808080",
  },
  mainTabTextActive: {
    color: "#fff",
  },
  // Sous-filtres pills (style New & Hot)
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ffffff63",
  },
  filterPillActive: {
    backgroundColor: "#fff",
  },
  filterPillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#000",
  },
  // Trier par
  sortRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortTextCol: {
    flexDirection: "column",
  },
  sortLabel: {
    color: "#808080",
    fontSize: 12,
    marginBottom: 2,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Liste items
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
});
