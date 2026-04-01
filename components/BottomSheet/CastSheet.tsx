// Contenu Cast pour le GlobalBottomSheet
import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { CastIcon } from "@/icons/CastIcon";
import { useCastSessions } from "@/src/api/queries/useCastSessions";
import { useGoogleCast } from "@/src/hooks/useGoogleCast";
import { Ionicons } from "@expo/vector-icons";
import type { SessionInfoDto } from "@jellyfin/sdk/lib/generated-client/models/session-info-dto";
import React from "react";
import {
  ActivityIndicator,
  Platform,
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
  const googleCast = useGoogleCast();
  const { closeSheet } = useBottomSheet();

  const handleSelect = (session: SessionInfoDto) => {
    onSelect?.(session);
    closeSheet();
  };

  const handleChromecast = async () => {
    await googleCast.requestSession();
    closeSheet();
  };

  const handleDisconnectChromecast = () => {
    googleCast.disconnect();
  };

  const hasJellyfinSessions = (sessions?.length ?? 0) > 0;
  const hasChromecast = Platform.OS === "web" && googleCast.available;
  const hasAnyDevice = hasJellyfinSessions || hasChromecast;

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
      ) : !hasAnyDevice ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>Aucun appareil disponible</Text>
          <Text style={s.hintText}>
            Assurez-vous qu'un appareil Jellyfin ou Chromecast est allumé sur le
            même réseau.
          </Text>
          <Pressable style={s.retryButton} onPress={() => refetch()}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={s.list}>
          {/* Chromecast via Google Cast SDK */}
          {hasChromecast && (
            <>
              {googleCast.connectedDevice ? (
                <Pressable
                  style={[s.deviceRow, s.deviceRowActive]}
                  onPress={handleDisconnectChromecast}
                >
                  <CastIcon size={22} color="#E50914" />
                  <View style={s.deviceInfo}>
                    <Text style={[s.deviceName, { color: "#E50914" }]}>
                      {googleCast.connectedDevice.name}
                    </Text>
                    <Text style={s.deviceClient}>
                      Connecté · Appuyez pour déconnecter
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  style={s.deviceRow}
                  onPress={handleChromecast}
                  disabled={googleCast.isConnecting}
                >
                  <CastIcon size={22} color="#B3B3B3" />
                  <View style={s.deviceInfo}>
                    <Text style={s.deviceName}>Chromecast</Text>
                    <Text style={s.deviceClient}>
                      {googleCast.isConnecting
                        ? "Connexion…"
                        : "Appareils Google Cast disponibles"}
                    </Text>
                  </View>
                  {googleCast.isConnecting && (
                    <ActivityIndicator color="#E50914" size="small" />
                  )}
                </Pressable>
              )}
            </>
          )}

          {/* Sessions Jellyfin */}
          {hasJellyfinSessions && hasChromecast && (
            <View style={s.sectionSeparator}>
              <Text style={s.sectionLabel}>Appareils Jellyfin</Text>
            </View>
          )}
          {sessions?.map((session) => (
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
    gap: 12,
  },
  emptyText: {
    color: "#B3B3B3",
    fontSize: 14,
  },
  hintText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    marginTop: 4,
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
  deviceRowActive: {
    backgroundColor: "rgba(229,9,20,0.08)",
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
  sectionSeparator: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionLabel: {
    color: "#808080",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
