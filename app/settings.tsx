import { CategoriesListModal } from "@/components/CategoriesListModal/CategoriesListModal";
import { ThemedText } from "@/components/ThemedText";
import {
  useCurrentUser,
  useSystemInfo,
} from "@/src/api/queries/useServerQueries";
import { useAuthStore } from "@/src/stores/authStore";
import { usePreferencesStore } from "@/src/stores/preferencesStore";
import { Ionicons } from "@expo/vector-icons";
import type {
  BaseItemDto,
  DisplayPreferencesDto,
  UserConfiguration,
} from "@jellyfin/sdk/lib/generated-client/models";
import { SubtitlePlaybackMode } from "@jellyfin/sdk/lib/generated-client/models";
import { getDisplayPreferencesApi } from "@jellyfin/sdk/lib/utils/api/display-preferences-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { getUserViewsApi } from "@jellyfin/sdk/lib/utils/api/user-views-api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ═══════════════════════════════════════════
// CONSTANTES ET OPTIONS
// ═══════════════════════════════════════════

const SUBTITLE_MODE_LABELS: Record<string, string> = {
  [SubtitlePlaybackMode.Default]: "Par défaut",
  [SubtitlePlaybackMode.Always]: "Toujours",
  [SubtitlePlaybackMode.OnlyForced]: "Forcés uniquement",
  [SubtitlePlaybackMode.None]: "Désactivés",
  [SubtitlePlaybackMode.Smart]: "Intelligent",
};
const SUBTITLE_MODES = Object.values(SubtitlePlaybackMode);

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

const MIN_RESUME_PCT_OPTIONS = [
  { value: "0", label: "0% (dès le début)" },
  { value: "2", label: "2%" },
  { value: "5", label: "5% (par défaut)" },
  { value: "10", label: "10%" },
] as const;

const MAX_RESUME_PCT_OPTIONS = [
  { value: "80", label: "80%" },
  { value: "90", label: "90% (par défaut)" },
  { value: "95", label: "95%" },
] as const;

const MIN_RESUME_DURATION_OPTIONS = [
  { value: "0", label: "Aucune durée minimum" },
  { value: "60", label: "1 minute" },
  { value: "120", label: "2 minutes" },
  { value: "300", label: "5 minutes (par défaut)" },
  { value: "600", label: "10 minutes" },
] as const;

const RECENT_ITEM_DAYS_OPTIONS = [
  { value: "3", label: "3 jours" },
  { value: "7", label: "7 jours (par défaut)" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
  { value: "60", label: "60 jours" },
] as const;

const HOME_SECTION_OPTIONS = [
  { value: "smalllibrarytiles", label: "Mes médias" },
  { value: "resume", label: "Reprendre la lecture" },
  { value: "resumeaudio", label: "Reprendre l'écoute" },
  { value: "nextup", label: "À suivre" },
  { value: "latestmedia", label: "Médias récemment ajoutés" },
  { value: "livetv", label: "TV en direct" },
  { value: "activerecordings", label: "Enregistrements actifs" },
  { value: "none", label: "Aucun" },
] as const;

const HOME_SECTION_DEFAULTS = [
  "smalllibrarytiles",
  "resume",
  "nextup",
  "resume",
  "latestmedia",
  "none",
  "none",
  "none",
  "none",
  "none",
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

// ═══════════════════════════════════════════
// COMPOSANT SECTION ACCORDÉON
// ═══════════════════════════════════════════

function AccordionSection({
  title,
  icon,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const height = useSharedValue(defaultOpen ? 1 : 0);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    height.value = withTiming(next ? 1 : 0, { duration: 250 });
  };

  const animStyle = useAnimatedStyle(() => ({
    maxHeight: height.value * 5000,
    opacity: height.value,
    overflow: "hidden" as const,
  }));

  return (
    <View style={s.accordionContainer}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={toggleOpen}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={22} color="#fff" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ThemedText style={s.accordionTitle}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={s.accordionSubtitle}>{subtitle}</ThemedText>
          )}
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#888"
        />
      </TouchableOpacity>
      <Animated.View style={animStyle}>
        <View style={s.accordionContent}>{children}</View>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════
// COMPOSANTS HELPERS
// ═══════════════════════════════════════════

function SettingRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={s.settingRow} onPress={onPress} activeOpacity={0.7}>
      {icon && <Ionicons name={icon} size={22} color="#fff" />}
      <View style={s.settingTextContainer}>
        <ThemedText style={s.settingLabel}>{label}</ThemedText>
        {sublabel && (
          <ThemedText style={s.settingSubLabel}>{sublabel}</ThemedText>
        )}
      </View>
      {right}
    </Wrapper>
  );
}

