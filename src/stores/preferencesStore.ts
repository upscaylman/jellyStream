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

  // Actions
  setDefaultQuality: (label: string, bitrate: number) => void;
  setPreferDirectPlay: (value: boolean) => void;
  setAutoNextEpisode: (value: boolean) => void;
  setDefaultAudioLang: (lang: string) => void;
  setDefaultSubLang: (lang: string) => void;
  setShowServerName: (value: boolean) => void;
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

  restore: () => {
    const qualityLabel = storage.getString(KEYS.DEFAULT_QUALITY) ?? "Auto";
    const bitrate = parseInt(storage.getString(KEYS.MAX_BITRATE) ?? "0", 10);
    const directPlay = storage.getString(KEYS.DIRECT_PLAY) !== "0";
    const autoNext = storage.getString(KEYS.AUTO_NEXT_EPISODE) !== "0";
    const audioLang = storage.getString(KEYS.DEFAULT_AUDIO_LANG) ?? "";
    const subLang = storage.getString(KEYS.DEFAULT_SUB_LANG) ?? "";
    const showServerName = storage.getString(KEYS.SHOW_SERVER_NAME) !== "0";

    set({
      defaultQualityLabel: qualityLabel,
      maxBitrate: isNaN(bitrate) ? 0 : bitrate,
      preferDirectPlay: directPlay,
      autoNextEpisode: autoNext,
      defaultAudioLang: audioLang,
      defaultSubLang: subLang,
      showServerName,
    });
  },
}));
