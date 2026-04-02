import { CategoriesListModal } from "@/components/CategoriesListModal/CategoriesListModal";
import { ThemedText } from "@/components/ThemedText";
import {
  useCurrentUser,
  usePublicSystemInfo,
  usePublicUsers,
  useSystemInfo,
} from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { usePreferencesStore } from "@/src/stores/preferencesStore";
import { Ionicons } from "@expo/vector-icons";
import type { UserConfiguration } from "@jellyfin/sdk/lib/generated-client/models";
import { SubtitlePlaybackMode } from "@jellyfin/sdk/lib/generated-client/models";
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

/** Labels lisibles pour SubtitlePlaybackMode */
const SUBTITLE_MODE_LABELS: Record<string, string> = {
  [SubtitlePlaybackMode.Default]: "Par défaut",
  [SubtitlePlaybackMode.Always]: "Toujours",
  [SubtitlePlaybackMode.OnlyForced]: "Forcés uniquement",
  [SubtitlePlaybackMode.None]: "Désactivés",
  [SubtitlePlaybackMode.Smart]: "Intelligent",
};

const SUBTITLE_MODES = Object.values(SubtitlePlaybackMode);

/** Langues courantes pour le cycle audio/sous-titres */
const MAX_AUDIO_CHANNELS = [
  { value: "-1", label: "Auto" },
  { value: "2", label: "Stéréo (2.0)" },
  { value: "6", label: "Surround (5.1)" },
  { value: "8", label: "Surround (7.1)" },
] as const;

const AUDIO_NORMALIZATION_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "track", label: "Gain de piste" },
  { value: "album", label: "Gain de l'album" },
] as const;

const SUB_STYLE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "custom", label: "Personnalisé" },
] as const;

const SUB_TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Petit" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grand" },
  { value: "extralarge", label: "Très grand" },
] as const;

const SUB_FONT_WEIGHT_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Gras" },
] as const;

const SUB_FONT_OPTIONS = [
  { value: "default", label: "Par défaut" },
  { value: "arial", label: "Arial" },
  { value: "helvetica", label: "Helvetica" },
  { value: "courier", label: "Courier" },
  { value: "times", label: "Times New Roman" },
  { value: "comic", label: "Comic Sans MS" },
] as const;

const SUB_TEXT_COLOR_OPTIONS = [
  { value: "#FFFFFF", label: "Blanc" },
  { value: "#FFFF00", label: "Jaune" },
  { value: "#00FF00", label: "Vert" },
  { value: "#00FFFF", label: "Cyan" },
  { value: "#0000FF", label: "Bleu" },
  { value: "#FF00FF", label: "Magenta" },
  { value: "#FF0000", label: "Rouge" },
  { value: "#000000", label: "Noir" },
] as const;

const SUB_DROP_SHADOW_OPTIONS = [
  { value: "none", label: "Aucune" },
  { value: "dropshadow", label: "Ombre portée" },
  { value: "raised", label: "Relief" },
  { value: "depressed", label: "Déprimé" },
  { value: "uniform", label: "Uniforme" },
] as const;

const THEME_OPTIONS = [
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
  { value: "system", label: "Système" },
] as const;

const DISPLAY_LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en-us", label: "English (United States)" },
  { value: "en-gb", label: "English (United Kingdom)" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh-cn", label: "中文 (简体)" },
  { value: "ru", label: "Русский" },
  { value: "ar", label: "العربية" },
  { value: "nl", label: "Nederlands" },
  { value: "pl", label: "Polski" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "nb", label: "Norsk" },
] as const;

