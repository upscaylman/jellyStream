import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useScrollToTop } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import {
  useFavoriteChannels,
  useLiveTvChannels,
} from "@/src/api/queries/useLiveTvQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getImageUrl } from "@/src/utils/imageUrl";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHANNEL_COLUMNS = 2;
const CHANNEL_GAP = 10;
const CHANNEL_PADDING = 12;
const CHANNEL_CARD_WIDTH =
  (SCREEN_WIDTH - CHANNEL_PADDING * 2 - CHANNEL_GAP * (CHANNEL_COLUMNS - 1)) /
  CHANNEL_COLUMNS;

const TAB_OPTIONS = [
  { id: "all", label: "Toutes", icon: "tv-outline" as const },
  { id: "favorites", label: "Favoris", icon: "heart-outline" as const },
];

// Nom du programme en cours sur une chaîne
function getCurrentProgramName(channel: BaseItemDto): string | undefined {
  return channel.CurrentProgram?.Name ?? undefined;
}

// Heure de fin du programme en cours
function getCurrentProgramEndTime(channel: BaseItemDto): string | undefined {
  const endDate = channel.CurrentProgram?.EndDate;
  if (!endDate) return undefined;
  const d = new Date(endDate);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// Indicateur LIVE : barre de progression du programme
function ProgramProgress({ channel }: { channel: BaseItemDto }) {
  const start = channel.CurrentProgram?.StartDate;
  const end = channel.CurrentProgram?.EndDate;
  if (!start || !end) return null;

  const now = Date.now();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const total = endMs - startMs;
  if (total <= 0) return null;

  const elapsed = Math.max(0, Math.min(now - startMs, total));
  const progress = elapsed / total;

  return (
    <View style={localStyles.progressBar}>
      <View
        style={[localStyles.progressFill, { width: `${progress * 100}%` }]}
      />
    </View>
  );
}

function ChannelCard({
  channel,
  serverUrl,
  onPress,
}: {
  channel: BaseItemDto;
  serverUrl: string;
  onPress: () => void;
}) {
  const primaryTag = channel.ImageTags?.["Primary"];
  const channelImageUrl = channel.Id
    ? getImageUrl({
        serverUrl,
        itemId: channel.Id,
        maxWidth: 200,
        quality: 90,
        tag: primaryTag,
      })
    : "";

  const programName = getCurrentProgramName(channel);
  const endTime = getCurrentProgramEndTime(channel);

  return (
    <Pressable style={localStyles.channelCard} onPress={onPress}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={localStyles.channelCardGradient}
      >
        {/* Logo chaîne */}
        <View style={localStyles.channelLogoContainer}>
          {channelImageUrl ? (
            <ExpoImage
              source={{ uri: channelImageUrl }}
              style={localStyles.channelLogo}
              cachePolicy="memory-disk"
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={localStyles.channelLogoPlaceholder}>
              <Ionicons name="tv-outline" size={28} color="#555" />
            </View>
          )}
        </View>

        {/* Numéro + nom de la chaîne */}
        <Text style={localStyles.channelName} numberOfLines={1}>
          {channel.ChannelNumber ? `${channel.ChannelNumber}. ` : ""}
          {channel.Name ?? "Chaîne"}
        </Text>

        {/* Programme en cours */}
        {programName ? (
          <View style={localStyles.programContainer}>
            <View style={localStyles.liveIndicator}>
              <View style={localStyles.liveDot} />
              <Text style={localStyles.liveText}>EN DIRECT</Text>
            </View>
            <Text style={localStyles.programName} numberOfLines={2}>
              {programName}
            </Text>
            {endTime && (
              <Text style={localStyles.programTime}>Jusqu'à {endTime}</Text>
            )}
            <ProgramProgress channel={channel} />
          </View>
        ) : (
          <View style={localStyles.programContainer}>
            <Text style={localStyles.noProgramText}>Pas de programme</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function DirectTVScreen() {
  const router = useRouter();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const openCast = useCastSheet();
  const [activeTab, setActiveTab] = useState("all");

  const { data: allChannels, isLoading: isLoadingAll } = useLiveTvChannels();
  const { data: favoriteChannels, isLoading: isLoadingFavorites } =
    useFavoriteChannels();

  const scrollViewRef = useRef<FlatList>(null);
  useScrollToTop(scrollViewRef);

  const channels = activeTab === "favorites" ? favoriteChannels : allChannels;
  const isLoading =
    activeTab === "favorites" ? isLoadingFavorites : isLoadingAll;

  const handleChannelPress = (channel: BaseItemDto) => {
    if (!channel.Id) return;
    router.push({
      pathname: "/player",
      params: { itemId: channel.Id, title: channel.Name ?? "Direct TV" },
    });
  };

  const renderChannel = ({
    item,
    index,
  }: {
    item: BaseItemDto;
    index: number;
  }) => (
    <ChannelCard
      channel={item}
      serverUrl={serverUrl}
      onPress={() => handleChannelPress(item)}
    />
  );

  const renderTab = (tab: (typeof TAB_OPTIONS)[0]) => (
    <Pressable
      key={tab.id}
      style={[
        localStyles.categoryTab,
        activeTab === tab.id && localStyles.activeTab,
      ]}
      onPress={() => setActiveTab(tab.id)}
    >
      <Ionicons
        name={tab.icon}
        size={18}
        color={activeTab === tab.id ? "#000" : "#fff"}
        style={{ marginRight: 6 }}
      />
      <Text
        style={[
          localStyles.categoryTabText,
          activeTab === tab.id && localStyles.activeTabText,
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );

  const channelCount = channels?.length ?? 0;

  return (
    <View style={localStyles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={localStyles.header}>
          <View style={localStyles.headerContent}>
            <Text style={localStyles.headerTitle}>Direct TV</Text>
            <View style={localStyles.headerRight}>
              <Pressable onPress={openCast}>
                <CastIcon size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={localStyles.categoryTabs}>
            {TAB_OPTIONS.map(renderTab)}
            {!isLoading && (
              <View style={localStyles.channelCountContainer}>
                <Text style={localStyles.channelCountText}>
                  {channelCount} chaîne{channelCount > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contenu */}
        {isLoading ? (
          <View style={localStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
          </View>
        ) : !channels?.length ? (
          <View style={localStyles.emptyContainer}>
            <Ionicons name="tv-outline" size={64} color="#333" />
            <Text style={localStyles.emptyTitle}>
              {activeTab === "favorites"
                ? "Aucune chaîne favorite"
                : "Aucune chaîne disponible"}
            </Text>
            <Text style={localStyles.emptySubtitle}>
              {activeTab === "favorites"
                ? "Ajoutez des chaînes en favoris pour les retrouver ici"
                : "Configurez la TV en direct dans Jellyfin"}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={scrollViewRef}
            data={channels}
            renderItem={renderChannel}
            keyExtractor={(item) => item.Id ?? ""}
            numColumns={CHANNEL_COLUMNS}
            contentContainerStyle={localStyles.channelGrid}
            columnWrapperStyle={localStyles.channelRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#000",
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  categoryTabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    alignItems: "center",
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ffffff63",
  },
  activeTab: {
    backgroundColor: "#fff",
  },
  categoryTabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#000",
  },
  channelCountContainer: {
    marginLeft: "auto",
  },
  channelCountText: {
    color: "#808080",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#808080",
    fontSize: 14,
    textAlign: "center",
  },
  channelGrid: {
    paddingHorizontal: CHANNEL_PADDING,
    paddingBottom: 100,
  },
  channelRow: {
    gap: CHANNEL_GAP,
    marginBottom: CHANNEL_GAP,
  },
  channelCard: {
    width: CHANNEL_CARD_WIDTH,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  channelCardGradient: {
    padding: 12,
    minHeight: 160,
  },
  channelLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  channelLogo: {
    width: 48,
    height: 48,
  },
  channelLogoPlaceholder: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  channelName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  programContainer: {
    marginTop: "auto",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E50914",
  },
  liveText: {
    color: "#E50914",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  programName: {
    color: "#B3B3B3",
    fontSize: 12,
    lineHeight: 16,
  },
  programTime: {
    color: "#808080",
    fontSize: 11,
    marginTop: 2,
  },
  noProgramText: {
    color: "#555",
    fontSize: 12,
    fontStyle: "italic",
  },
  progressBar: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E50914",
    borderRadius: 1,
  },
});