function SettingSwitch({
  icon,
  label,
  sublabel,
  value,
  onValueChange,
  disabled,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingRow
      icon={icon}
      label={label}
      sublabel={sublabel}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#555", true: "#fff" }}
          thumbColor={value ? "#E50914" : "#fff"}
          {...(Platform.OS === "web"
            ? ({ activeThumbColor: "#E50914" } as Record<string, string>)
            : {})}
          disabled={disabled}
        />
      }
    />
  );
}

function SettingPicker({
  icon,
  label,
  sublabel,
  value,
  options,
  onSelect,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const displayLabel = options.find((o) => o.id === value)?.label ?? value;
  return (
    <>
      <SettingRow
        icon={icon}
        label={label}
        sublabel={sublabel ?? displayLabel}
        onPress={() => setVisible(true)}
        right={<Ionicons name="chevron-down" size={18} color="#666" />}
      />
      <CategoriesListModal
        visible={visible}
        onClose={() => setVisible(false)}
        items={options}
        selectedId={value}
        onSelect={(id) => {
          onSelect(id);
          setVisible(false);
        }}
      />
    </>
  );
}

// ═══════════════════════════════════════════
// PAGE SETTINGS
// ═══════════════════════════════════════════

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);

  // Preferences store
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
  const recentItemDays = usePreferencesStore((s) => s.recentItemDays);
  const setRecentItemDays = usePreferencesStore((s) => s.setRecentItemDays);
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

  // Server data
  const { data: userData } = useCurrentUser();
  const { data: systemInfo } = useSystemInfo();
  const config = userData?.Configuration ?? null;

  const [saving, setSaving] = useState(false);
  const [showSubPreview, setShowSubPreview] = useState(false);

  // Personnalisation (DisplayPreferences + UserViews)
  const [displayPrefs, setDisplayPrefs] =
    useState<DisplayPreferencesDto | null>(null);
  const [userViews, setUserViews] = useState<BaseItemDto[]>([]);
  const [homeSections, setHomeSections] = useState<string[]>([
    ...HOME_SECTION_DEFAULTS,
  ]);
  const [loadingViews, setLoadingViews] = useState(false);

  // Playback server config
  const [minResumePct, setMinResumePct] = useState("5");
  const [maxResumePct, setMaxResumePct] = useState("90");
  const [minResumeDuration, setMinResumeDuration] = useState("300");
  const [savingServerConfig, setSavingServerConfig] = useState(false);

  useEffect(() => {
    if (serverUrl && token && userData?.Policy?.IsAdministrator) {
      fetchServerConfig();
    }
  }, [serverUrl, token, userData?.Policy?.IsAdministrator]);

  // Fetch display preferences + user views
  useEffect(() => {
    if (api && userId) {
      fetchDisplayPrefs();
      fetchUserViews();
    }
  }, [api, userId]);

  const fetchDisplayPrefs = useCallback(async () => {
    if (!api || !userId) return;
    try {
      const dpApi = getDisplayPreferencesApi(api);
      const { data } = await dpApi.getDisplayPreferences({
        displayPreferencesId: "usersettings",
        client: "emby",
        userId,
      });
      setDisplayPrefs(data);
      const prefs = data.CustomPrefs ?? {};
      const sections = Array.from(
        { length: 10 },
        (_, i) =>
          prefs[`homesection${i}`] ?? HOME_SECTION_DEFAULTS[i] ?? "none",
      );
      setHomeSections(sections);
    } catch {
      // Silently fail
    }
  }, [api, userId]);

  const fetchUserViews = useCallback(async () => {
    if (!api || !userId) return;
    setLoadingViews(true);
    try {
      const viewsApi = getUserViewsApi(api);
      const { data } = await viewsApi.getUserViews({ userId });
      setUserViews(data.Items ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoadingViews(false);
    }
  }, [api, userId]);

  const saveHomeSection = useCallback(
    async (index: number, value: string) => {
      if (!api || !userId || !displayPrefs) return;
      const newSections = [...homeSections];
      newSections[index] = value;
      setHomeSections(newSections);
      const newPrefs = {
        ...displayPrefs,
        CustomPrefs: { ...(displayPrefs.CustomPrefs ?? {}) },
      };
      newPrefs.CustomPrefs[`homesection${index}`] = value;
      setDisplayPrefs(newPrefs);
      try {
        const dpApi = getDisplayPreferencesApi(api);
        await dpApi.updateDisplayPreferences({
          displayPreferencesId: "usersettings",
          client: "emby",
          userId,
          displayPreferencesDto: newPrefs,
        });
      } catch {
        if (Platform.OS === "web") alert("Erreur lors de la sauvegarde");
        else Alert.alert("Erreur", "Impossible de sauvegarder");
      }
    },
    [api, userId, displayPrefs, homeSections],
  );

  const fetchServerConfig = useCallback(async () => {
    if (!serverUrl || !token) return;
    try {
      const base = serverUrl.replace(/\/+$/, "");
      const resp = await fetch(`${base}/System/Configuration`, {
        headers: { Authorization: `MediaBrowser Token="${token}"` },
      });
      if (resp.ok) {
        const cfg = await resp.json();
        setMinResumePct(String(cfg.MinResumePct ?? 5));
        setMaxResumePct(String(cfg.MaxResumePct ?? 90));
        setMinResumeDuration(String(cfg.MinResumeDurationSeconds ?? 300));
      }
    } catch {
      // Silently fail
    }
  }, [serverUrl, token]);

  const saveServerConfigField = useCallback(
    async (field: string, value: number) => {
      if (!serverUrl || !token) return;
      setSavingServerConfig(true);
      try {
        const base = serverUrl.replace(/\/+$/, "");
        const headers = {
          Authorization: `MediaBrowser Token="${token}"`,
          "Content-Type": "application/json",
        };
        const resp = await fetch(`${base}/System/Configuration`, { headers });
        if (!resp.ok) return;
        const cfg = await resp.json();
        (cfg as Record<string, unknown>)[field] = value;
        await fetch(`${base}/System/Configuration`, {
          method: "POST",
          headers,
          body: JSON.stringify(cfg),
        });
      } catch {
        if (Platform.OS === "web") alert("Erreur lors de la sauvegarde");
        else Alert.alert("Erreur", "Impossible de sauvegarder");
      } finally {
        setSavingServerConfig(false);
      }
    },
    [serverUrl, token],
  );

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
        if (Platform.OS === "web") alert("Erreur lors de la sauvegarde");
        else Alert.alert("Erreur", "Impossible de sauvegarder");
      } finally {
        setSaving(false);
      }
    },
    [api, queryClient],
  );

  const toggleConfig = useCallback(
    (key: keyof UserConfiguration) => {
      if (!config) return;
      saveConfig({ ...config, [key]: !config[key] });
    },
    [config, saveConfig],
  );

  const toggleLibraryExclude = useCallback(
    (
      libraryId: string,
      excludeList: "LatestItemsExcludes" | "MyMediaExcludes",
    ) => {
      if (!config) return;
      const current = (config[excludeList] as string[] | undefined) ?? [];
      const isExcluded = current.includes(libraryId);
      const updated = isExcluded
        ? current.filter((id) => id !== libraryId)
        : [...current, libraryId];
      saveConfig({ ...config, [excludeList]: updated });
    },
    [config, saveConfig],
  );

  const toggleGroupedFolder = useCallback(
    (libraryId: string) => {
      if (!config) return;
      const current = config.GroupedFolders ?? [];
      const isGrouped = current.includes(libraryId);
      const updated = isGrouped
        ? current.filter((id) => id !== libraryId)
        : [...current, libraryId];
      saveConfig({ ...config, GroupedFolders: updated });
    },
    [config, saveConfig],
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }} />
        <ThemedText style={s.headerTitle}>Paramètres</ThemedText>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) router.dismissAll();
              else router.replace("/(tabs)");
            }}
            style={s.closeButton}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ PERSONNALISATION ═══ */}
        <AccordionSection
          title="Personnalisation"
          icon="home-outline"
          subtitle="Sections de l'accueil, médiathèque"
        >
          <SettingSwitch
            icon="checkmark-done-outline"
            label="Masquer le contenu déjà vu dans 'Ajouts récents'"
            value={config?.HidePlayedInLatest ?? true}
            onValueChange={() => toggleConfig("HidePlayedInLatest")}
            disabled={!config || saving}
          />

          <View style={s.subSectionDivider} />
          <ThemedText style={s.subSectionTitle}>
            Sections de l&apos;accueil
          </ThemedText>

          {homeSections.map((section, index) => (
            <SettingPicker
              key={`homesection-${index}`}
              icon={undefined}
              label={`Section ${index + 1}`}
              value={section}
              options={HOME_SECTION_OPTIONS.map((o) => ({
                id: o.value,
                label: o.label,
              }))}
              onSelect={(id) => saveHomeSection(index, id)}
            />
          ))}

          {userViews.length > 0 && (
            <>
              <View style={s.subSectionDivider} />
              <ThemedText style={s.subSectionTitle}>
                Ordre de la médiathèque
              </ThemedText>
              {(() => {
                const ordered = config?.OrderedViews ?? [];
                const sorted = [...userViews].sort((a, b) => {
                  const ia = ordered.indexOf(a.Id ?? "");
                  const ib = ordered.indexOf(b.Id ?? "");
                  if (ia === -1 && ib === -1) return 0;
                  if (ia === -1) return 1;
                  if (ib === -1) return -1;
                  return ia - ib;
                });
                return sorted.map((view) => (
                  <View key={view.Id} style={s.settingRow}>
                    <Ionicons
                      name="reorder-three-outline"
                      size={22}
                      color="#666"
                    />
                    <ThemedText style={[s.settingLabel, { flex: 1 }]}>
                      {view.Name}
                    </ThemedText>
                  </View>
                ));
              })()}

              <View style={s.subSectionDivider} />
              <ThemedText style={s.subSectionTitle}>Médiathèques</ThemedText>
              {userViews.map((view) => {
                const viewId = view.Id ?? "";
                const myMediaExcluded = (
                  config?.MyMediaExcludes ?? []
                ).includes(viewId);
                const latestExcluded = (
                  config?.LatestItemsExcludes ?? []
                ).includes(viewId);
                return (
                  <View key={viewId} style={s.libraryBlock}>
                    <ThemedText style={s.libraryName}>{view.Name}</ThemedText>
                    <SettingSwitch
                      label="Afficher sur l'écran d'accueil"
                      value={!myMediaExcluded}
                      onValueChange={() =>
                        toggleLibraryExclude(viewId, "MyMediaExcludes")
                      }
                      disabled={!config || saving}
                    />
                    <SettingSwitch
                      label="Afficher dans 'Ajouts récents' et 'Reprendre'"
                      value={!latestExcluded}
                      onValueChange={() =>
                        toggleLibraryExclude(viewId, "LatestItemsExcludes")
                      }
                      disabled={!config || saving}
                    />
                  </View>
                );
              })}

              <View style={s.subSectionDivider} />
              <ThemedText style={s.subSectionTitle}>
                Dossiers groupés
              </ThemedText>
              <ThemedText
                style={[
                  s.settingSubLabel,
                  { paddingHorizontal: 8, marginBottom: 4 },
                ]}
              >
                Regrouper automatiquement par catégories (Films, Séries...)
              </ThemedText>
              {userViews.map((view) => {
                const viewId = view.Id ?? "";
                const isGrouped = (config?.GroupedFolders ?? []).includes(
                  viewId,
                );
                return (
                  <SettingSwitch
                    key={`grouped-${viewId}`}
                    label={view.Name ?? ""}
                    value={isGrouped}
                    onValueChange={() => toggleGroupedFolder(viewId)}
                    disabled={!config || saving}
                  />
                );
              })}
            </>
          )}
          {loadingViews && (
            <View style={s.savingRow}>
              <ActivityIndicator color="#E50914" size="small" />
              <ThemedText style={s.savingText}>Chargement...</ThemedText>
            </View>
          )}
        </AccordionSection>

        {/* ═══ AFFICHAGE ═══ */}
        <AccordionSection
          title="Affichage"
          icon="tv-outline"
          subtitle="Thème, langue, collections"
        >
          <SettingPicker
            icon="color-palette-outline"
            label="Thème"
            value={theme}
            options={THEME_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={(id) => setTheme(id)}
          />
          <SettingPicker
            icon="globe-outline"
            label="Langue d'affichage"
            value={displayLanguage}
            options={DISPLAY_LANGUAGE_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={(id) => setDisplayLanguage(id)}
          />
          <SettingPicker
            icon="location-outline"
            label="Paramètres régionaux"
            value={locale}
            options={LOCALE_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={(id) => setLocale(id)}
          />
          <SettingSwitch
            icon="flash-outline"
            label="Animations rapides"
            value={fastAnimations}
            onValueChange={setFastAnimations}
          />
          <SettingSwitch
            icon="images-outline"
            label="Images floues de substitution"
            sublabel="Remplace les images en chargement par un placeholder flou"
            value={blurPlaceholders}
            onValueChange={setBlurPlaceholders}
          />
          <SettingSwitch
            icon="albums-outline"
            label="Afficher les collections"
            sublabel="Regrouper les films d'une même collection"
            value={config?.DisplayCollectionsView ?? false}
            onValueChange={() => toggleConfig("DisplayCollectionsView")}
            disabled={!config || saving}
          />
          <SettingSwitch
            icon="server-outline"
            label="Nom du serveur sur l'accueil"
            sublabel={
              showServerName ? "Affiche le nom du serveur" : 'Affiche "Accueil"'
            }
            value={showServerName}
            onValueChange={setShowServerName}
          />
          <SettingSwitch
            icon="image-outline"
            label="Arrière-plans"
            sublabel="Afficher les images d'arrière-plan pendant la navigation"
            value={showBackdrops}
            onValueChange={setShowBackdrops}
          />
          <SettingSwitch
            icon="musical-notes-outline"
            label="Thèmes musicaux"
            sublabel="Lire les thèmes musicaux en arrière-plan"
            value={playMusicThemes}
            onValueChange={setPlayMusicThemes}
          />
          <SettingSwitch
            icon="videocam-outline"
            label="Génériques"
            sublabel="Lire les génériques en arrière-plan"
            value={playTrailers}
            onValueChange={setPlayTrailers}
          />
          <SettingSwitch
            icon="eye-off-outline"
            label="Épisodes manquants dans les saisons"
            sublabel="Doit aussi être activé côté serveur"
            value={config?.DisplayMissingEpisodes ?? false}
            onValueChange={() => toggleConfig("DisplayMissingEpisodes")}
            disabled={!config || saving}
          />
          <SettingRow
            icon="grid-outline"
            label="Taille des pages médiathèque"
            right={
              <TextInput
                style={s.numberInput}
                value={libraryPageSize}
                onChangeText={setLibraryPageSize}
                keyboardType="number-pad"
                maxLength={4}
                placeholderTextColor="#888"
                placeholder="100"
              />
            }
          />
        </AccordionSection>

        {/* ═══ AUDIO ═══ */}
        <AccordionSection
          title="Audio"
          icon="volume-high-outline"
          subtitle="Canaux, langue, normalisation"
        >
          <SettingPicker
            icon="options-outline"
            label="Canaux audio max"
            value={maxAudioChannels}
            options={MAX_AUDIO_CHANNELS.map((c) => ({
              id: c.value,
              label: c.label,
            }))}
            onSelect={setMaxAudioChannels}
          />
          <SettingPicker
            icon="language-outline"
            label="Langue audio préférée"
            value={config?.AudioLanguagePreference ?? ""}
            options={AUDIO_LANGUAGES.map((code) => ({
              id: code,
              label: LANG_LABELS[code] ?? code,
            }))}
            onSelect={(id) => {
              if (!config) return;
              saveConfig({ ...config, AudioLanguagePreference: id || null });
            }}
          />
          <SettingSwitch
            icon="play-circle-outline"
            label="Flux audio par défaut quelle que soit la langue"
            value={config?.PlayDefaultAudioTrack ?? true}
            onValueChange={() => toggleConfig("PlayDefaultAudioTrack")}
            disabled={!config || saving}
          />
          <SettingSwitch
            icon="pulse-outline"
            label="Désactiver l'encodage audio VBR"
            sublabel="Empêche le serveur d'encoder l'audio avec VBR"
            value={disableVbrAudio}
            onValueChange={setDisableVbrAudio}
          />
          <SettingPicker
            icon="analytics-outline"
            label="Normalisation audio"
            value={audioNormalization}
            options={AUDIO_NORMALIZATION_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setAudioNormalization}
          />
          <SettingSwitch
            icon="disc-outline"
            label="Remultiplexer les FLAC"
            sublabel="Si le navigateur refuse de lire ou calcule mal l'horodatage"
            value={remuxFlac}
            onValueChange={setRemuxFlac}
          />
          <SettingSwitch
            icon="musical-note-outline"
            label="Remultiplexer les MP3"
            sublabel="Si l'horodatage de certains fichiers est incorrect"
            value={remuxMp3}
            onValueChange={setRemuxMp3}
          />
          <SettingSwitch
            icon="musical-notes-outline"
            label="Mémoriser les pistes audio"
            sublabel="Retient la piste audio choisie pour chaque contenu"
            value={config?.RememberAudioSelections ?? true}
            onValueChange={() => toggleConfig("RememberAudioSelections")}
            disabled={!config || saving}
          />
        </AccordionSection>

        {/* ═══ SOUS-TITRES ═══ */}
        <AccordionSection
          title="Sous-titres"
          icon="text-outline"
          subtitle="Langue, mode, apparence"
        >
          <SettingPicker
            icon="language-outline"
            label="Langue de sous-titrage préférée"
            value={config?.SubtitleLanguagePreference ?? ""}
            options={SUBTITLE_LANGUAGES.map((code) => ({
              id: code,
              label: LANG_LABELS[code] ?? code,
            }))}
            onSelect={(id) => {
              if (!config) return;
              saveConfig({ ...config, SubtitleLanguagePreference: id || null });
            }}
          />
          <SettingPicker
            icon="text-outline"
            label="Mode des sous-titres"
            value={config?.SubtitleMode ?? SubtitlePlaybackMode.Default}
            options={SUBTITLE_MODES.map((mode) => ({
              id: mode,
              label: SUBTITLE_MODE_LABELS[mode] ?? mode,
            }))}
            onSelect={(id) => {
              if (!config) return;
              saveConfig({
                ...config,
                SubtitleMode: id as SubtitlePlaybackMode,
              });
            }}
          />
          <SettingSwitch
            icon="image-outline"
            label="Rendu expérimental PGS"
            sublabel="Rendre côté client au lieu de sous-titres incrustés"
            value={experimentalPgsSubs}
            onValueChange={setExperimentalPgsSubs}
          />
          <SettingSwitch
            icon="bonfire-outline"
            label="Toujours incruster les sous-titres"
            sublabel="Garantit la synchronisation (transcodage plus lent)"
            value={alwaysBurnSubtitles}
            onValueChange={setAlwaysBurnSubtitles}
          />
          <SettingSwitch
            icon="chatbubble-outline"
            label="Mémoriser les sous-titres"
            sublabel="Retient la piste de sous-titres pour chaque contenu"
            value={config?.RememberSubtitleSelections ?? true}
            onValueChange={() => toggleConfig("RememberSubtitleSelections")}
            disabled={!config || saving}
          />

          {/* Apparence */}
          <View style={s.subSectionDivider} />
          <ThemedText style={s.subSectionTitle}>Apparence</ThemedText>

          <SettingPicker
            icon="color-palette-outline"
            label="Style"
            sublabel={"Mode « Auto » = dépend du lecteur"}
            value={subStyle}
            options={SUB_STYLE_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubStyle}
          />
          <SettingPicker
            icon="text-outline"
            label="Taille du texte"
            value={subTextSize}
            options={SUB_TEXT_SIZE_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubTextSize}
          />
          <SettingPicker
            icon="text-outline"
            label="Poids de la police"
            value={subFontWeight}
            options={SUB_FONT_WEIGHT_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubFontWeight}
          />
          <SettingPicker
            icon="language-outline"
            label="Police"
            value={subFont}
            options={SUB_FONT_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubFont}
          />
          <SettingPicker
            label="Couleur du texte"
            value={subTextColor}
            options={SUB_TEXT_COLOR_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubTextColor}
            icon={undefined}
          />
          <SettingPicker
            icon="contrast-outline"
            label="Ombre portée"
            value={subDropShadow}
            options={SUB_DROP_SHADOW_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            onSelect={setSubDropShadow}
          />
          <SettingRow
            icon="resize-outline"
            label="Position verticale"
            sublabel="Valeur négative = plus bas"
            right={
              <TextInput
                style={s.numberInput}
                value={subVerticalPos}
                onChangeText={setSubVerticalPos}
                keyboardType="numbers-and-punctuation"
                maxLength={4}
                placeholderTextColor="#888"
                placeholder="-1"
              />
            }
          />

          {/* Aperçu */}
          <TouchableOpacity
            style={s.settingRow}
            onPress={() => setShowSubPreview((v) => !v)}
          >
            <Ionicons name="eye-outline" size={22} color="#fff" />
            <View style={s.settingTextContainer}>
              <ThemedText style={s.settingLabel}>Aperçu</ThemedText>
            </View>
            <Ionicons
              name={showSubPreview ? "chevron-up" : "chevron-down"}
              size={18}
              color="#888"
            />
          </TouchableOpacity>
          {showSubPreview && (
            <View style={s.subPreview}>
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
                      : { width: 1, height: 1 },
                  textShadowRadius:
                    subDropShadow === "none" || subDropShadow === "uniform"
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
        </AccordionSection>

        {/* ═══ À SUIVRE ═══ */}
        <AccordionSection
          title="À suivre"
          icon="arrow-forward-circle-outline"
          subtitle="Épisode suivant, expiration"
        >
          <SettingSwitch
            icon="play-forward-outline"
            label="Épisode suivant automatique"
            value={config?.EnableNextEpisodeAutoPlay ?? true}
            onValueChange={() => toggleConfig("EnableNextEpisodeAutoPlay")}
            disabled={!config || saving}
          />
          <SettingRow
            icon="time-outline"
            label="Délai d'expiration (jours)"
            sublabel="Nombre de jours d'inactivité avant retrait de 'À suivre'"
            right={
              <TextInput
                style={s.numberInput}
                value={nextUpExpiryDays}
                onChangeText={(t) =>
                  setNextUpExpiryDays(t.replace(/[^0-9]/g, ""))
                }
                keyboardType="number-pad"
                maxLength={5}
                placeholderTextColor="#888"
              />
            }
          />
          <SettingSwitch
            icon="eye-outline"
            label="Contenu déjà vu dans 'À suivre'"
            sublabel="Inclure les épisodes déjà vus"
            value={allowWatchedNextUp}
            onValueChange={setAllowWatchedNextUp}
          />
          <SettingSwitch
            icon="image-outline"
            label="Image de l'épisode"
            sublabel="Utiliser les images d'épisodes au lieu de la série"
            value={useEpisodeImageNextUp}
            onValueChange={setUseEpisodeImageNextUp}
          />
        </AccordionSection>

        {/* ═══ LECTURE (admin) ═══ */}
        {userData?.Policy?.IsAdministrator && (
          <AccordionSection
            title="Lecture (serveur)"
            icon="play-circle-outline"
            subtitle="Seuils de reprise, ajouts récents"
          >
            <ThemedText
              style={[
                s.settingSubLabel,
                { marginBottom: 8, paddingHorizontal: 0 },
              ]}
            >
              Ces paramètres s&apos;appliquent à tout le serveur.
            </ThemedText>
            <SettingPicker
              icon="play-outline"
              label="Début de reprise"
              sublabel={`Progression ignorée en dessous de ${minResumePct}%`}
              value={minResumePct}
              options={MIN_RESUME_PCT_OPTIONS.map((o) => ({
                id: o.value,
                label: o.label,
              }))}
              onSelect={(id) => {
                setMinResumePct(id);
                saveServerConfigField("MinResumePct", Number(id));
              }}
            />
            <SettingPicker
              icon="checkmark-done-outline"
              label="Marqué comme vu"
              sublabel={`Au-delà de ${maxResumePct}%, marqué comme vu`}
              value={maxResumePct}
              options={MAX_RESUME_PCT_OPTIONS.map((o) => ({
                id: o.value,
                label: o.label,
              }))}
              onSelect={(id) => {
                setMaxResumePct(id);
                saveServerConfigField("MaxResumePct", Number(id));
              }}
            />
            <SettingPicker
              icon="timer-outline"
              label="Durée minimum pour la reprise"
              sublabel="Contenus plus courts marqués comme vus directement"
              value={minResumeDuration}
              options={MIN_RESUME_DURATION_OPTIONS.map((o) => ({
                id: o.value,
                label: o.label,
              }))}
              onSelect={(id) => {
                setMinResumeDuration(id);
                saveServerConfigField("MinResumeDurationSeconds", Number(id));
              }}
            />
            <SettingPicker
              icon="time-outline"
              label="Durée des ajouts récents"
              sublabel={`Badge "Ajout récent" affiché pendant ${recentItemDays} jours`}
              value={recentItemDays}
              options={RECENT_ITEM_DAYS_OPTIONS.map((o) => ({
                id: o.value,
                label: o.label,
              }))}
              onSelect={setRecentItemDays}
            />
            {(saving || savingServerConfig) && (
              <View style={s.savingRow}>
                <ActivityIndicator color="#E50914" size="small" />
                <ThemedText style={s.savingText}>Sauvegarde...</ThemedText>
              </View>
            )}
          </AccordionSection>
        )}

        {/* ═══ CONTRÔLES ═══ */}
        <AccordionSection
          title="Contrôles"
          icon="game-controller-outline"
          subtitle="Manette de jeu"
        >
          <SettingSwitch
            icon="game-controller-outline"
            label="Activer la manette de jeu"
            sublabel="Nécessite le mode d'affichage TV. Rechargement manuel requis."
            value={enableGamepad}
            onValueChange={setEnableGamepad}
          />
        </AccordionSection>

        {/* ═══ LANGUES APP ═══ */}
        <AccordionSection
          title="Langue de l'application"
          icon="language-outline"
          subtitle={displayLanguage === "fr" ? "Français" : "English"}
        >
          <SettingPicker
            icon="language-outline"
            label="Langue"
            value={displayLanguage}
            options={[
              { id: "fr", label: "Français" },
              { id: "en", label: "English" },
            ]}
            onSelect={setDisplayLanguage}
          />
        </AccordionSection>

        {/* Transcodage (admin) */}
        {userData?.Policy?.IsAdministrator && systemInfo && (
          <AccordionSection
            title="Transcodage"
            icon="speedometer-outline"
            subtitle={
              userData?.Policy?.EnableVideoPlaybackTranscoding
                ? "Activé"
                : "Direct Play"
            }
          >
            <SettingSwitch
              icon="speedometer-outline"
              label="Transcodage vidéo"
              sublabel="Activer le transcodage côté serveur"
              value={userData?.Policy?.EnableVideoPlaybackTranscoding ?? true}
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
                  if (Platform.OS === "web") alert("Erreur");
                  else
                    Alert.alert(
                      "Erreur",
                      "Impossible de modifier le transcodage",
                    );
                } finally {
                  setSaving(false);
                }
              }}
              disabled={!userData?.Policy || saving}
            />
          </AccordionSection>
        )}
      </ScrollView>

      {saving && (
        <View style={s.savingOverlay}>
          <ActivityIndicator color="#E50914" size="small" />
          <ThemedText style={s.savingText}>Sauvegarde...</ThemedText>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const s = StyleSheet.create({
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 8,
  },

  // Accordéon
  accordionContainer: {
    backgroundColor: "#2d2d2d",
    borderRadius: 12,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  accordionSubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  accordionContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 2,
  },

  // Setting rows
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 8,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  settingSubLabel: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },

  // Inputs
  numberInput: {
    color: "#fff",
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: "center",
    fontSize: 14,
  },

  // Sub-section
  subSectionDivider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 8,
  },
  subSectionTitle: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    paddingHorizontal: 8,
  },

  // Sub preview
  subPreview: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 20,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },

  // Saving
  savingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  savingText: {
    color: "#ccc",
    fontSize: 13,
  },

  // Library block
  libraryBlock: {
    backgroundColor: "#262626",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  libraryName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
