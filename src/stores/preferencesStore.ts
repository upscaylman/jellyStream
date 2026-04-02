// Store de préférences utilisateur — Zustand + storage persistant
import { Platform } from "react-native";
import { create } from "zustand";

// Interface de storage compatible MMKV et localStorage
interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

const webStorage: StorageAdapter = {
  getString: (key) => {
    try {
      return localStorage.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  },
  delete: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

let storage: StorageAdapter = webStorage;

if (Platform.OS !== "web") {
  try {
    const { MMKV } = require("react-native-mmkv");
    storage = new MMKV({ id: "jellystream-prefs" });
  } catch {
    // Fallback web storage
  }
}

const KEYS = {
  DEFAULT_QUALITY: "pref_default_quality",
  MAX_BITRATE: "pref_max_bitrate",
  DIRECT_PLAY: "pref_direct_play",
  AUTO_NEXT_EPISODE: "pref_auto_next_episode",
  DEFAULT_AUDIO_LANG: "pref_default_audio_lang",
  DEFAULT_SUB_LANG: "pref_default_sub_lang",
  SHOW_SERVER_NAME: "pref_show_server_name",
  MAX_AUDIO_CHANNELS: "pref_max_audio_channels",
  DISABLE_VBR_AUDIO: "pref_disable_vbr_audio",
  AUDIO_NORMALIZATION: "pref_audio_normalization",
  REMUX_FLAC: "pref_remux_flac",
  REMUX_MP3: "pref_remux_mp3",
  EXPERIMENTAL_PGS_SUBS: "pref_experimental_pgs_subs",
  ALWAYS_BURN_SUBTITLES: "pref_always_burn_subtitles",
  SUB_STYLE: "pref_sub_style",
  SUB_TEXT_SIZE: "pref_sub_text_size",
  SUB_FONT_WEIGHT: "pref_sub_font_weight",
  SUB_FONT: "pref_sub_font",
  SUB_TEXT_COLOR: "pref_sub_text_color",
  SUB_DROP_SHADOW: "pref_sub_drop_shadow",
  SUB_VERTICAL_POS: "pref_sub_vertical_pos",
  ENABLE_GAMEPAD: "pref_enable_gamepad",
  DISPLAY_LANGUAGE: "pref_display_language",
  LOCALE: "pref_locale",
  LIBRARY_PAGE_SIZE: "pref_library_page_size",
  SHOW_BACKDROPS: "pref_show_backdrops",
  PLAY_MUSIC_THEMES: "pref_play_music_themes",
  PLAY_TRAILERS: "pref_play_trailers",
  THEME: "pref_theme",
  FAST_ANIMATIONS: "pref_fast_animations",
  BLUR_PLACEHOLDERS: "pref_blur_placeholders",
  NEXT_UP_EXPIRY_DAYS: "pref_next_up_expiry_days",
  ALLOW_WATCHED_NEXT_UP: "pref_allow_watched_next_up",
  USE_EPISODE_IMAGE_NEXT_UP: "pref_use_episode_image_next_up",
} as const;

export const QUALITY_OPTIONS = [
  { label: "Auto", bitrate: 0 },
  { label: "4K - 120 Mbps", bitrate: 120_000_000 },
  { label: "4K - 80 Mbps", bitrate: 80_000_000 },
  { label: "1080p - 40 Mbps", bitrate: 40_000_000 },
  { label: "1080p - 20 Mbps", bitrate: 20_000_000 },
  { label: "720p - 8 Mbps", bitrate: 8_000_000 },
  { label: "480p - 3 Mbps", bitrate: 3_000_000 },
  { label: "360p - 1 Mbps", bitrate: 1_000_000 },
] as const;

interface PreferencesState {
  // Qualité et lecture
  defaultQualityLabel: string;
  maxBitrate: number;
  preferDirectPlay: boolean;
  autoNextEpisode: boolean;
  defaultAudioLang: string;
  defaultSubLang: string;
  showServerName: boolean;
  maxAudioChannels: string;
  disableVbrAudio: boolean;
  audioNormalization: string;
  remuxFlac: boolean;
  remuxMp3: boolean;
  experimentalPgsSubs: boolean;
  alwaysBurnSubtitles: boolean;
  subStyle: string;
  subTextSize: string;
  subFontWeight: string;
  subFont: string;
  subTextColor: string;
  subDropShadow: string;
  subVerticalPos: string;
  enableGamepad: boolean;
  displayLanguage: string;
  locale: string;
  libraryPageSize: string;
  showBackdrops: boolean;
  playMusicThemes: boolean;
  playTrailers: boolean;
  theme: string;
  fastAnimations: boolean;
  blurPlaceholders: boolean;
  nextUpExpiryDays: string;
  allowWatchedNextUp: boolean;
  useEpisodeImageNextUp: boolean;

  // Actions
  setDefaultQuality: (label: string, bitrate: number) => void;
  setPreferDirectPlay: (value: boolean) => void;
  setAutoNextEpisode: (value: boolean) => void;
  setDefaultAudioLang: (lang: string) => void;
  setDefaultSubLang: (lang: string) => void;
  setShowServerName: (value: boolean) => void;
  setMaxAudioChannels: (value: string) => void;
  setDisableVbrAudio: (value: boolean) => void;
  setAudioNormalization: (value: string) => void;
  setRemuxFlac: (value: boolean) => void;
  setRemuxMp3: (value: boolean) => void;
  setExperimentalPgsSubs: (value: boolean) => void;
  setAlwaysBurnSubtitles: (value: boolean) => void;
  setSubStyle: (value: string) => void;
  setSubTextSize: (value: string) => void;
  setSubFontWeight: (value: string) => void;
  setSubFont: (value: string) => void;
  setSubTextColor: (value: string) => void;
  setSubDropShadow: (value: string) => void;
  setSubVerticalPos: (value: string) => void;
  setEnableGamepad: (value: boolean) => void;
  setDisplayLanguage: (value: string) => void;
  setLocale: (value: string) => void;
  setLibraryPageSize: (value: string) => void;
  setShowBackdrops: (value: boolean) => void;
  setPlayMusicThemes: (value: boolean) => void;
  setPlayTrailers: (value: boolean) => void;
  setTheme: (value: string) => void;
  setFastAnimations: (value: boolean) => void;
  setBlurPlaceholders: (value: boolean) => void;
  setNextUpExpiryDays: (value: string) => void;
  setAllowWatchedNextUp: (value: boolean) => void;
  setUseEpisodeImageNextUp: (value: boolean) => void;
  restore: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  defaultQualityLabel: "Auto",
  maxBitrate: 0,
  preferDirectPlay: true,
  autoNextEpisode: true,
  defaultAudioLang: "",
  defaultSubLang: "",
  showServerName: true,
  maxAudioChannels: "-1",
  disableVbrAudio: false,
  audioNormalization: "off",
  remuxFlac: false,
  remuxMp3: false,
  experimentalPgsSubs: false,
  alwaysBurnSubtitles: false,
  subStyle: "auto",
  subTextSize: "normal",
  subFontWeight: "normal",
  subFont: "default",
  subTextColor: "#FFFFFF",
  subDropShadow: "dropshadow",
  subVerticalPos: "-1",
  enableGamepad: false,
  displayLanguage: "fr",
  locale: "",
  libraryPageSize: "100",
  showBackdrops: true,
  playMusicThemes: false,
  playTrailers: false,
  theme: "dark",
  fastAnimations: false,
  blurPlaceholders: true,
  nextUpExpiryDays: "365",
  allowWatchedNextUp: false,
  useEpisodeImageNextUp: false,

  setDefaultQuality: (label, bitrate) => {
    storage.set(KEYS.DEFAULT_QUALITY, label);
    storage.set(KEYS.MAX_BITRATE, String(bitrate));
    set({ defaultQualityLabel: label, maxBitrate: bitrate });
  },

  setPreferDirectPlay: (value) => {
    storage.set(KEYS.DIRECT_PLAY, value ? "1" : "0");
    set({ preferDirectPlay: value });
  },

  setAutoNextEpisode: (value) => {
    storage.set(KEYS.AUTO_NEXT_EPISODE, value ? "1" : "0");
    set({ autoNextEpisode: value });
  },

  setDefaultAudioLang: (lang) => {
    storage.set(KEYS.DEFAULT_AUDIO_LANG, lang);
    set({ defaultAudioLang: lang });
  },

  setDefaultSubLang: (lang) => {
    storage.set(KEYS.DEFAULT_SUB_LANG, lang);
    set({ defaultSubLang: lang });
  },

  setShowServerName: (value) => {
    storage.set(KEYS.SHOW_SERVER_NAME, value ? "1" : "0");
    set({ showServerName: value });
  },

  setMaxAudioChannels: (value) => {
    storage.set(KEYS.MAX_AUDIO_CHANNELS, value);
    set({ maxAudioChannels: value });
  },

  setDisableVbrAudio: (value) => {
    storage.set(KEYS.DISABLE_VBR_AUDIO, value ? "1" : "0");
    set({ disableVbrAudio: value });
  },

  setAudioNormalization: (value) => {
    storage.set(KEYS.AUDIO_NORMALIZATION, value);
    set({ audioNormalization: value });
  },

  setRemuxFlac: (value) => {
    storage.set(KEYS.REMUX_FLAC, value ? "1" : "0");
    set({ remuxFlac: value });
  },

  setRemuxMp3: (value) => {
    storage.set(KEYS.REMUX_MP3, value ? "1" : "0");
    set({ remuxMp3: value });
  },

  setExperimentalPgsSubs: (value) => {
    storage.set(KEYS.EXPERIMENTAL_PGS_SUBS, value ? "1" : "0");
    set({ experimentalPgsSubs: value });
  },

  setAlwaysBurnSubtitles: (value) => {
    storage.set(KEYS.ALWAYS_BURN_SUBTITLES, value ? "1" : "0");
    set({ alwaysBurnSubtitles: value });
  },

  setSubStyle: (value) => {
    storage.set(KEYS.SUB_STYLE, value);
    set({ subStyle: value });
  },

  setSubTextSize: (value) => {
    storage.set(KEYS.SUB_TEXT_SIZE, value);
    set({ subTextSize: value });
  },

  setSubFontWeight: (value) => {
    storage.set(KEYS.SUB_FONT_WEIGHT, value);
    set({ subFontWeight: value });
  },

  setSubFont: (value) => {
    storage.set(KEYS.SUB_FONT, value);
    set({ subFont: value });
  },

  setSubTextColor: (value) => {
    storage.set(KEYS.SUB_TEXT_COLOR, value);
    set({ subTextColor: value });
  },

  setSubDropShadow: (value) => {
    storage.set(KEYS.SUB_DROP_SHADOW, value);
    set({ subDropShadow: value });
  },

  setSubVerticalPos: (value) => {
    storage.set(KEYS.SUB_VERTICAL_POS, value);
    set({ subVerticalPos: value });
  },

  setEnableGamepad: (value) => {
    storage.set(KEYS.ENABLE_GAMEPAD, value ? "1" : "0");
    set({ enableGamepad: value });
  },

  setDisplayLanguage: (value) => {
    storage.set(KEYS.DISPLAY_LANGUAGE, value);
    set({ displayLanguage: value });
  },

  setLocale: (value) => {
    storage.set(KEYS.LOCALE, value);
    set({ locale: value });
  },

  setLibraryPageSize: (value) => {
    storage.set(KEYS.LIBRARY_PAGE_SIZE, value);
    set({ libraryPageSize: value });
  },

  setShowBackdrops: (value) => {
    storage.set(KEYS.SHOW_BACKDROPS, value ? "1" : "0");
    set({ showBackdrops: value });
  },

  setPlayMusicThemes: (value) => {
    storage.set(KEYS.PLAY_MUSIC_THEMES, value ? "1" : "0");
    set({ playMusicThemes: value });
  },

  setPlayTrailers: (value) => {
    storage.set(KEYS.PLAY_TRAILERS, value ? "1" : "0");
    set({ playTrailers: value });
  },

  setTheme: (value) => {
    storage.set(KEYS.THEME, value);
    set({ theme: value });
  },

  setFastAnimations: (value) => {
    storage.set(KEYS.FAST_ANIMATIONS, value ? "1" : "0");
    set({ fastAnimations: value });
  },

  setBlurPlaceholders: (value) => {
    storage.set(KEYS.BLUR_PLACEHOLDERS, value ? "1" : "0");
    set({ blurPlaceholders: value });
  },

  setNextUpExpiryDays: (value) => {
    storage.set(KEYS.NEXT_UP_EXPIRY_DAYS, value);
    set({ nextUpExpiryDays: value });
  },

  setAllowWatchedNextUp: (value) => {
    storage.set(KEYS.ALLOW_WATCHED_NEXT_UP, value ? "1" : "0");
    set({ allowWatchedNextUp: value });
  },

  setUseEpisodeImageNextUp: (value) => {
    storage.set(KEYS.USE_EPISODE_IMAGE_NEXT_UP, value ? "1" : "0");
    set({ useEpisodeImageNextUp: value });
  },

  restore: () => {
    const qualityLabel = storage.getString(KEYS.DEFAULT_QUALITY) ?? "Auto";
    const bitrate = parseInt(storage.getString(KEYS.MAX_BITRATE) ?? "0", 10);
    const directPlay = storage.getString(KEYS.DIRECT_PLAY) !== "0";
    const autoNext = storage.getString(KEYS.AUTO_NEXT_EPISODE) !== "0";
    const audioLang = storage.getString(KEYS.DEFAULT_AUDIO_LANG) ?? "";
    const subLang = storage.getString(KEYS.DEFAULT_SUB_LANG) ?? "";
    const showServerName = storage.getString(KEYS.SHOW_SERVER_NAME) !== "0";
    const maxAudioChannels = storage.getString(KEYS.MAX_AUDIO_CHANNELS) ?? "-1";
    const disableVbrAudio = storage.getString(KEYS.DISABLE_VBR_AUDIO) === "1";
    const audioNormalization =
      storage.getString(KEYS.AUDIO_NORMALIZATION) ?? "off";
    const remuxFlac = storage.getString(KEYS.REMUX_FLAC) === "1";
    const remuxMp3 = storage.getString(KEYS.REMUX_MP3) === "1";
    const experimentalPgsSubs =
      storage.getString(KEYS.EXPERIMENTAL_PGS_SUBS) === "1";
    const alwaysBurnSubtitles =
      storage.getString(KEYS.ALWAYS_BURN_SUBTITLES) === "1";
    const subStyle = storage.getString(KEYS.SUB_STYLE) ?? "auto";
    const subTextSize = storage.getString(KEYS.SUB_TEXT_SIZE) ?? "normal";
    const subFontWeight = storage.getString(KEYS.SUB_FONT_WEIGHT) ?? "normal";
    const subFont = storage.getString(KEYS.SUB_FONT) ?? "default";
    const subTextColor = storage.getString(KEYS.SUB_TEXT_COLOR) ?? "#FFFFFF";
    const subDropShadow =
      storage.getString(KEYS.SUB_DROP_SHADOW) ?? "dropshadow";
    const subVerticalPos = storage.getString(KEYS.SUB_VERTICAL_POS) ?? "-1";
    const enableGamepad = storage.getString(KEYS.ENABLE_GAMEPAD) === "1";
    const displayLanguage = storage.getString(KEYS.DISPLAY_LANGUAGE) ?? "fr";
    const locale = storage.getString(KEYS.LOCALE) ?? "";
    const libraryPageSize = storage.getString(KEYS.LIBRARY_PAGE_SIZE) ?? "100";
    const showBackdrops = storage.getString(KEYS.SHOW_BACKDROPS) !== "0";
    const playMusicThemes = storage.getString(KEYS.PLAY_MUSIC_THEMES) === "1";
    const playTrailers = storage.getString(KEYS.PLAY_TRAILERS) === "1";
    const theme = storage.getString(KEYS.THEME) ?? "dark";
    const fastAnimations = storage.getString(KEYS.FAST_ANIMATIONS) === "1";
    const blurPlaceholders = storage.getString(KEYS.BLUR_PLACEHOLDERS) !== "0";
    const nextUpExpiryDays =
      storage.getString(KEYS.NEXT_UP_EXPIRY_DAYS) ?? "365";
    const allowWatchedNextUp =
      storage.getString(KEYS.ALLOW_WATCHED_NEXT_UP) === "1";
    const useEpisodeImageNextUp =
      storage.getString(KEYS.USE_EPISODE_IMAGE_NEXT_UP) === "1";

    set({
      defaultQualityLabel: qualityLabel,
      maxBitrate: isNaN(bitrate) ? 0 : bitrate,
      preferDirectPlay: directPlay,
      autoNextEpisode: autoNext,
      defaultAudioLang: audioLang,
      defaultSubLang: subLang,
      showServerName,
      maxAudioChannels,
      disableVbrAudio,
      audioNormalization,
      remuxFlac,
      remuxMp3,
      experimentalPgsSubs,
      alwaysBurnSubtitles,
      subStyle,
      subTextSize,
      subFontWeight,
      subFont,
      subTextColor,
      subDropShadow,
      subVerticalPos,
      enableGamepad,
      displayLanguage,
      locale,
      libraryPageSize,
      showBackdrops,
      playMusicThemes,
      playTrailers,
      theme,
      fastAnimations,
      blurPlaceholders,
      nextUpExpiryDays,
      allowWatchedNextUp,
      useEpisodeImageNextUp,
    });
  },
}));
