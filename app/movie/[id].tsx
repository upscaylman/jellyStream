import { ExpandedPlayer } from "@/components/BottomSheet/ExpandedPlayer";
import { useItemDetail } from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { getImageUrl } from "@/src/utils/imageUrl";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function MovieScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const itemId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const { data: item, isLoading, isError } = useItemDetail(itemId);

  // Construire l'URL d'image depuis les données Jellyfin
  const imageUrl = item?.ImageTags?.["Primary"]
    ? getImageUrl({
        serverUrl,
        itemId: item.Id ?? "",
        maxWidth: 800,
        quality: 90,
        tag: item.ImageTags["Primary"],
      })
    : "";

  // Extraire cast et réalisateur depuis People
  const castNames = (item?.People ?? [])
    .filter((p) => p.Type === "Actor")
    .slice(0, 5)
    .map((p) => p.Name ?? "");
  const director =
    (item?.People ?? []).find((p) => p.Type === "Director")?.Name ?? "";

  // Durée formatée
  const durationStr = item?.RunTimeTicks
    ? (() => {
        const totalMin = Math.round(item.RunTimeTicks / 600000000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : "";

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.errorText}>Impossible de charger ce contenu</Text>
          <Pressable onPress={() => router.back()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ExpandedPlayer
        movie={{
          id: item.Id ?? "",
          title: item.Name ?? "",
          imageUrl,
          year: item.ProductionYear?.toString() ?? "",
          duration: durationStr,
          rating: item.OfficialRating ?? "",
          description: item.Overview ?? "",
          cast: castNames.length > 0 ? castNames : undefined,
          director: director || undefined,
          type: item.Type ?? undefined,
          seasonCount: item.ChildCount ?? undefined,
          seriesId: item.SeriesId ?? undefined,
          trailerUrl: item.RemoteTrailers?.[0]?.Url ?? undefined,
          trailerUrls:
            item.RemoteTrailers?.map((t: any) => t.Url).filter(Boolean) ??
            undefined,
          genres: item.Genres ?? undefined,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: "#E50914",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
