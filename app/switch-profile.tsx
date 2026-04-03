import { ThemedText } from "@/components/ThemedText";
import {
  useCurrentUser,
  usePublicSystemInfo,
  usePublicUsers,
  useSystemInfo,
} from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { getQuickConnectApi } from "@jellyfin/sdk/lib/utils/api/quick-connect-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** URL de l'image de profil Jellyfin — GetAvatar plugin (avec fallback ui-avatars) */
function getUserImageUrl(
  serverUrl: string | null,
  usrId: string,
  userName: string,
  token?: string,
): string {
  if (serverUrl) {
    const base = serverUrl.replace(/\/+$/, "");
    const params = new URLSearchParams({ quality: "90", maxWidth: "200" });
    if (token) params.set("api_key", token);
    return `${base}/Users/${usrId}/Images/Primary?${params.toString()}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "U")}&background=E50914&color=fff&size=120`;
}

export default function SwitchProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const api = useAuthStore((s) => s.api);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const serverName = useAuthStore((s) => s.serverName);
  const logout = useAuthStore((s) => s.logout);
  const savedProfiles = useAuthStore((s) => s.savedProfiles);
  const switchProfile = useAuthStore((s) => s.switchProfile);

  const token = useAuthStore((s) => s.token);

  // Données serveur via TanStack Query
  const { data: userData } = useCurrentUser();
  const { data: publicSystemInfo } = usePublicSystemInfo();
  const { data: systemInfo } = useSystemInfo();
  const { data: publicUsers } = usePublicUsers();
  const serverVersion = publicSystemInfo?.Version ?? null;

  const [saving, setSaving] = useState(false);

  // Avatar picker (GetAvatar plugin)
  interface AvatarItem {
    Id: string;
    Name: string;
    Url: string;
  }
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<AvatarItem[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [settingAvatar, setSettingAvatar] = useState(false);

  // Quick Connect
  const [quickConnectVisible, setQuickConnectVisible] = useState(false);
  const [quickConnectCode, setQuickConnectCode] = useState("");
  const [quickConnectLoading, setQuickConnectLoading] = useState(false);
  const [quickConnectStatus, setQuickConnectStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [quickConnectError, setQuickConnectError] = useState("");

  const authorizeQuickConnect = useCallback(async () => {
    if (!api || !quickConnectCode.trim()) return;
    setQuickConnectLoading(true);
    setQuickConnectStatus("idle");
    setQuickConnectError("");
    try {
      const qcApi = getQuickConnectApi(api);
      await qcApi.authorizeQuickConnect({ code: quickConnectCode.trim() });
      setQuickConnectStatus("success");
      setQuickConnectCode("");
    } catch (err: unknown) {
      setQuickConnectStatus("error");
      const message =
        err instanceof Error ? err.message : "Code invalide ou expiré";
      setQuickConnectError(message);
    } finally {
      setQuickConnectLoading(false);
    }
  }, [api, quickConnectCode]);

  const openQuickConnect = useCallback(() => {
    setQuickConnectCode("");
    setQuickConnectStatus("idle");
    setQuickConnectError("");
    setQuickConnectVisible(true);
  }, []);

  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  const bumpAvatarVersion = useAuthStore((s) => s.bumpAvatarVersion);

  // Charger les avatars disponibles (GetAvatar plugin)
  const fetchAvatars = useCallback(async () => {
    if (!serverUrl || !token) return;
    setLoadingAvatars(true);
    try {
      const url = `${serverUrl}/GetAvatar/Avatars`;
      console.log("[Avatar] fetchAvatars →", url);
      const res = await fetch(url, {
        headers: { "X-Emby-Token": token },
      });
      console.log("[Avatar] fetchAvatars status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[Avatar] avatars reçus:", data?.length, data);
        setAvailableAvatars(data);
      } else {
        console.warn(
          "[Avatar] fetchAvatars erreur:",
          res.status,
          await res.text().catch(() => ""),
        );
      }
    } catch (err) {
      console.error("[Avatar] fetchAvatars exception:", err);
    } finally {
      setLoadingAvatars(false);
    }
  }, [serverUrl, token]);

  // Appliquer un avatar
  const setAvatar = useCallback(
    async (avatarId: string) => {
      if (!serverUrl || !token || !userId) return;
      setSettingAvatar(true);
      try {
        const body = JSON.stringify({ UserId: userId, AvatarId: avatarId });
        console.log(
          "[Avatar] setAvatar →",
          `${serverUrl}/GetAvatar/SetAvatar`,
          body,
        );
        const res = await fetch(`${serverUrl}/GetAvatar/SetAvatar`, {
          method: "POST",
          headers: {
            "X-Emby-Token": token,
            "Content-Type": "application/json",
          },
          body,
        });
        console.log("[Avatar] setAvatar status:", res.status);
        if (res.ok) {
          const respText = await res.text().catch(() => "");
          console.log("[Avatar] setAvatar OK, response:", respText);
          setAvatarPickerVisible(false);
          // Forcer le refresh des images de profil partout
          bumpAvatarVersion();
          console.log("[Avatar] avatarVersion bumped, invalidating queries...");
          queryClient.invalidateQueries({
            queryKey: ["server", "currentUser"],
          });
        } else {
          const errBody = await res.text().catch(() => "");
          console.warn("[Avatar] setAvatar erreur:", res.status, errBody);
          const msg =
            Platform.OS === "web"
              ? () => alert("Erreur lors du changement d'avatar")
              : () => Alert.alert("Erreur", "Impossible de changer l'avatar");
          msg();
        }
      } catch (err) {
        console.error("[Avatar] setAvatar exception:", err);
        const msg =
          Platform.OS === "web"
            ? () => alert("Erreur réseau")
            : () => Alert.alert("Erreur", "Erreur réseau");
        msg();
      } finally {
        setSettingAvatar(false);
      }
    },
    [serverUrl, token, userId, bumpAvatarVersion, queryClient],
  );

  // Ouvrir le picker
  const openAvatarPicker = useCallback(() => {
    setAvatarPickerVisible(true);
    fetchAvatars();
  }, [fetchAvatars]);

  const profiles = savedProfiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.userName || "Utilisateur",
    avatar:
      getUserImageUrl(p.serverUrl, p.userId, p.userName, p.token) +
      `&_r=${avatarVersion}`,
  }));

  // Profils serveur Jellyfin (tous les utilisateurs publics sauf le courant)
  const otherServerUsers = (publicUsers ?? [])
    .filter((u) => u.Id !== userId)
    .map((u) => ({
      jellyfinId: u.Id ?? "",
      name: u.Name ?? "Utilisateur",
      avatar:
        getUserImageUrl(
          serverUrl,
          u.Id ?? "",
          u.Name ?? "",
          token ?? undefined,
        ) + `&_r=${avatarVersion}`,
      hasSavedProfile: savedProfiles.some((p) => p.userId === u.Id),
      savedProfileId: savedProfiles.find((p) => p.userId === u.Id)?.id,
    }));

  const handleProfileSelect = async (profileId: string) => {
    const profile = savedProfiles.find((p) => p.id === profileId);
    if (profile && profile.userId !== userId) {
      switchProfile(profileId);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleServerUserSelect = (user: (typeof otherServerUsers)[0]) => {
    if (user.hasSavedProfile && user.savedProfileId) {
      // Profil déjà sauvegardé → switch direct
      handleProfileSelect(user.savedProfileId);
    } else {
      // Pas encore connecté → aller au login avec le nom pré-rempli
      router.push(
        `/(auth)/login?addProfile=1&username=${encodeURIComponent(user.name)}`,
      );
    }
  };

  // Formater la date de dernière connexion
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <ThemedText style={styles.title}>Profil</ThemedText>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current profile card */}
        {(() => {
          const current = profiles.find((p) => p.userId === userId);
          if (!current) return null;
          return (
            <View style={styles.currentProfileCard}>
              <View style={styles.currentProfileInner}>
                <Image
                  source={{ uri: current.avatar }}
                  style={styles.currentAvatar}
                />
              </View>
              <TouchableOpacity
                style={styles.editIcon}
                onPress={openAvatarPicker}
              >
                <Ionicons name="pencil" size={20} color="#ccc" />
              </TouchableOpacity>
              <ThemedText style={styles.currentName}>{current.name}</ThemedText>
            </View>
          );
        })()}

        {/* Other profiles (from Jellyfin server) */}
        {otherServerUsers.length > 0 && (
          <View style={styles.otherProfilesRow}>
            {otherServerUsers.map((user, index) => (
              <Animated.View
                key={user.jellyfinId}
                entering={FadeIn.delay(index * 100 + 250)}
              >
                <TouchableOpacity
                  onPress={() => handleServerUserSelect(user)}
                  style={styles.otherProfileItem}
                >
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.otherAvatar}
                  />
                  <ThemedText style={styles.otherName}>{user.name}</ThemedText>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Gérer les profils */}
        <TouchableOpacity style={styles.manageButton}>
          <ThemedText style={styles.manageButtonText}>
            Gérer les profils
          </ThemedText>
        </TouchableOpacity>

        {/* Menu items */}
        <View style={styles.menuSection}>
          {/* === SERVEUR === */}
          <ThemedText style={styles.sectionTitle}>Serveur</ThemedText>

          <TouchableOpacity style={styles.menuItem} onPress={openQuickConnect}>
            <Ionicons name="flash-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Connexion rapide</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                Autoriser un appareil avec un code
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons name="server-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Serveur</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {[serverName, serverVersion && `v${serverVersion}`]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="globe-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Adresse</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {serverUrl?.replace(/^https?:\/\//, "") ?? "—"}
              </ThemedText>
            </View>
          </View>

          {systemInfo && (
            <>
              <View style={styles.menuItem}>
                <Ionicons name="speedometer-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Transcodage vidéo
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {userData?.Policy?.EnableVideoPlaybackTranscoding
                      ? "Activé"
                      : "Désactivé (Direct Play)"}
                  </ThemedText>
                </View>
                {userData?.Policy?.IsAdministrator ? (
                  <Switch
                    value={
                      userData?.Policy?.EnableVideoPlaybackTranscoding ?? true
                    }
                    onValueChange={async (val) => {
                      if (!api || !userId || !userData?.Policy) return;
                      setSaving(true);
                      try {
                        await getUserApi(api).updateUserPolicy({
                          userId,
                          userPolicy: {
                            ...userData.Policy,
                            EnableVideoPlaybackTranscoding: val,
                            EnableAudioPlaybackTranscoding: val,
                          },
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["server", "currentUser"],
                        });
                      } catch {
                        if (Platform.OS === "web")
                          alert("Erreur lors de la sauvegarde");
                        else
                          Alert.alert(
                            "Erreur",
                            "Impossible de modifier le transcodage",
                          );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    trackColor={{ false: "#555", true: "#fff" }}
                    thumbColor={
                      (userData?.Policy?.EnableVideoPlaybackTranscoding ?? true)
                        ? "#E50914"
                        : "#fff"
                    }
                    {...(Platform.OS === "web"
                      ? ({ activeThumbColor: "#E50914" } as Record<
                          string,
                          string
                        >)
                      : {})}
                    disabled={!userData?.Policy || saving}
                  />
                ) : null}
              </View>

              {systemInfo.HasPendingRestart && (
                <View style={styles.menuItem}>
                  <Ionicons name="warning-outline" size={24} color="#E50914" />
                  <ThemedText style={[styles.menuText, { color: "#E50914" }]}>
                    Redémarrage en attente
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* === LIENS === */}
          <ThemedText style={styles.sectionTitle}>Liens</ThemedText>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              const url = serverUrl
                ? `${serverUrl}/web/index.html`
                : "https://jellyfin.org/docs/";
              Linking.openURL(url);
            }}
          >
            <Ionicons name="help-circle-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>
              Interface web Jellyfin
            </ThemedText>
            <Ionicons name="open-outline" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL("https://jellyfin.org/docs/")}
          >
            <Ionicons name="book-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>Documentation</ThemedText>
            <Ionicons name="open-outline" size={20} color="#666" />
          </TouchableOpacity>

          {/* === COMPTE (en bas) === */}
          <ThemedText style={styles.sectionTitle}>Compte</ThemedText>

          <View style={styles.menuItem}>
            <Ionicons name="person-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Utilisateur</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {userData?.Name ?? "—"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="time-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>
                Dernière connexion
              </ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {formatDate(userData?.LastLoginDate) ?? "—"}
              </ThemedText>
            </View>
          </View>

          {/* === PARAMÈTRES === */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>Paramètres</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              logout();
              router.replace("/(auth)/server-select");
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>Se déconnecter</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <ThemedText
          style={{
            color: "#555",
            fontSize: 11,
            textAlign: "center",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          JellyStream v{require("../package.json").version}
        </ThemedText>

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color="#E50914" size="small" />
            <ThemedText style={styles.savingText}>Sauvegarde...</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Quick Connect Bottom Sheet */}
      <Modal
        visible={quickConnectVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQuickConnectVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setQuickConnectVisible(false)}
          />
          <View style={styles.quickConnectSheet}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.quickConnectTitle}>
              Connexion rapide
            </ThemedText>
            <ThemedText style={styles.quickConnectDesc}>
              Entrez le code affiché sur l&apos;appareil à connecter
            </ThemedText>

            <TextInput
              style={styles.quickConnectInput}
              value={quickConnectCode}
              onChangeText={(text) => {
                setQuickConnectCode(text);
                if (quickConnectStatus !== "idle")
                  setQuickConnectStatus("idle");
              }}
              placeholder="Code à 6 chiffres"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!quickConnectLoading}
            />

            {quickConnectStatus === "success" && (
              <View style={styles.quickConnectFeedback}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <ThemedText
                  style={[
                    styles.quickConnectFeedbackText,
                    { color: "#4CAF50" },
                  ]}
                >
                  Appareil autorisé avec succès
                </ThemedText>
              </View>
            )}

            {quickConnectStatus === "error" && (
              <View style={styles.quickConnectFeedback}>
                <Ionicons name="alert-circle" size={20} color="#E50914" />
                <ThemedText
                  style={[
                    styles.quickConnectFeedbackText,
                    { color: "#E50914" },
                  ]}
                >
                  {quickConnectError || "Code invalide ou expiré"}
                </ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.quickConnectButton,
                (!quickConnectCode.trim() || quickConnectLoading) &&
                  styles.quickConnectButtonDisabled,
              ]}
              onPress={authorizeQuickConnect}
              disabled={!quickConnectCode.trim() || quickConnectLoading}
            >
              {quickConnectLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.quickConnectButtonText}>
                  Autoriser
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Choisir un avatar
              </ThemedText>
              <TouchableOpacity
                onPress={() => setAvatarPickerVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {loadingAvatars ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#E50914" size="large" />
              </View>
            ) : availableAvatars.length === 0 ? (
              <View style={styles.modalLoading}>
                <Ionicons name="images-outline" size={48} color="#555" />
                <ThemedText style={styles.noAvatarsText}>
                  Aucun avatar disponible
                </ThemedText>
                <ThemedText style={styles.noAvatarsSubtext}>
                  Le plugin GetAvatar n&apos;est pas installé ou aucun avatar
                  n&apos;a été ajouté
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={availableAvatars}
                numColumns={3}
                keyExtractor={(item) => item.Id}
                contentContainerStyle={styles.avatarGrid}
                columnWrapperStyle={styles.avatarRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.avatarOption}
                    onPress={() => setAvatar(item.Id)}
                    disabled={settingAvatar}
                  >
                    <Image
                      source={{
                        uri: `${serverUrl}${item.Url}${token ? `?api_key=${token}` : ""}`,
                      }}
                      style={styles.avatarOptionImage}
                    />
                    <ThemedText
                      style={styles.avatarOptionName}
                      numberOfLines={1}
                    >
                      {item.Name}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              />
            )}

            {settingAvatar && (
              <View style={styles.settingOverlay}>
                <ActivityIndicator color="#E50914" size="large" />
                <ThemedText style={styles.savingText}>
                  Application...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232323",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  settingsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 8,
  },
  quickConnectSheet: {
    backgroundColor: "#232323",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#555",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  quickConnectTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  quickConnectDesc: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
  },
  quickConnectInfo: {
    backgroundColor: "#2d2d2d",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 6,
  },
  quickConnectInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  quickConnectInfoLabel: {
    fontSize: 13,
    color: "#888",
  },
  quickConnectInfoValue: {
    flex: 1,
    fontSize: 13,
    color: "#fff",
    textAlign: "right",
  },
  quickConnectInput: {
    backgroundColor: "#2d2d2d",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
  },
  quickConnectFeedback: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  quickConnectFeedbackText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickConnectButton: {
    backgroundColor: "#E50914",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickConnectButtonDisabled: {
    opacity: 0.4,
  },
  quickConnectButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  currentProfileCard: {
    backgroundColor: "#2d2d2d",
    borderRadius: 32,
    marginHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  currentProfileInner: {
    marginBottom: 12,
  },
  currentAvatar: {
    width: 100,
    height: 100,
    borderRadius: 26,
  },
  editIcon: {
    position: "absolute",
    right: 24,
    top: 24,
    bottom: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 0,
  },
  currentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  otherProfilesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  otherProfileItem: {
    alignItems: "center",
    gap: 6,
  },
  otherAvatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  otherName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ccc",
  },
  manageButton: {
    alignSelf: "center",
    backgroundColor: "#2d2d2d",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ccc",
  },
  menuSection: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2d2d2d",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  savingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  savingText: {
    fontSize: 13,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#232323",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 60,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noAvatarsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
  },
  noAvatarsSubtext: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  avatarGrid: {
    padding: 16,
  },
  avatarRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  avatarOption: {
    flex: 1,
    maxWidth: "31%",
    alignItems: "center",
    gap: 6,
  },
  avatarOptionImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#2d2d2d",
  },
  avatarOptionName: {
    fontSize: 11,
    color: "#ccc",
    textAlign: "center",
  },
  settingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
