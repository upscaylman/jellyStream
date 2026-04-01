// Contenu Cast pour le GlobalBottomSheet
import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { CastIcon } from "@/icons/CastIcon";
import { useCastSessions } from "@/src/api/queries/useCastSessions";
import { Ionicons } from "@expo/vector-icons";
import type { SessionInfoDto } from "@jellyfin/sdk/lib/generated-client/models/session-info-dto";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface ICastSheetProps {
  onSelect?: (session: SessionInfoDto) => void;
}

export function CastSheet({ onSelect }: ICastSheetProps) {
  const { data: sessions, isLoading, refetch } = useCastSessions();
  const { closeSheet } = useBottomSheet();

  const handleSelect = (session: SessionInfoDto) => {
    onSelect?.(session);
    closeSheet();
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <CastIcon size={24} color="#fff" />
        <Text style={s.title}>Diffuser sur</Text>
      </View>

      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color="#E50914" size="small" />
          <Text style={s.loadingText}>Recherche d'appareils…</Text>
        </View>
      ) : !sessions?.length ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>Aucun appareil disponible</Text>
          <Pressable style={s.retryButton} onPress={() => refetch()}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={s.list}>
          {sessions.map((session) => (
            <Pressable
              key={session.Id}
              style={s.deviceRow}
              onPress={() => handleSelect(session)}
            >
              <Ionicons name="tv-outline" size={22} color="#B3B3B3" />
              <View style={s.deviceInfo}>
                <Text style={s.deviceName}>{session.DeviceName}</Text>
                <Text style={s.deviceClient}>
                  {session.Client}
                  {session.NowPlayingItem
                    ? ` · ${session.NowPlayingItem.Name}`
                    : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#B3B3B3",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    color: "#B3B3B3",
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
  },
  list: {
    maxHeight: 300,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  deviceClient: {
    color: "#808080",
    fontSize: 13,
    marginTop: 2,
  },
});
