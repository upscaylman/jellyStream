import { CastIcon } from "@/icons/CastIcon";
import {
  useLatestMovies,
  useLatestSeries,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationStore } from "@/src/stores/notificationStore";
import { getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;
  const diffW = Math.floor(diffD / 7);
  return `il y a ${diffW}sem`;
}

interface NotificationItem {
  id: string;
  item: BaseItemDto;
  label: string;
  timeAgo: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const markAsSeen = useNotificationStore((s) => s.markAsSeen);

  // Marquer les notifications comme lues à l'ouverture
  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  const { data: latestMovies, isLoading: loadingMovies } = useLatestMovies(15);
  const { data: latestSeries, isLoading: loadingSeries } = useLatestSeries(15);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    (latestMovies ?? []).forEach((item) => {
      items.push({
        id: item.Id ?? "",
        item,
        label: "Nouveau film",
        timeAgo: formatTimeAgo(item.DateCreated),
      });
    });

    (latestSeries ?? []).forEach((item) => {
      const isCollection = item.Type === "BoxSet";
      items.push({
        id: item.Id ?? "",
        item,
        label: isCollection ? "Nouvelle collection" : "Nouvelle série",
        timeAgo: formatTimeAgo(item.DateCreated),
      });
    });

    // Trier par date décroissante
    items.sort((a, b) => {
      const da = a.item.DateCreated
        ? new Date(a.item.DateCreated).getTime()
        : 0;
      const db = b.item.DateCreated
        ? new Date(b.item.DateCreated).getTime()
        : 0;
      return db - da;
    });

    return items;
  }, [latestMovies, latestSeries]);

  const isLoading = loadingMovies || loadingSeries;

  const getItemImage = (item: BaseItemDto): string => {
    const tag = item.ImageTags?.["Backdrop"] ?? item.ImageTags?.["Primary"];
    if (!tag) return "";
    return getImageUrl({
      serverUrl,
      itemId: item.Id ?? "",
      imageType: item.ImageTags?.["Backdrop"]
        ? ("Backdrop" as never)
        : ("Primary" as never),
      maxWidth: 300,
      quality: 80,
      tag,
    });
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const imageUri = getItemImage(item.item);
    return (
      <TouchableOpacity
        style={styles.notificationRow}
        onPress={() => router.push(`/movie/${item.id}`)}
        activeOpacity={0.7}
      >
        {imageUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.notificationImage}
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.notificationImage, styles.placeholderImage]}>
            <Ionicons name="film-outline" size={20} color="#555" />
          </View>
        )}
        <View style={styles.notificationContent}>
          <Text style={styles.notificationLabel}>{item.label}</Text>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {item.item.Name ?? ""}
          </Text>
          {item.item.Overview ? (
            <Text style={styles.notificationSubtitle} numberOfLines={2}>
              {item.item.Overview}
            </Text>
          ) : null}
          <Text style={styles.notificationTime}>{item.timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.castButton}>
          <CastIcon size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>Aucune notification</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  castButton: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  notificationRow: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
  },
  notificationImage: {
    width: 120,
    height: 68,
    borderRadius: 4,
    backgroundColor: "#1a1a1a",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
    justifyContent: "center",
  },
  notificationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E50914",
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: "#999",
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: "#666",
  },
  separator: {
    height: 1,
    backgroundColor: "#1a1a1a",
  },
});
