import { ThemedText } from "@/components/ThemedText";
import {
  useCurrentUser,
  usePublicSystemInfo,
  usePublicUsers,
  useSystemInfo,
} from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import type { UserConfiguration } from "@jellyfin/sdk/lib/generated-client/models";
import { SubtitlePlaybackMode } from "@jellyfin/sdk/lib/generated-client/models";
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

/** Labels lisibles pour SubtitlePlaybackMode */
const SUBTITLE_MODE_LABELS: Record<string, string> = {
  [SubtitlePlaybackMode.Default]: "Par défaut",
  [SubtitlePlaybackMode.Always]: "Toujours",
  [SubtitlePlaybackMode.OnlyForced]: "Forcés uniquement",
  [SubtitlePlaybackMode.None]: "Désactivés",
  [SubtitlePlaybackMode.Smart]: "Intelligent",
};

const SUBTITLE_MODES = Object.values(SubtitlePlaybackMode);

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
  const config = userData?.Configuration ?? null;
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
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  // Sauvegarder la config utilisateur sur le serveur
  const saveConfig = useCallback(
    async (newConfig: UserConfiguration) => {
      if (!api) return;
      setSaving(true);
      try {
        await getUserApi(api).updateUserConfiguration({
          userConfiguration: newConfig,
        });
        queryClient.invalidateQueries({ queryKey: ["server", "currentUser"] });
      } catch {
        if (Platform.OS === "web") {
          // eslint-disable-next-line no-alert
          alert("Erreur lors de la sauvegarde des paramètres");
        } else {
          Alert.alert("Erreur", "Impossible de sauvegarder les paramètres");
        }
      } finally {
        setSaving(false);
      }
    },
    [api, queryClient],
  );

  // Toggle boolean config
  const toggleConfig = useCallback(
    (key: keyof UserConfiguration) => {
      if (!config) return;
      const newConfig = { ...config, [key]: !config[key] };
      saveConfig(newConfig);
    },
    [config, saveConfig],
  );

  // Cycle subtitle mode
  const cycleSubtitleMode = useCallback(() => {
    if (!config) return;
    const currentIndex = SUBTITLE_MODES.indexOf(
      config.SubtitleMode ?? SubtitlePlaybackMode.Default,
    );
    const nextIndex = (currentIndex + 1) % SUBTITLE_MODES.length;
    saveConfig({ ...config, SubtitleMode: SUBTITLE_MODES[nextIndex] });
  }, [config, saveConfig]);

  // Charger les avatars disponibles (GetAvatar plugin)
  const fetchAvatars = useCallback(async () => {
    if (!serverUrl || !token) return;
    setLoadingAvatars(true);
    try {
      const res = await fetch(`${serverUrl}/GetAvatar/Avatars`, {
        headers: { "X-Emby-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableAvatars(data);
      }
    } catch {
      // Plugin pas installé ou erreur réseau
    } finally {
      setLoadingAvatars(false);
    }
  }, [serverUrl, token]);

  // Appliquer un avatar
  const setAvatar = useCallback(
    async (avatarId: string) => {
      if (!serverUrl || !token) return;
      setSettingAvatar(true);
      try {
        const res = await fetch(`${serverUrl}/GetAvatar/SetAvatar`, {
          method: "POST",
          headers: {
            "X-Emby-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ AvatarId: avatarId }),
        });
        if (res.ok) {
          setAvatarPickerVisible(false);
          // Forcer le refresh des images de profil
          setAvatarRefreshKey((k) => k + 1);
        } else {
          const msg =
            Platform.OS === "web"
              ? () => alert("Erreur lors du changement d'avatar")
              : () => Alert.alert("Erreur", "Impossible de changer l'avatar");
          msg();
        }
      } catch {
        const msg =
          Platform.OS === "web"
            ? () => alert("Erreur réseau")
            : () => Alert.alert("Erreur", "Erreur réseau");
        msg();
      } finally {
        setSettingAvatar(false);
      }
    },
    [serverUrl, token],
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
      (avatarRefreshKey ? `&_r=${avatarRefreshKey}` : ""),
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
        ) + (avatarRefreshKey ? `&_r=${avatarRefreshKey}` : ""),
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
          {/* === PARAMÈTRES DE LECTURE === */}
          <ThemedText style={styles.sectionTitle}>Lecture</ThemedText>

          <View style={styles.menuItem}>
            <Ionicons name="play-circle-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>
                Piste audio par défaut
              </ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {config?.AudioLanguagePreference || "Non définie"}
              </ThemedText>
            </View>
            <Switch
              value={config?.PlayDefaultAudioTrack ?? true}
              onValueChange={() => toggleConfig("PlayDefaultAudioTrack")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.PlayDefaultAudioTrack ?? true) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={cycleSubtitleMode}
            disabled={!config || saving}
          >
            <Ionicons name="text-outline" size={24} color="#fff" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Mode sous-titres</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {
                  SUBTITLE_MODE_LABELS[
                    config?.SubtitleMode ?? SubtitlePlaybackMode.Default
                  ]
                }
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={24}
              color="#fff"
            />
            <ThemedText style={styles.menuText}>
              Épisode suivant automatique
            </ThemedText>
            <Switch
              value={config?.EnableNextEpisodeAutoPlay ?? true}
              onValueChange={() => toggleConfig("EnableNextEpisodeAutoPlay")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.EnableNextEpisodeAutoPlay ?? true) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="musical-notes-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>
              Mémoriser les pistes audio
            </ThemedText>
            <Switch
              value={config?.RememberAudioSelections ?? true}
              onValueChange={() => toggleConfig("RememberAudioSelections")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.RememberAudioSelections ?? true) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>
              Mémoriser les sous-titres
            </ThemedText>
            <Switch
              value={config?.RememberSubtitleSelections ?? true}
              onValueChange={() => toggleConfig("RememberSubtitleSelections")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.RememberSubtitleSelections ?? true)
                  ? "#E50914"
                  : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          {/* === AFFICHAGE === */}
          <ThemedText style={styles.sectionTitle}>Affichage</ThemedText>

          <View style={styles.menuItem}>
            <Ionicons name="eye-off-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>Épisodes manquants</ThemedText>
            <Switch
              value={config?.DisplayMissingEpisodes ?? false}
              onValueChange={() => toggleConfig("DisplayMissingEpisodes")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.DisplayMissingEpisodes ?? false) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="albums-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>
              Afficher les collections
            </ThemedText>
            <Switch
              value={config?.DisplayCollectionsView ?? false}
              onValueChange={() => toggleConfig("DisplayCollectionsView")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.DisplayCollectionsView ?? false) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>
              Masquer les vus dans Nouveautés
            </ThemedText>
            <Switch
              value={config?.HidePlayedInLatest ?? true}
              onValueChange={() => toggleConfig("HidePlayedInLatest")}
              trackColor={{ false: "#555", true: "#fff" }}
              thumbColor={
                (config?.HidePlayedInLatest ?? true) ? "#E50914" : "#fff"
              }
              {...(Platform.OS === "web"
                ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
                : {})}
              disabled={!config || saving}
            />
          </View>

          {/* === COMPTE === */}
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

          {/* === INFOS SERVEUR (admin) === */}
          {systemInfo && (
            <>
              <ThemedText style={styles.sectionTitle}>Serveur</ThemedText>

              <View style={styles.menuItem}>
                <Ionicons name="hardware-chip-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Système</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {systemInfo.OperatingSystem ?? "—"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="speedometer-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Transcodage</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {systemInfo.TranscodingTempPath
                      ? "Activé"
                      : "Non configuré"}
                  </ThemedText>
                </View>
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

          {/* === AUTRES === */}
          <ThemedText style={styles.sectionTitle}>Autres</ThemedText>

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

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color="#E50914" size="small" />
            <ThemedText style={styles.savingText}>Sauvegarde...</ThemedText>
          </View>
        )}
      </ScrollView>

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
