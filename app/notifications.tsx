import { ListItemSkeleton, useSmoothLoading } from "@/components/ui/Skeleton";
import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import {
  useLatestMovies,
  useLatestSeries,
} from "@/src/api/queries/useMediaQueries";
import {
  useActiveSessions,
  useActivityLog,
} from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationStore } from "@/src/stores/notificationStore";
import { getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityLogEntry,
  BaseItemDto,
  SessionInfoDto,
} from "@jellyfin/sdk/lib/generated-client/models";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
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
  const [activeTab, setActiveTab] = useState<
    "notifications" | "activity" | "server"
  >("notifications");

  // Marquer les notifications comme lues à l'ouverture
  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  const { data: latestMovies, isLoading: loadingMovies } = useLatestMovies(15);
  const { data: latestSeries, isLoading: loadingSeries } = useLatestSeries(15);
  const { data: sessions, isLoading: loadingSessions } = useActiveSessions();
  const { data: activityLog, isLoading: loadingLog } = useActivityLog(40);

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

  const showNotifSkeleton = useSmoothLoading(!!(latestMovies || latestSeries));
  const showActivitySkeleton = useSmoothLoading(!!sessions);
  const showServerSkeleton = useSmoothLoading(!!activityLog);

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

  // Icône et couleur par type d'activité serveur
  const getLogIcon = (
    type?: string,
  ): { icon: string; color: string; bg: string } => {
    const t = (type ?? "").toLowerCase();
    if (t.includes("authentication") || t.includes("login"))
      return { icon: "key-outline", color: "#4CAF50", bg: "#1b3a1b" };
    if (t.includes("failed") || t.includes("error"))
      return { icon: "alert-circle-outline", color: "#F44336", bg: "#3a1b1b" };
    if (t.includes("playback") || t.includes("video"))
      return { icon: "play-circle-outline", color: "#2196F3", bg: "#1b2a3a" };
    if (t.includes("user"))
      return { icon: "person-outline", color: "#9C27B0", bg: "#2a1b3a" };
    if (t.includes("library") || t.includes("scan"))
      return { icon: "library-outline", color: "#FF9800", bg: "#3a2a1b" };
    if (t.includes("plugin") || t.includes("package"))
      return {
        icon: "extension-puzzle-outline",
        color: "#00BCD4",
        bg: "#1b3a3a",
      };
    if (t.includes("update") || t.includes("install"))
      return { icon: "download-outline", color: "#8BC34A", bg: "#2a3a1b" };
    if (t.includes("task") || t.includes("scheduled"))
      return { icon: "timer-outline", color: "#FFC107", bg: "#3a3a1b" };
    if (t.includes("subtitle"))
      return { icon: "text-outline", color: "#E91E63", bg: "#3a1b2a" };
    if (t.includes("session"))
      return { icon: "laptop-outline", color: "#607D8B", bg: "#1b2a2a" };
    return { icon: "server-outline", color: "#9E9E9E", bg: "#2a2a2a" };
  };

  const renderLogEntry = ({ item }: { item: ActivityLogEntry }) => {
    const { icon, color, bg } = getLogIcon(item.Type);
    return (
      <View style={styles.notificationRow}>
        <View style={[styles.logIconContainer, { backgroundColor: bg }]}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={color}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationLabel, { color }]}>
            {item.Type?.replace(/([A-Z])/g, " $1").trim() ?? "Événement"}
          </Text>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {item.Name ?? "—"}
          </Text>
          {item.ShortOverview ? (
            <Text style={styles.notificationSubtitle} numberOfLines={2}>
              {item.ShortOverview}
            </Text>
          ) : null}
          <Text style={styles.notificationTime}>
            {formatTimeAgo(item.Date)}
          </Text>
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
        <TouchableOpacity
          style={[styles.tab, activeTab === "server" && styles.tabActive]}
          onPress={() => setActiveTab("server")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "server" && styles.tabTextActive,
            ]}
          >
            Serveur
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "notifications" ? (
          notifications.length === 0 && !isLoading ? (
            <View style={styles.center}>
              <Ionicons
                name="notifications-off-outline"
                size={60}
                color="#444"
              />
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          ) : notifications.length > 0 ? (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : null
        ) : activeTab === "activity" ? (
          activeSessions.length === 0 && !loadingSessions ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={60} color="#444" />
              <Text style={styles.emptyText}>Aucune session active</Text>
              <Text style={styles.emptySubtext}>
                Personne ne regarde en ce moment
              </Text>
            </View>
          ) : activeSessions.length > 0 ? (
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
          ) : null
        ) : !activityLog || activityLog.length === 0 ? (
          !loadingLog ? (
            <View style={styles.center}>
              <Ionicons name="server-outline" size={60} color="#444" />
              <Text style={styles.emptyText}>Aucun événement serveur</Text>
            </View>
          ) : null
        ) : (
          <FlatList
            data={activityLog}
            keyExtractor={(item: ActivityLogEntry) =>
              String(item.Id ?? Math.random())
            }
            renderItem={renderLogEntry}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Skeleton overlay par onglet */}
        {activeTab === "notifications" && showNotifSkeleton && (
          <View style={styles.skeletonOverlay}>
            <ListItemSkeleton count={8} />
          </View>
        )}
        {activeTab === "activity" && showActivitySkeleton && (
          <View style={styles.skeletonOverlay}>
            <ListItemSkeleton count={4} />
          </View>
        )}
        {activeTab === "server" && showServerSkeleton && (
          <View style={styles.skeletonOverlay}>
            <ListItemSkeleton count={10} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 2,
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
  logIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
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
