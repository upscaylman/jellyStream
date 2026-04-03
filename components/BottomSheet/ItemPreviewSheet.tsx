import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { useItemDetail } from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getBackdropUrl, getImageUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface IItemPreviewSheetProps {
  itemId: string;
}

export function ItemPreviewSheet({ itemId }: IItemPreviewSheetProps) {
  const { data: item, isLoading } = useItemDetail(itemId);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const router = useRouter();
  const { closeSheet } = useBottomSheet();

  if (isLoading) {
    return (
      <View style={sheetStyles.loading}>
        <SkeletonBox width="100%" height={180} borderRadius={0} />
        <View style={{ padding: 16, gap: 10 }}>
          <SkeletonBox width={200} height={20} borderRadius={4} />
          <SkeletonBox width={150} height={14} borderRadius={4} />
          <SkeletonBox width="100%" height={40} borderRadius={4} />
        </View>
      </View>
    );
  }

  if (!item || !serverUrl) return null;

  const backdropUri = item.BackdropImageTags?.length
    ? getBackdropUrl(serverUrl, item.Id!, 780, 80)
    : item.ImageTags?.Primary
      ? getImageUrl({
          serverUrl,
          itemId: item.Id!,
          maxWidth: 780,
          quality: 80,
        })
      : "";

  const year = item.ProductionYear;
  const runtime = item.RunTimeTicks
    ? `${Math.round(item.RunTimeTicks / 600_000_000)}min`
    : null;
  const rating = item.OfficialRating;
  const genres = item.Genres?.slice(0, 3).join(" · ");

  const navigateToDetail = () => {
    closeSheet();
    router.push({
      pathname: "/(tabs)/movie/[id]",
      params: { id: item.Id! },
    });
  };

  const hasProgress = (item.UserData?.PlaybackPositionTicks ?? 0) > 0;

  const navigateToPlayer = () => {
    closeSheet();
    router.push({
      pathname: "/player",
      params: { itemId: item.Id! },
    });
  };

  return (
    <View style={sheetStyles.container}>
      {/* Backdrop */}
      {backdropUri ? (
        <View style={sheetStyles.backdropContainer}>
          <ExpoImage
            source={{ uri: backdropUri }}
            style={sheetStyles.backdrop}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <View style={sheetStyles.backdropGradient} />
          {/* Bouton X en haut à droite */}
          <Pressable
            style={sheetStyles.closeBtn}
            onPress={closeSheet}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {/* Infos */}
      <View style={sheetStyles.info}>
        <Text style={sheetStyles.title} numberOfLines={2}>
          {item.Name}
        </Text>
        <View style={sheetStyles.meta}>
          {year ? <Text style={sheetStyles.metaText}>{year}</Text> : null}
          {rating ? (
            <View style={sheetStyles.ratingBadge}>
              <Text style={sheetStyles.ratingText}>{rating}</Text>
            </View>
          ) : null}
          {runtime ? <Text style={sheetStyles.metaText}>{runtime}</Text> : null}
        </View>
        {genres ? (
          <Text style={sheetStyles.genres} numberOfLines={1}>
            {genres}
          </Text>
        ) : null}
        {item.Overview ? (
          <Text style={sheetStyles.overview} numberOfLines={3}>
            {item.Overview}
          </Text>
        ) : null}
      </View>

      {/* Boutons d'action */}
      <View style={sheetStyles.actions}>
        <Pressable style={sheetStyles.playBtn} onPress={navigateToPlayer}>
          <Ionicons name="play" size={22} color="#000" />
          <Text style={sheetStyles.playBtnText}>
            {hasProgress ? "Reprendre" : "Lecture"}
          </Text>
        </Pressable>
        <Pressable style={sheetStyles.detailBtn} onPress={navigateToDetail}>
          <Ionicons name="information-circle-outline" size={22} color="#fff" />
          <Text style={sheetStyles.detailBtnText}>Détails</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  backdropContainer: {
    height: 180,
    position: "relative",
  },
  backdrop: {
    width: "100%",
    height: "100%",
  },
  backdropGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "transparent",
    // Dégradé simulé via shadow (le vrai gradient nécessitera expo-linear-gradient)
    borderTopWidth: 0,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    color: "#999",
    fontSize: 13,
  },
  ratingBadge: {
    borderWidth: 1,
    borderColor: "#666",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  ratingText: {
    color: "#999",
    fontSize: 11,
  },
  genres: {
    color: "#999",
    fontSize: 13,
    marginTop: 4,
  },
  overview: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  playBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 4,
    gap: 6,
  },
  playBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  detailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(51,51,51,0.8)",
    paddingVertical: 10,
    borderRadius: 4,
    gap: 6,
  },
  detailBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
