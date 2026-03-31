// Modal de sélection d'appareil Jellyfin pour le casting
import { CastIcon } from "@/icons/CastIcon";
import { useCastSessions } from "@/src/api/queries/useCastSessions";
import { Ionicons } from "@expo/vector-icons";
import type { SessionInfoDto } from "@jellyfin/sdk/lib/generated-client/models/session-info-dto";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface CastModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (session: SessionInfoDto) => void;
}

export function CastModal({ visible, onClose, onSelect }: CastModalProps) {
  const { data: sessions, isLoading, refetch } = useCastSessions();

  if (!visible) return null;

  const content = (
    <Pressable style={s.backdrop} onPress={onClose}>
      <View style={s.container}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={s.header}>
            <CastIcon size={24} color="#fff" />
            <Text style={s.title}>Diffuser sur</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
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
                  onPress={() => {
                    onSelect(session);
                    onClose();
                  }}
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
        </Pressable>
      </View>
    </Pressable>
  );

  // Sur web, rendre inline (pas de <Modal>) pour être visible en fullscreen
  if (Platform.OS === "web") return content;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  container: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    gap: 10,
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