const LOCALE_OPTIONS = [
  { value: "", label: "Identique à la langue d'affichage" },
  { value: "fr", label: "Français" },
  { value: "en-us", label: "English (United States)" },
  { value: "en-gb", label: "English (United Kingdom)" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh-cn", label: "中文 (简体)" },
  { value: "ru", label: "Русский" },
] as const;

const AUDIO_LANGUAGES = [
  "",
  "fre",
  "eng",
  "jpn",
  "ger",
  "spa",
  "ita",
  "por",
  "rus",
  "kor",
  "chi",
] as const;
const SUBTITLE_LANGUAGES = [
  "",
  "fre",
  "eng",
  "jpn",
  "ger",
  "spa",
  "ita",
  "por",
  "rus",
  "kor",
  "chi",
] as const;
const LANG_LABELS: Record<string, string> = {
  "": "Non définie",
  fre: "Français",
  eng: "Anglais",
  jpn: "Japonais",
  ger: "Allemand",
  spa: "Espagnol",
  ita: "Italien",
  por: "Portugais",
  rus: "Russe",
  kor: "Coréen",
  chi: "Chinois",
};

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

  const showServerName = usePreferencesStore((s) => s.showServerName);
  const setShowServerName = usePreferencesStore((s) => s.setShowServerName);
  const enableGamepad = usePreferencesStore((s) => s.enableGamepad);
  const setEnableGamepad = usePreferencesStore((s) => s.setEnableGamepad);
  const displayLanguage = usePreferencesStore((s) => s.displayLanguage);
  const setDisplayLanguage = usePreferencesStore((s) => s.setDisplayLanguage);
  const locale = usePreferencesStore((s) => s.locale);
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const libraryPageSize = usePreferencesStore((s) => s.libraryPageSize);
  const setLibraryPageSize = usePreferencesStore((s) => s.setLibraryPageSize);
  const showBackdrops = usePreferencesStore((s) => s.showBackdrops);
  const setShowBackdrops = usePreferencesStore((s) => s.setShowBackdrops);
  const playMusicThemes = usePreferencesStore((s) => s.playMusicThemes);
  const setPlayMusicThemes = usePreferencesStore((s) => s.setPlayMusicThemes);
  const playTrailers = usePreferencesStore((s) => s.playTrailers);
  const setPlayTrailers = usePreferencesStore((s) => s.setPlayTrailers);
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const fastAnimations = usePreferencesStore((s) => s.fastAnimations);
  const setFastAnimations = usePreferencesStore((s) => s.setFastAnimations);
  const blurPlaceholders = usePreferencesStore((s) => s.blurPlaceholders);
  const setBlurPlaceholders = usePreferencesStore((s) => s.setBlurPlaceholders);
  const nextUpExpiryDays = usePreferencesStore((s) => s.nextUpExpiryDays);
  const setNextUpExpiryDays = usePreferencesStore((s) => s.setNextUpExpiryDays);
  const allowWatchedNextUp = usePreferencesStore((s) => s.allowWatchedNextUp);
  const setAllowWatchedNextUp = usePreferencesStore(
    (s) => s.setAllowWatchedNextUp,
  );
  const useEpisodeImageNextUp = usePreferencesStore(
    (s) => s.useEpisodeImageNextUp,
  );
  const setUseEpisodeImageNextUp = usePreferencesStore(
    (s) => s.setUseEpisodeImageNextUp,
  );
  const maxAudioChannels = usePreferencesStore((s) => s.maxAudioChannels);
  const setMaxAudioChannels = usePreferencesStore((s) => s.setMaxAudioChannels);
  const disableVbrAudio = usePreferencesStore((s) => s.disableVbrAudio);
  const setDisableVbrAudio = usePreferencesStore((s) => s.setDisableVbrAudio);
  const audioNormalization = usePreferencesStore((s) => s.audioNormalization);
  const setAudioNormalization = usePreferencesStore(
    (s) => s.setAudioNormalization,
  );
  const remuxFlac = usePreferencesStore((s) => s.remuxFlac);
  const setRemuxFlac = usePreferencesStore((s) => s.setRemuxFlac);
  const remuxMp3 = usePreferencesStore((s) => s.remuxMp3);
  const setRemuxMp3 = usePreferencesStore((s) => s.setRemuxMp3);
  const experimentalPgsSubs = usePreferencesStore((s) => s.experimentalPgsSubs);
  const setExperimentalPgsSubs = usePreferencesStore(
    (s) => s.setExperimentalPgsSubs,
  );
  const alwaysBurnSubtitles = usePreferencesStore((s) => s.alwaysBurnSubtitles);
  const setAlwaysBurnSubtitles = usePreferencesStore(
    (s) => s.setAlwaysBurnSubtitles,
  );
  const subStyle = usePreferencesStore((s) => s.subStyle);
  const setSubStyle = usePreferencesStore((s) => s.setSubStyle);
  const subTextSize = usePreferencesStore((s) => s.subTextSize);
  const setSubTextSize = usePreferencesStore((s) => s.setSubTextSize);
  const subFontWeight = usePreferencesStore((s) => s.subFontWeight);
  const setSubFontWeight = usePreferencesStore((s) => s.setSubFontWeight);
  const subFont = usePreferencesStore((s) => s.subFont);
  const setSubFont = usePreferencesStore((s) => s.setSubFont);
  const subTextColor = usePreferencesStore((s) => s.subTextColor);
  const setSubTextColor = usePreferencesStore((s) => s.setSubTextColor);
  const subDropShadow = usePreferencesStore((s) => s.subDropShadow);
  const setSubDropShadow = usePreferencesStore((s) => s.setSubDropShadow);
  const subVerticalPos = usePreferencesStore((s) => s.subVerticalPos);
  const setSubVerticalPos = usePreferencesStore((s) => s.setSubVerticalPos);

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
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Quick Connect
  const [quickConnectVisible, setQuickConnectVisible] = useState(false);
  const [quickConnectCode, setQuickConnectCode] = useState("");
  const [quickConnectLoading, setQuickConnectLoading] = useState(false);
  const [quickConnectStatus, setQuickConnectStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [quickConnectError, setQuickConnectError] = useState("");
  const [audioSettingsVisible, setAudioSettingsVisible] = useState(false);
  const [displaySettingsVisible, setDisplaySettingsVisible] = useState(false);

  // Picker states
  const [showSubLangPicker, setShowSubLangPicker] = useState(false);
  const [showSubModePicker, setShowSubModePicker] = useState(false);
  const [showMaxChannelsPicker, setShowMaxChannelsPicker] = useState(false);
  const [showAudioLangPicker, setShowAudioLangPicker] = useState(false);
  const [showNormalizationPicker, setShowNormalizationPicker] = useState(false);
  const [subtitleSettingsVisible, setSubtitleSettingsVisible] = useState(false);
  const [showSubStylePicker, setShowSubStylePicker] = useState(false);
  const [showSubTextSizePicker, setShowSubTextSizePicker] = useState(false);
  const [showSubFontWeightPicker, setShowSubFontWeightPicker] = useState(false);
  const [showSubFontPicker, setShowSubFontPicker] = useState(false);
  const [showSubTextColorPicker, setShowSubTextColorPicker] = useState(false);
  const [showSubDropShadowPicker, setShowSubDropShadowPicker] = useState(false);
  const [showSubPreview, setShowSubPreview] = useState(false);
  const [showDisplayLangPicker, setShowDisplayLangPicker] = useState(false);
  const [showLocalePicker, setShowLocalePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAppLangPicker, setShowAppLangPicker] = useState(false);

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
      if (!serverUrl || !token || !userId) return;
      setSettingAvatar(true);
      try {
        const res = await fetch(`${serverUrl}/GetAvatar/SetAvatar`, {
          method: "POST",
          headers: {
            "X-Emby-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ UserId: userId, AvatarId: avatarId }),
        });
        if (res.ok) {
          setAvatarPickerVisible(false);
          // Forcer le refresh des images de profil partout
          bumpAvatarVersion();
          queryClient.invalidateQueries({
            queryKey: ["server", "currentUser"],
          });
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
            onPress={() => setSettingsVisible(true)}
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

      {/* Settings Modal (Lecture + Affichage) */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Paramètres</ThemedText>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* === AFFICHAGE === */}
              <ThemedText style={styles.sectionTitle}>Affichage</ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setDisplaySettingsVisible(true)}
              >
                <Ionicons name="tv-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Réglage de l&apos;affichage
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Épisodes, collections, serveur
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              {/* === AUDIO === */}
              <ThemedText style={styles.sectionTitle}>Audio</ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setAudioSettingsVisible(true)}
              >
                <Ionicons name="volume-high-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Réglages audio
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Canaux, langue, piste par défaut
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              {/* === SOUS-TITRES === */}
              <ThemedText style={styles.sectionTitle}>Sous-titres</ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setSubtitleSettingsVisible(true)}
              >
                <Ionicons name="text-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Réglages sous-titres
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Langue, mode, rendu PGS
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              {/* === CONTRÔLES === */}
              <ThemedText style={styles.sectionTitle}>Contrôles</ThemedText>

              <View style={styles.menuItem}>
                <Ionicons
                  name="game-controller-outline"
                  size={24}
                  color="#fff"
                />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Activer la manette de jeu
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Détecter le signal d&apos;entrée de toute manette connectée.
                    (Nécessite le mode d&apos;affichage &apos;TV&apos;.)
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.menuSubtext,
                      { marginTop: 4, fontStyle: "italic" },
                    ]}
                  >
                    Les changements prendront effet après un rechargement manuel
                    du client web.
                  </ThemedText>
                </View>
                <Switch
                  value={enableGamepad}
                  onValueChange={(val) => setEnableGamepad(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={enableGamepad ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              {/* === LANGUES DE L'APPLICATION === */}
              <ThemedText style={styles.sectionTitle}>
                Langues de l&apos;application
              </ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowAppLangPicker(true)}
              >
                <Ionicons name="language-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Réglage de la langue
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {displayLanguage === "fr" ? "Français" : "English"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showAppLangPicker}
                items={[
                  { id: "fr", label: "Français" },
                  { id: "en", label: "English" },
                ]}
                selectedId={displayLanguage}
                onSelect={(id) => setDisplayLanguage(id)}
                onClose={() => setShowAppLangPicker(false)}
              />

              {saving && (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator color="#E50914" size="small" />
                  <ThemedText style={styles.savingText}>
                    Sauvegarde...
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Display Settings Sub-Modal */}
      <Modal
        visible={displaySettingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDisplaySettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setDisplaySettingsVisible(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>
                Réglage de l&apos;affichage
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* === LOCALISATION === */}
              <ThemedText style={styles.sectionTitle}>Localisation</ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowDisplayLangPicker(true)}
              >
                <Ionicons name="globe-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Langue d&apos;affichage
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {DISPLAY_LANGUAGE_OPTIONS.find(
                      (o) => o.value === displayLanguage,
                    )?.label ?? displayLanguage}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showDisplayLangPicker}
                items={DISPLAY_LANGUAGE_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={displayLanguage}
                onSelect={(id) => setDisplayLanguage(id)}
                onClose={() => setShowDisplayLangPicker(false)}
              />
              <ThemedText
                style={[
                  styles.menuSubtext,
                  { marginBottom: 12, paddingHorizontal: 0 },
                ]}
              >
                La traduction de Jellyfin est un projet en cours.
              </ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowLocalePicker(true)}
              >
                <Ionicons name="location-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Paramètres régionaux
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {LOCALE_OPTIONS.find((o) => o.value === locale)?.label ??
                      locale}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showLocalePicker}
                items={LOCALE_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={locale}
                onSelect={(id) => setLocale(id)}
                onClose={() => setShowLocalePicker(false)}
              />

              {/* === AFFICHAGE (dans sub-modal) === */}
              <ThemedText style={[styles.sectionTitle, { marginTop: 28 }]}>
                Affichage
              </ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowThemePicker(true)}
              >
                <Ionicons name="color-palette-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Thème</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {THEME_OPTIONS.find((o) => o.value === theme)?.label ??
                      theme}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showThemePicker}
                items={THEME_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={theme}
                onSelect={(id) => setTheme(id)}
                onClose={() => setShowThemePicker(false)}
              />

              <View style={styles.menuItem}>
                <Ionicons name="flash-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Animations plus rapides
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Utiliser des animations et transitions plus rapides.
                  </ThemedText>
                </View>
                <Switch
                  value={fastAnimations}
                  onValueChange={(val) => setFastAnimations(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={fastAnimations ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="images-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Images floues de substitution
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Les images en cours de chargement seront remplacées par une
                    image générique floue.
                  </ThemedText>
                </View>
                <Switch
                  value={blurPlaceholders}
                  onValueChange={(val) => setBlurPlaceholders(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={blurPlaceholders ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="albums-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Afficher les collections
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Regrouper les films appartenant à une même collection
                  </ThemedText>
                </View>
                <Switch
                  value={config?.DisplayCollectionsView ?? false}
                  onValueChange={() => toggleConfig("DisplayCollectionsView")}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.DisplayCollectionsView ?? false)
                      ? "#E50914"
                      : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={24}
                  color="#fff"
                />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Masquer les vus dans Nouveautés
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Ne pas afficher les contenus déjà regardés dans la section
                    Nouveautés
                  </ThemedText>
                </View>
                <Switch
                  value={config?.HidePlayedInLatest ?? true}
                  onValueChange={() => toggleConfig("HidePlayedInLatest")}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.HidePlayedInLatest ?? true) ? "#E50914" : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="server-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Nom du serveur sur l&apos;accueil
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {showServerName
                      ? "Affiche le nom du serveur"
                      : 'Affiche "Accueil"'}
                  </ThemedText>
                </View>
                <Switch
                  value={showServerName}
                  onValueChange={(val) => setShowServerName(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={showServerName ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              {/* === MÉDIATHÈQUES === */}
              <ThemedText style={[styles.sectionTitle, { marginTop: 28 }]}>
                Médiathèques
              </ThemedText>

              <View style={styles.menuItem}>
                <Ionicons name="grid-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Taille des pages de la médiathèque
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Définir le nombre d&apos;éléments à afficher sur une page.
                    Une valeur à 0 désactive la pagination. Une valeur
                    supérieure à 100 peut produire des bugs ou une baisse des
                    performances.
                  </ThemedText>
                </View>
                <TextInput
                  style={{
                    color: "#fff",
                    backgroundColor: "#333",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    width: 60,
                    textAlign: "center",
                    fontSize: 15,
                  }}
                  value={libraryPageSize}
                  onChangeText={(t) => setLibraryPageSize(t)}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholderTextColor="#888"
                  placeholder="100"
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="image-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Arrière-plans</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Afficher les images d&apos;arrière-plan de certaines pages
                    pendant la navigation dans la médiathèque.
                  </ThemedText>
                </View>
                <Switch
                  value={showBackdrops}
                  onValueChange={(val) => setShowBackdrops(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={showBackdrops ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="musical-notes-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Thèmes musicaux
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Lire les thèmes musicaux en arrière-plan pendant la
                    navigation dans la médiathèque.
                  </ThemedText>
                </View>
                <Switch
                  value={playMusicThemes}
                  onValueChange={(val) => setPlayMusicThemes(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={playMusicThemes ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="videocam-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Génériques</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Lire les génériques en arrière-plan pendant la navigation
                    dans la médiathèque.
                  </ThemedText>
                </View>
                <Switch
                  value={playTrailers}
                  onValueChange={(val) => setPlayTrailers(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={playTrailers ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="eye-off-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Afficher les épisodes manquants dans les saisons
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Cette option doit aussi être activée pour les médiathèques
                    TV dans les paramètres du serveur.
                  </ThemedText>
                </View>
                <Switch
                  value={config?.DisplayMissingEpisodes ?? false}
                  onValueChange={() => toggleConfig("DisplayMissingEpisodes")}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.DisplayMissingEpisodes ?? false)
                      ? "#E50914"
                      : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              {/* === À SUIVRE === */}
              <ThemedText style={styles.sectionTitle}>À suivre</ThemedText>

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
                  onValueChange={() =>
                    toggleConfig("EnableNextEpisodeAutoPlay")
                  }
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.EnableNextEpisodeAutoPlay ?? true)
                      ? "#E50914"
                      : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="time-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Délai d'expiration dans 'À suivre'
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Définir le nombre de jours d'inactivité avant qu'une série
                    ne soit automatiquement ôtée de la section 'À suivre'.
                  </ThemedText>
                </View>
                <TextInput
                  style={styles.numberInput}
                  value={nextUpExpiryDays}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, "");
                    setNextUpExpiryDays(cleaned);
                  }}
                  keyboardType="number-pad"
                  maxLength={5}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="eye-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Autoriser le contenu déjà vu dans 'À suivre'
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Inclure les épisodes déjà vus à la section 'À suivre'.
                  </ThemedText>
                </View>
                <Switch
                  value={allowWatchedNextUp}
                  onValueChange={(val) => setAllowWatchedNextUp(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={allowWatchedNextUp ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="image-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Utiliser l'image de l'épisode pour 'À suivre' et 'Reprendre
                    le visionnage'
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Les sections 'À suivre' et 'Reprendre le visionnage'
                    utiliseront les images des épisodes comme vignettes plutôt
                    que la vignette principale de la série.
                  </ThemedText>
                </View>
                <Switch
                  value={useEpisodeImageNextUp}
                  onValueChange={(val) => setUseEpisodeImageNextUp(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={useEpisodeImageNextUp ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              {saving && (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator color="#E50914" size="small" />
                  <ThemedText style={styles.savingText}>
                    Sauvegarde...
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Audio Settings Sub-Modal */}
      <Modal
        visible={audioSettingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAudioSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setAudioSettingsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Réglages audio</ThemedText>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowMaxChannelsPicker(true)}
              >
                <Ionicons name="options-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Nombre maximal de canaux audio autorisés
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {MAX_AUDIO_CHANNELS.find(
                      (c) => c.value === maxAudioChannels,
                    )?.label ?? "Auto"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <CategoriesListModal
                visible={showMaxChannelsPicker}
                onClose={() => setShowMaxChannelsPicker(false)}
                items={MAX_AUDIO_CHANNELS.map((c) => ({
                  id: c.value,
                  label: c.label,
                }))}
                selectedId={maxAudioChannels}
                onSelect={(id) => setMaxAudioChannels(id)}
              />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowAudioLangPicker(true)}
                disabled={!config || saving}
              >
                <Ionicons name="language-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Langue audio préférée
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {LANG_LABELS[config?.AudioLanguagePreference ?? ""] ??
                      config?.AudioLanguagePreference ??
                      "Non définie"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <CategoriesListModal
                visible={showAudioLangPicker}
                onClose={() => setShowAudioLangPicker(false)}
                items={AUDIO_LANGUAGES.map((code) => ({
                  id: code,
                  label: LANG_LABELS[code] ?? code,
                }))}
                selectedId={config?.AudioLanguagePreference ?? ""}
                onSelect={(id) => {
                  if (!config) return;
                  saveConfig({
                    ...config,
                    AudioLanguagePreference: id || null,
                  });
                }}
              />

              <View style={styles.menuItem}>
                <Ionicons name="play-circle-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Utiliser le flux audio par défaut quelle que soit la langue
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
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="pulse-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Désactiver l&apos;encodage audio VBR
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Empêche le serveur d&apos;encoder l&apos;audio avec VBR pour
                    ce client.
                  </ThemedText>
                </View>
                <Switch
                  value={disableVbrAudio}
                  onValueChange={(val) => setDisableVbrAudio(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={disableVbrAudio ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              {/* === AUDIO AVANCÉ === */}
              <ThemedText style={styles.sectionTitle}>Audio Avancé</ThemedText>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowNormalizationPicker(true)}
              >
                <Ionicons name="analytics-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Normalisation de l&apos;audio
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {AUDIO_NORMALIZATION_OPTIONS.find(
                      (o) => o.value === audioNormalization,
                    )?.label ?? "Off"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <CategoriesListModal
                visible={showNormalizationPicker}
                onClose={() => setShowNormalizationPicker(false)}
                items={AUDIO_NORMALIZATION_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={audioNormalization}
                onSelect={(id) => setAudioNormalization(id)}
              />

              <View style={styles.menuItem}>
                <Ionicons name="disc-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Toujours remultiplexer les fichiers audio FLAC
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Si votre navigateur refuse de lire des fichiers ou calcule
                    incorrectement l&apos;horodatage
                  </ThemedText>
                </View>
                <Switch
                  value={remuxFlac}
                  onValueChange={(val) => setRemuxFlac(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={remuxFlac ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="musical-note-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Toujours remultiplexer les fichiers audio MP3
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Si votre navigateur calcule incorrectement l&apos;horodatage
                    de certains fichiers
                  </ThemedText>
                </View>
                <Switch
                  value={remuxMp3}
                  onValueChange={(val) => setRemuxMp3(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={remuxMp3 ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="musical-notes-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Mémoriser les pistes audio
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Retient la piste audio choisie manuellement pour chaque
                    contenu
                  </ThemedText>
                </View>
                <Switch
                  value={config?.RememberAudioSelections ?? true}
                  onValueChange={() => toggleConfig("RememberAudioSelections")}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.RememberAudioSelections ?? true)
                      ? "#E50914"
                      : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              {saving && (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator color="#E50914" size="small" />
                  <ThemedText style={styles.savingText}>
                    Sauvegarde...
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subtitle Settings Sub-Modal */}
      <Modal
        visible={subtitleSettingsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSubtitleSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSubtitleSettingsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Sous-titres</ThemedText>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubLangPicker(true)}
                disabled={!config || saving}
              >
                <Ionicons name="language-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Langue de sous-titrage préférée
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {LANG_LABELS[config?.SubtitleLanguagePreference ?? ""] ??
                      config?.SubtitleLanguagePreference ??
                      "N'importe quelle langue"}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <CategoriesListModal
                visible={showSubLangPicker}
                onClose={() => setShowSubLangPicker(false)}
                items={SUBTITLE_LANGUAGES.map((code) => ({
                  id: code,
                  label: LANG_LABELS[code] ?? code,
                }))}
                selectedId={config?.SubtitleLanguagePreference ?? ""}
                onSelect={(id) => {
                  if (!config) return;
                  saveConfig({
                    ...config,
                    SubtitleLanguagePreference: id || null,
                  });
                }}
              />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubModePicker(true)}
                disabled={!config || saving}
              >
                <Ionicons name="text-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Mode des sous-titres
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {
                      SUBTITLE_MODE_LABELS[
                        config?.SubtitleMode ?? SubtitlePlaybackMode.Default
                      ]
                    }
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <CategoriesListModal
                visible={showSubModePicker}
                onClose={() => setShowSubModePicker(false)}
                items={SUBTITLE_MODES.map((mode) => ({
                  id: mode,
                  label: SUBTITLE_MODE_LABELS[mode] ?? mode,
                }))}
                selectedId={
                  config?.SubtitleMode ?? SubtitlePlaybackMode.Default
                }
                onSelect={(id) => {
                  if (!config) return;
                  saveConfig({
                    ...config,
                    SubtitleMode: id as SubtitlePlaybackMode,
                  });
                }}
              />

              <ThemedText style={styles.menuSubtext}>
                Les sous-titres correspondant à la langue préférée seront
                chargés lorsque l&apos;audio est dans une langue étrangère.
              </ThemedText>

              <View style={styles.menuItem}>
                <Ionicons name="image-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Rendu expérimental des sous-titres PGS
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Rendre les sous-titres PGS côté client au lieu
                    d&apos;utiliser des sous-titres incrustés.
                  </ThemedText>
                </View>
                <Switch
                  value={experimentalPgsSubs}
                  onValueChange={(val) => setExperimentalPgsSubs(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={experimentalPgsSubs ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="bonfire-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Toujours incruster les sous-titres lors du transcodage
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Garantit la synchronisation au prix d&apos;une vitesse de
                    transcodage réduite.
                  </ThemedText>
                </View>
                <Switch
                  value={alwaysBurnSubtitles}
                  onValueChange={(val) => setAlwaysBurnSubtitles(val)}
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={alwaysBurnSubtitles ? "#E50914" : "#fff"}
                  {...(Platform.OS === "web"
                    ? ({ activeThumbColor: "#E50914" } as Record<
                        string,
                        string
                      >)
                    : {})}
                />
              </View>

              <View style={styles.menuItem}>
                <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Mémoriser les sous-titres
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Retient la piste de sous-titres choisie manuellement pour
                    chaque contenu
                  </ThemedText>
                </View>
                <Switch
                  value={config?.RememberSubtitleSelections ?? true}
                  onValueChange={() =>
                    toggleConfig("RememberSubtitleSelections")
                  }
                  trackColor={{ false: "#555", true: "#fff" }}
                  thumbColor={
                    (config?.RememberSubtitleSelections ?? true)
                      ? "#E50914"
                      : "#fff"
                  }
                  {...(Platform.OS === "web"
                    ? ({
                        activeThumbColor: "#E50914",
                      } as Record<string, string>)
                    : {})}
                  disabled={!config || saving}
                />
              </View>

              {/* --- Apparence des sous-titres --- */}
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { marginTop: 28, marginBottom: 4 },
                ]}
              >
                Apparence des sous-titres
              </ThemedText>
              <ThemedText
                style={[
                  styles.menuSubtext,
                  { marginBottom: 4, paddingHorizontal: 0 },
                ]}
              >
                Ces réglages s&apos;appliquent uniquement à la lecture côté
                client.
              </ThemedText>
              <ThemedText
                style={[
                  styles.menuSubtext,
                  { marginBottom: 12, paddingHorizontal: 0 },
                ]}
              >
                Ils ne modifient pas les sous-titres incrustés dans la vidéo.
              </ThemedText>

              {/* Style */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubStylePicker(true)}
              >
                <Ionicons name="color-palette-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Style</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_STYLE_OPTIONS.find((o) => o.value === subStyle)
                      ?.label ?? subStyle}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubStylePicker}
                items={SUB_STYLE_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subStyle}
                onSelect={(id) => setSubStyle(id)}
                onClose={() => setShowSubStylePicker(false)}
              />

              <ThemedText
                style={[
                  styles.menuSubtext,
                  { marginBottom: 12, paddingHorizontal: 0 },
                ]}
              >
                En mode « Auto », l&apos;apparence dépend du lecteur utilisé.
              </ThemedText>

              {/* Taille du texte */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubTextSizePicker(true)}
              >
                <Ionicons name="text-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Taille du texte
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_TEXT_SIZE_OPTIONS.find((o) => o.value === subTextSize)
                      ?.label ?? subTextSize}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubTextSizePicker}
                items={SUB_TEXT_SIZE_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subTextSize}
                onSelect={(id) => setSubTextSize(id)}
                onClose={() => setShowSubTextSizePicker(false)}
              />

              {/* Poids de la police */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubFontWeightPicker(true)}
              >
                <Ionicons name="text-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Poids de la police
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_FONT_WEIGHT_OPTIONS.find(
                      (o) => o.value === subFontWeight,
                    )?.label ?? subFontWeight}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubFontWeightPicker}
                items={SUB_FONT_WEIGHT_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subFontWeight}
                onSelect={(id) => setSubFontWeight(id)}
                onClose={() => setShowSubFontWeightPicker(false)}
              />

              {/* Police */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubFontPicker(true)}
              >
                <Ionicons name="language-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Police</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_FONT_OPTIONS.find((o) => o.value === subFont)?.label ??
                      subFont}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubFontPicker}
                items={SUB_FONT_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subFont}
                onSelect={(id) => setSubFont(id)}
                onClose={() => setShowSubFontPicker(false)}
              />

              {/* Couleur du texte */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubTextColorPicker(true)}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: subTextColor,
                    borderWidth: 2,
                    borderColor: "#555",
                  }}
                />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Couleur du texte
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_TEXT_COLOR_OPTIONS.find(
                      (o) => o.value === subTextColor,
                    )?.label ?? subTextColor}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubTextColorPicker}
                items={SUB_TEXT_COLOR_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subTextColor}
                onSelect={(id) => setSubTextColor(id)}
                onClose={() => setShowSubTextColorPicker(false)}
              />

              {/* Ombre portée */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowSubDropShadowPicker(true)}
              >
                <Ionicons name="contrast-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Ombre portée</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    {SUB_DROP_SHADOW_OPTIONS.find(
                      (o) => o.value === subDropShadow,
                    )?.label ?? subDropShadow}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
              <CategoriesListModal
                visible={showSubDropShadowPicker}
                items={SUB_DROP_SHADOW_OPTIONS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                selectedId={subDropShadow}
                onSelect={(id) => setSubDropShadow(id)}
                onClose={() => setShowSubDropShadowPicker(false)}
              />

              {/* Position verticale */}
              <View style={styles.menuItem}>
                <Ionicons name="resize-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>
                    Position verticale
                  </ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Valeur négative = plus bas
                  </ThemedText>
                </View>
                <TextInput
                  style={{
                    color: "#fff",
                    backgroundColor: "#333",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    width: 60,
                    textAlign: "center",
                    fontSize: 15,
                  }}
                  value={subVerticalPos}
                  onChangeText={(t) => setSubVerticalPos(t)}
                  keyboardType="numbers-and-punctuation"
                  maxLength={4}
                  placeholderTextColor="#888"
                  placeholder="-1"
                />
              </View>

              {/* Aperçu */}
              <TouchableOpacity
                style={[styles.menuItem, { marginTop: 16 }]}
                onPress={() => setShowSubPreview((v) => !v)}
              >
                <Ionicons name="eye-outline" size={24} color="#fff" />
                <View style={styles.menuTextContainer}>
                  <ThemedText style={styles.menuText}>Aperçu</ThemedText>
                  <ThemedText style={styles.menuSubtext}>
                    Prévisualiser le rendu des sous-titres
                  </ThemedText>
                </View>
                <Ionicons
                  name={showSubPreview ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
              {showSubPreview && (
                <View
                  style={{
                    backgroundColor: "#000",
                    borderRadius: 12,
                    padding: 20,
                    marginTop: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 80,
                  }}
                >
                  <ThemedText
                    style={{
                      color: subTextColor,
                      fontSize:
                        subTextSize === "small"
                          ? 14
                          : subTextSize === "large"
                            ? 22
                            : subTextSize === "extralarge"
                              ? 28
                              : 17,
                      fontWeight: subFontWeight === "bold" ? "bold" : "normal",
                      textShadowColor:
                        subDropShadow === "dropshadow"
                          ? "rgba(0,0,0,0.8)"
                          : subDropShadow === "raised"
                            ? "rgba(255,255,255,0.4)"
                            : subDropShadow === "uniform"
                              ? "#000"
                              : "transparent",
                      textShadowOffset:
                        subDropShadow === "raised"
                          ? { width: -1, height: -1 }
                          : subDropShadow === "depressed"
                            ? { width: 1, height: 1 }
                            : { width: 1, height: 1 },
                      textShadowRadius:
                        subDropShadow === "none"
                          ? 0
                          : subDropShadow === "uniform"
                            ? 0
                            : 3,
                      fontFamily:
                        subFont === "default"
                          ? undefined
                          : subFont === "comic"
                            ? "Comic Sans MS"
                            : subFont === "courier"
                              ? "Courier New"
                              : subFont === "times"
                                ? "Times New Roman"
                                : subFont.charAt(0).toUpperCase() +
                                  subFont.slice(1),
                    }}
                  >
                    Exemple de sous-titre
                  </ThemedText>
                </View>
              )}

              {saving && (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator color="#E50914" size="small" />
                  <ThemedText style={styles.savingText}>
                    Sauvegarde...
                  </ThemedText>
                </View>
              )}
            </ScrollView>
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
