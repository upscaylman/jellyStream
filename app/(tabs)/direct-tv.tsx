import { Ionicons } from "@expo/vector-icons";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useScrollToTop } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { ChannelRowSkeleton, useSmoothLoading } from "@/components/ui/Skeleton";
import { useCastSheet } from "@/hooks/useCastSheet";
import { useWebDragScroll } from "@/hooks/useWebDragScroll";
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
const CHANNEL_CARD_WIDTH = SCREEN_WIDTH * 0.42;

const TAB_OPTIONS = [
  { id: "all", label: "Chaînes", icon: "tv-outline" as const },
  { id: "favorites", label: "Favoris", icon: "heart-outline" as const },
];

// Classification des chaînes par genre/type basée sur le nom
const CHANNEL_CATEGORIES: { label: string; keywords: string[] }[] = [
  {
    label: "Généralistes",
    keywords: [
      "tf1",
      "france 2",
      "france 3",
      "france 4",
      "france 5",
      "m6",
      "arte",
      "c8",
      "w9",
      "tmc",
      "tfx",
      "nrj 12",
      "nrj12",
      "cstar",
      "gulli",
      "6ter",
      "rmcstory",
      "rmc story",
      "cherie 25",
      "l'equipe",
      "lequipe",
      "lci",
      "franceinfo",
      "la une",
      "la deux",
      "rts un",
      "rts deux",
    ],
  },
  {
    label: "Information",
    keywords: [
      "bfm",
      "cnews",
      "lci",
      "franceinfo",
      "france info",
      "france 24",
      "euronews",
      "i24",
      "africa news",
      "africanews",
      "tv5monde",
      "rt france",
      "rfi",
      "public sénat",
      "public senat",
    ],
  },
  {
    label: "Sport",
    keywords: [
      "rmc sport",
      "bein",
      "beinsport",
      "canal+ sport",
      "eurosport",
      "sport",
      "l'equipe",
      "lequipe",
      "infosport",
      "golf+",
      "foot+",
      "multisports",
      "olympic",
    ],
  },
  {
    label: "Cinéma",
    keywords: [
      "canal+",
      "cine+",
      "ciné+",
      "ocs",
      "paramount",
      "tcm",
      "action",
      "star",
      "frisson",
      "famiz",
      "cinema",
      "cinéma",
    ],
  },
  {
    label: "Jeunesse",
    keywords: [
      "gulli",
      "disney",
      "cartoon",
      "nickelodeon",
      "nick",
      "boomerang",
      "boing",
      "tiji",
      "piwi",
      "canal j",
      "teletoon",
      "télétoon",
      "manga",
      "game one",
    ],
  },
  {
    label: "Divertissement",
    keywords: [
      "comédie",
      "comedie",
      "comedy",
      "ab1",
      "ab3",
      "tv breizh",
      "tvbreizh",
      "série club",
      "serie club",
      "warner",
      "13eme rue",
      "13ème rue",
      "syfy",
      "teva",
      "elle girl",
      "novelas",
      "e!",
    ],
  },
  {
    label: "Découverte",
    keywords: [
      "national geo",
      "nat geo",
      "discovery",
      "planete+",
      "planète",
      "histoire",
      "science",
      "ushuaia",
      "voyage",
      "trek",
      "animaux",
      "chasse",
      "peche",
      "nature",
    ],
  },
  {
    label: "Musique",
    keywords: [
      "mtv",
      "trace",
      "mezzo",
      "melody",
      "rtl2",
      "mcm",
      "m6 music",
      "nrj hits",
      "musique",
    ],
  },
  {
    label: "Régionales",
    keywords: [
      "france 3 ",
      "weo",
      "bip",
      "tébéo",
      "tébésud",
      "vià",
      "via ",
      "tvr",
      "tlc",
      "alsace",
      "bretagne",
      "normandie",
      "provence",
      "occitanie",
      "corse",
      "réunion",
      "reunion",
      "martinique",
      "guadeloupe",
      "guyane",
      "mayotte",
      "nouvelle-calédonie",
      "polynésie",
    ],
  },
];

function getChannelCategory(channel: BaseItemDto): string {
  const name = (channel.Name ?? "").toLowerCase();
  for (const cat of CHANNEL_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (name.includes(kw)) return cat.label;
    }
  }
  return "Autres";
}

interface ChannelSection {
  title: string;
  data: BaseItemDto[];
}

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
        colors={["#2d2d2d", "#232323"]}
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

function ChannelRow({
  channels,
  serverUrl,
  onPress,
}: {
  channels: BaseItemDto[];
  serverUrl: string;
  onPress: (channel: BaseItemDto) => void;
}) {
  const flatListRef = useRef<FlatList>(null);
  useWebDragScroll(flatListRef);

  return (
    <FlatList
      ref={flatListRef}
      data={channels}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.Id ?? ""}
      contentContainerStyle={localStyles.horizontalRow}
      renderItem={({ item: channel }) => (
        <ChannelCard
          channel={channel}
          serverUrl={serverUrl}
          onPress={() => onPress(channel)}
        />
      )}
    />
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

  const showSkeleton = useSmoothLoading(!!channels);

  // Grouper les chaînes par catégorie pour l'onglet "Chaînes"
  const channelSections = useMemo<ChannelSection[]>(() => {
    if (!allChannels?.length) return [];
    const grouped: Record<string, BaseItemDto[]> = {};
    for (const ch of allChannels) {
      const cat = getChannelCategory(ch);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    }
    const order = CHANNEL_CATEGORIES.map((c) => c.label);
    const sorted = Object.entries(grouped).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted.map(([title, items]) => ({ title, data: items }));
  }, [allChannels]);

  const handleChannelPress = (channel: BaseItemDto) => {
    if (!channel.Id) return;
    router.push({
      pathname: "/player",
      params: { itemId: channel.Id, title: channel.Name ?? "IPTV" },
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
            <Text style={localStyles.headerTitle}>IPTV</Text>
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
        {channels && !channels.length ? (
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
        ) : channels && activeTab === "all" ? (
          <ScrollView
            contentContainerStyle={localStyles.channelGrid}
            showsVerticalScrollIndicator={false}
          >
            {channelSections.map((section) => (
              <View key={section.title} style={localStyles.sectionContainer}>
                <Text style={localStyles.sectionHeader}>{section.title}</Text>
                <ChannelRow
                  channels={section.data}
                  serverUrl={serverUrl}
                  onPress={handleChannelPress}
                />
              </View>
            ))}
          </ScrollView>
        ) : channels ? (
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
        ) : null}

        {showSkeleton && (
          <View style={localStyles.skeletonOverlay}>
            <ChannelRowSkeleton />
            <ChannelRowSkeleton />
            <ChannelRowSkeleton />
          </View>
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
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 2,
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
  sectionHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: CHANNEL_PADDING,
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  horizontalRow: {
    paddingHorizontal: CHANNEL_PADDING,
    gap: CHANNEL_GAP,
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
    flex: 1,
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
