import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import {
  useLatestMovies,
  useLatestSeries,
} from "@/src/api/queries/useMediaQueries";
import { useActiveSessions } from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationStore } from "@/src/stores/notificationStore";
import { getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import {
  BaseItemDto,
  SessionInfoDto,
} from "@jellyfin/sdk/lib/generated-client/models";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  const openCast = useCastSheet();
  const markAsSeen = useNotificationStore((s) => s.markAsSeen);
  const [activeTab, setActiveTab] = useState<"notifications" | "activity">(
    "notifications",
  );

  // Marquer les notifications comme lues à l'ouverture
  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  const { data: latestMovies, isLoading: loadingMovies } = useLatestMovies(15);
  const { data: latestSeries, isLoading: loadingSeries } = useLatestSeries(15);
  const { data: sessions, isLoading: loadingSessions } = useActiveSessions();

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
        onPress={() => router.push(`/(tabs)/movie/${item.id}`)}
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

  // Sessions actives (filtrer celles qui regardent du contenu)
  const activeSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s: SessionInfoDto) => s.NowPlayingItem != null);
  }, [sessions]);

  const renderSession = (session: SessionInfoDto) => {
    const nowPlaying = session.NowPlayingItem;
    const progress = session.PlayState?.PositionTicks
      ? Math.round(
          (session.PlayState.PositionTicks / (nowPlaying?.RunTimeTicks ?? 1)) *
            100,
        )
      : 0;
    return (
      <View key={session.Id} style={styles.sessionRow}>
        <View style={styles.sessionIcon}>
          <Ionicons
            name={
              session.Client?.toLowerCase().includes("web")
                ? "globe-outline"
                : session.Client?.toLowerCase().includes("android")
                  ? "phone-portrait-outline"
                  : "tv-outline"
            }
            size={24}
            color="#E50914"
          />
        </View>
        <View style={styles.sessionContent}>
          <Text style={styles.sessionUser}>
            {session.UserName ?? "Inconnu"}
          </Text>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {nowPlaying?.Name ?? "—"}
            {nowPlaying?.SeriesName ? ` · ${nowPlaying.SeriesName}` : ""}
          </Text>
          <Text style={styles.sessionDevice} numberOfLines={1}>
            {[session.Client, session.DeviceName].filter(Boolean).join(" · ")}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>
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
        <TouchableOpacity style={styles.castButton} onPress={openCast}>
          <CastIcon size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "notifications" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("notifications")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "notifications" && styles.tabTextActive,
            ]}
          >
            Nouveautés
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "activity" && styles.tabActive]}
          onPress={() => setActiveTab("activity")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "activity" && styles.tabTextActive,
            ]}
          >
            Activité
          </Text>
          {activeSessions.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeSessions.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === "notifications" ? (
        isLoading ? (
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
        )
      ) : loadingSessions ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : activeSessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>Aucune session active</Text>
          <Text style={styles.emptySubtext}>
            Personne ne regarde en ce moment
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeSessions}
          keyExtractor={(item: SessionInfoDto) => item.Id ?? ""}
          renderItem={({ item }: { item: SessionInfoDto }) =>
            renderSession(item)
          }
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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#000",
  },
  badge: {
    backgroundColor: "#E50914",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  emptySubtext: {
    color: "#444",
    fontSize: 13,
  },
  sessionRow: {
    flexDirection: "row",
    paddingVertical: 14,
    gap: 12,
    alignItems: "center",
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  sessionContent: {
    flex: 1,
  },
  sessionUser: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ccc",
    marginBottom: 2,
  },
  sessionDevice: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#333",
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: "#E50914",
    borderRadius: 2,
  },
});
