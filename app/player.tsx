import { CastModal } from "@/components/CastModal";
import { CastIcon } from "@/icons/CastIcon";
import { SkipBackIcon, SkipForwardIcon } from "@/icons/SkipIcons";
import {
  getAudioStreams,
  getSubtitleStreams,
  QUALITY_PROFILES,
  usePlaybackInfo,
  type MediaSource,
  type QualityProfile,
} from "@/src/api/queries/usePlaybackInfo";
import { useAuthStore } from "@/src/stores/authStore";
import { getStreamUrl, getWebTranscodedUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import conditionnel expo-video (seulement sur natif)
const ExpoVideo = Platform.OS !== "web" ? require("expo-video") : null;

// Import conditionnel expo-brightness (seulement sur natif)
let Brightness: typeof import("expo-brightness") | null = null;
if (Platform.OS !== "web") {
  try {
    Brightness = require("expo-brightness");
  } catch {
    // Pas disponible
  }
}

// ═══════════════════════════════════════════
// Types panneau Paramètres
// ═══════════════════════════════════════════
type SettingsPanel =
  | "none"
  | "main"
  | "subtitles"
  | "audio"
  | "quality"
  | "aspectRatio";

const ASPECT_RATIOS = [
  { label: "Auto", value: "contain" as const },
  { label: "Remplir", value: "cover" as const },
  { label: "Étirer", value: "fill" as const },
] as const;

type AspectRatioValue = (typeof ASPECT_RATIOS)[number]["value"];

// Formatage du temps mm:ss ou h:mm:ss
function formatTime(seconds: number): string {
  const totalSec = Math.floor(Math.max(0, seconds));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const CONTROLS_HIDE_DELAY = 4000;
const GESTURE_THRESHOLD = 10; // pixels min pour déclencher un geste vertical

// ═══════════════════════════════════════════
// PANNEAU PARAMÈTRES (sous-titres, audio, qualité, aspect ratio)
// ═══════════════════════════════════════════
function SettingsModal({
  visible,
  onClose,
  panel,
  setPanel,
  mediaSource,
  serverUrl,
  itemId,
  token,
  selectedSubIndex,
  onSelectSubtitle,
  selectedAudioIndex,
  onSelectAudio,
  selectedQuality,
  onSelectQuality,
  selectedAspect,
  onSelectAspect,
}: {
  visible: boolean;
  onClose: () => void;
  panel: SettingsPanel;
  setPanel: (p: SettingsPanel) => void;
  mediaSource: MediaSource | null;
  serverUrl: string;
  itemId: string;
  token: string;
  selectedSubIndex: number;
  onSelectSubtitle: (index: number) => void;
  selectedAudioIndex: number;
  onSelectAudio: (index: number) => void;
  selectedQuality: QualityProfile;
  onSelectQuality: (q: QualityProfile) => void;
  selectedAspect: AspectRatioValue;
  onSelectAspect: (a: AspectRatioValue) => void;
}) {
  const subtitles = mediaSource ? getSubtitleStreams(mediaSource) : [];
  const audioTracks = mediaSource ? getAudioStreams(mediaSource) : [];

  const renderMainMenu = () => (
    <View style={settingsStyles.menu}>
      <Text style={settingsStyles.title}>Paramètres</Text>
      {!mediaSource && (
        <Text style={settingsStyles.menuValue}>Chargement des pistes...</Text>
      )}
      <Pressable
        style={settingsStyles.menuItem}
        onPress={() => setPanel("subtitles")}
      >
        <Ionicons name="text-outline" size={20} color="#fff" />
        <Text style={settingsStyles.menuText}>Sous-titres</Text>
        <Text style={settingsStyles.menuValue}>
          {selectedSubIndex === -1
            ? "Désactivés"
            : (subtitles.find((s) => s.Index === selectedSubIndex)
                ?.DisplayTitle ?? "?")}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable
        style={settingsStyles.menuItem}
        onPress={() => setPanel("audio")}
      >
        <Ionicons name="volume-high-outline" size={20} color="#fff" />
        <Text style={settingsStyles.menuText}>Audio</Text>
        <Text style={settingsStyles.menuValue}>
          {audioTracks.find((a) => a.Index === selectedAudioIndex)
            ?.DisplayTitle ?? "?"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable
        style={settingsStyles.menuItem}
        onPress={() => setPanel("quality")}
      >
        <Ionicons name="speedometer-outline" size={20} color="#fff" />
        <Text style={settingsStyles.menuText}>Qualité</Text>
        <Text style={settingsStyles.menuValue}>{selectedQuality.label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable
        style={settingsStyles.menuItem}
        onPress={() => setPanel("aspectRatio")}
      >
        <Ionicons name="resize-outline" size={20} color="#fff" />
        <Text style={settingsStyles.menuText}>Format d'image</Text>
        <Text style={settingsStyles.menuValue}>
          {ASPECT_RATIOS.find((a) => a.value === selectedAspect)?.label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
    </View>
  );

  const renderSubtitleList = () => (
    <View style={settingsStyles.menu}>
      <Pressable
        style={settingsStyles.backRow}
        onPress={() => setPanel("main")}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
        <Text style={settingsStyles.title}>Sous-titres</Text>
      </Pressable>
      <Pressable
        style={[
          settingsStyles.optionItem,
          selectedSubIndex === -1 && settingsStyles.optionSelected,
        ]}
        onPress={() => {
          onSelectSubtitle(-1);
          onClose();
        }}
      >
        <Text style={settingsStyles.optionText}>Désactivés</Text>
        {selectedSubIndex === -1 && (
          <Ionicons name="checkmark" size={18} color="#E50914" />
        )}
      </Pressable>
      <FlatList
        data={subtitles}
        keyExtractor={(item) => String(item.Index)}
        renderItem={({ item }) => (
          <Pressable
            style={[
              settingsStyles.optionItem,
              selectedSubIndex === item.Index && settingsStyles.optionSelected,
            ]}
            onPress={() => {
              onSelectSubtitle(item.Index);
              onClose();
            }}
          >
            <Text style={settingsStyles.optionText}>
              {item.DisplayTitle ?? item.Language ?? `Piste ${item.Index}`}
            </Text>
            <Text style={settingsStyles.optionSub}>
              {item.Codec?.toUpperCase()}
              {item.IsForced ? " · Forcé" : ""}
            </Text>
            {selectedSubIndex === item.Index && (
              <Ionicons name="checkmark" size={18} color="#E50914" />
            )}
          </Pressable>
        )}
      />
    </View>
  );

  const renderAudioList = () => (
    <View style={settingsStyles.menu}>
      <Pressable
        style={settingsStyles.backRow}
        onPress={() => setPanel("main")}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
        <Text style={settingsStyles.title}>Audio</Text>
      </Pressable>
      <FlatList
        data={audioTracks}
        keyExtractor={(item) => String(item.Index)}
        renderItem={({ item }) => (
          <Pressable
            style={[
              settingsStyles.optionItem,
              selectedAudioIndex === item.Index &&
                settingsStyles.optionSelected,
            ]}
            onPress={() => {
              onSelectAudio(item.Index);
              onClose();
            }}
          >
            <Text style={settingsStyles.optionText}>
              {item.DisplayTitle ?? item.Language ?? `Piste ${item.Index}`}
            </Text>
            <Text style={settingsStyles.optionSub}>
              {item.Codec?.toUpperCase()} · {item.Channels}ch
            </Text>
            {selectedAudioIndex === item.Index && (
              <Ionicons name="checkmark" size={18} color="#E50914" />
            )}
          </Pressable>
        )}
      />
    </View>
  );

  const renderQualityList = () => (
    <View style={settingsStyles.menu}>
      <Pressable
        style={settingsStyles.backRow}
        onPress={() => setPanel("main")}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
        <Text style={settingsStyles.title}>Qualité</Text>
      </Pressable>
      <FlatList
        data={QUALITY_PROFILES}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <Pressable
            style={[
              settingsStyles.optionItem,
              selectedQuality.label === item.label &&
                settingsStyles.optionSelected,
            ]}
            onPress={() => {
              onSelectQuality(item);
              onClose();
            }}
          >
            <Text style={settingsStyles.optionText}>{item.label}</Text>
            {selectedQuality.label === item.label && (
              <Ionicons name="checkmark" size={18} color="#E50914" />
            )}
          </Pressable>
        )}
      />
    </View>
  );

  const renderAspectList = () => (
    <View style={settingsStyles.menu}>
      <Pressable
        style={settingsStyles.backRow}
        onPress={() => setPanel("main")}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
        <Text style={settingsStyles.title}>Format d'image</Text>
      </Pressable>
      {ASPECT_RATIOS.map((item) => (
        <Pressable
          key={item.value}
          style={[
            settingsStyles.optionItem,
            selectedAspect === item.value && settingsStyles.optionSelected,
          ]}
          onPress={() => {
            onSelectAspect(item.value);
            onClose();
          }}
        >
          <Text style={settingsStyles.optionText}>{item.label}</Text>
          {selectedAspect === item.value && (
            <Ionicons name="checkmark" size={18} color="#E50914" />
          )}
        </Pressable>
      ))}
    </View>
  );

  if (!visible) return null;

  return (
    <Pressable style={settingsStyles.backdrop} onPress={onClose}>
      <Pressable
        style={settingsStyles.container}
        onPress={(e) => e.stopPropagation()}
      >
        {panel === "main" && renderMainMenu()}
        {panel === "subtitles" && renderSubtitleList()}
        {panel === "audio" && renderAudioList()}
        {panel === "quality" && renderQualityList()}
        {panel === "aspectRatio" && renderAspectList()}
      </Pressable>
    </Pressable>
  );
}

// ═══════════════════════════════════════════
// INDICATEUR GESTE VOLUME / LUMINOSITÉ
// ═══════════════════════════════════════════
function GestureIndicator({
  type,
  value,
}: {
  type: "volume" | "brightness" | null;
  value: number;
}) {
  if (!type) return null;
  const icon = type === "volume" ? "volume-high" : "sunny";
  const pct = Math.round(value * 100);
  return (
    <View style={gestureStyles.container}>
      <Ionicons name={icon} size={24} color="#fff" />
      <View style={gestureStyles.barBg}>
        <View style={[gestureStyles.barFill, { height: `${pct}%` }]} />
      </View>
      <Text style={gestureStyles.label}>{pct}%</Text>
    </View>
  );
}

// ═══════════════════════════════════════════
// PLAYER WEB — <video> HTML natif + contrôles custom
// ═══════════════════════════════════════════
function WebPlayer({
  streamUrl,
  title,
  itemId,
  onClose,
}: {
  streamUrl: string;
  title: string;
  itemId: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRef = useRef<View | null>(null);

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showCast, setShowCast] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Offset de seek : quand on seek à 300s, le stream reprend à 0 mais on affiche 300s
  const startOffsetRef = useRef(0);

  // Sous-titres et audio pour le web
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const token = useAuthStore((s) => s.token) ?? "";
  const { data: webPlaybackInfo } = usePlaybackInfo(itemId);
  const webMediaSource: MediaSource | null =
    webPlaybackInfo?.MediaSources?.[0] ?? null;
  const [selectedSubIndex, setSelectedSubIndex] = useState(-1);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<QualityProfile>(
    QUALITY_PROFILES[0],
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>("contain");
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>("none");

  // Initialiser depuis les defaults Jellyfin
  useEffect(() => {
    if (webMediaSource) {
      if (
        webMediaSource.DefaultSubtitleStreamIndex != null &&
        webMediaSource.DefaultSubtitleStreamIndex >= 0
      ) {
        setSelectedSubIndex(webMediaSource.DefaultSubtitleStreamIndex);
      }
      if (webMediaSource.DefaultAudioStreamIndex != null) {
        setSelectedAudioIndex(webMediaSource.DefaultAudioStreamIndex);
      }
    }
  }, [webMediaSource]);

  // Durée depuis Jellyfin (seule source fiable pour les streams transcodés)
  const jellyfinDurationSec = webMediaSource?.RunTimeTicks
    ? webMediaSource.RunTimeTicks / 10_000_000
    : 0;

  useEffect(() => {
    if (jellyfinDurationSec > 0) {
      setDurationSec(jellyfinDurationSec);
    }
  }, [jellyfinDurationSec]);

  const displayTime = isSeeking ? seekValue : currentTimeSec;
  const progressPercent =
    durationSec > 0 ? (displayTime / durationSec) * 100 : 0;

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, []);

  // Monter le <video> HTML
  useEffect(() => {
    if (!containerRef.current) return;
    const video = document.createElement("video");
    video.src = streamUrl;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText =
      "width:100%;height:100%;object-fit:contain;background:#000;";
    video.controls = false;
    containerRef.current.appendChild(video);
    videoRef.current = video;

    video.addEventListener("loadedmetadata", () => setIsBuffering(false));
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    video.addEventListener("waiting", () => setIsBuffering(true));
    video.addEventListener("canplay", () => setIsBuffering(false));
    video.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      video.pause();
      video.src = "";
      video.remove();
    };
  }, [streamUrl]);

  // Suivi du temps avec offset (stream transcodé commence toujours à 0)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      if (!isSeeking) {
        setCurrentTimeSec(startOffsetRef.current + video.currentTime);
      }
    };
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [isSeeking]);

  // Fonction centrale : reconstruire le stream transcodé avec les paramètres voulus
  // startTimeSec = position en secondes dans le film
  const rebuildWebStream = useCallback(
    (opts: {
      audioIndex?: number;
      subIndex?: number;
      startTimeSec?: number;
    }) => {
      const video = videoRef.current;
      if (!video) return;
      const seekTo =
        opts.startTimeSec ?? startOffsetRef.current + video.currentTime;
      const audioIdx = opts.audioIndex ?? selectedAudioIndex;
      const subIdx = opts.subIndex ?? selectedSubIndex;

      startOffsetRef.current = seekTo;
      setCurrentTimeSec(seekTo);
      setIsBuffering(true);

      const ticks = Math.round(seekTo * 10_000_000);
      let newUrl = getWebTranscodedUrl(serverUrl, itemId, token, {
        startTimeTicks: ticks,
        audioStreamIndex: audioIdx,
        subtitleStreamIndex: subIdx,
        playSessionId: webPlaybackInfo?.PlaySessionId,
      });
      video.src = newUrl;
      video.load();
      video.play().catch(() => {});
    },
    [
      serverUrl,
      token,
      itemId,
      selectedAudioIndex,
      selectedSubIndex,
      webPlaybackInfo,
    ],
  );

  // Appliquer le changement de sous-titres (burn-in dans le flux vidéo)
  const handleWebSelectSubtitle = useCallback(
    (index: number) => {
      setSelectedSubIndex(index);
      rebuildWebStream({ subIndex: index });
    },
    [rebuildWebStream],
  );

  // Changement de piste audio (reconstruit l'URL du stream)
  const handleWebSelectAudio = useCallback(
    (index: number) => {
      setSelectedAudioIndex(index);
      rebuildWebStream({ audioIndex: index });
    },
    [rebuildWebStream],
  );

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const seekRelative = useCallback(
    (sec: number) => {
      if (durationSec <= 0) return;
      const v = videoRef.current;
      const currentPos = startOffsetRef.current + (v?.currentTime ?? 0);
      const newTime = Math.max(0, Math.min(currentPos + sec, durationSec));
      rebuildWebStream({ startTimeSec: newTime });
      resetHideTimer();
    },
    [resetHideTimer, durationSec, rebuildWebStream],
  );

  const toggleFullscreen = useCallback(() => {
    // Utiliser le container root pour que les contrôles soient visibles en fullscreen
    const el =
      (fullscreenRef.current as unknown as HTMLElement) ??
      containerRef.current?.parentElement?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      (screen.orientation as any)?.unlock?.();
    } else {
      el.requestFullscreen().then(() => {
        (screen.orientation as any)?.lock?.("landscape").catch(() => {});
      });
    }
  }, []);

  const seekFromMouse = useCallback(
    (clientX: number, commit: boolean) => {
      const bar = progressRef.current;
      if (!bar || durationSec <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min((clientX - rect.left) / rect.width, 1),
      );
      const newTime = ratio * durationSec;
      if (commit) {
        setIsSeeking(false);
        rebuildWebStream({ startTimeSec: newTime });
      } else {
        setSeekValue(newTime);
        setIsSeeking(true);
      }
    },
    [durationSec, rebuildWebStream],
  );

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    let dragging = false;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      seekFromMouse(e.clientX, false);
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (dragging) seekFromMouse(e.clientX, false);
    };
    const onUp = (e: MouseEvent) => {
      if (dragging) {
        seekFromMouse(e.clientX, true);
        dragging = false;
        resetHideTimer();
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      dragging = true;
      seekFromMouse(e.touches[0].clientX, false);
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (dragging) seekFromMouse(e.touches[0].clientX, false);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (dragging) {
        seekFromMouse(e.changedTouches[0].clientX, true);
        dragging = false;
        resetHideTimer();
      }
    };

    bar.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    bar.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      bar.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      bar.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [seekFromMouse, resetHideTimer, showControls]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekRelative(-10);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekRelative(10);
      }
      if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlayPause, seekRelative, toggleFullscreen, onClose]);

  return (
    <View ref={fullscreenRef} style={s.container}>
      <StatusBar hidden />
      <Pressable
        style={s.videoWrapper}
        onPress={() => {
          if (isLocked) {
            setShowControls((v) => !v);
            return;
          }
          if (showControls) {
            setShowControls(false);
            if (hideTimer.current) clearTimeout(hideTimer.current);
          } else {
            resetHideTimer();
          }
        }}
      >
        <div
          ref={containerRef as any}
          style={{ width: "100%", height: "100%", background: "#000" }}
        />
      </Pressable>

      {isBuffering && (
        <View style={s.bufferingOverlay}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {showControls && (
        <View
          style={[
            s.controlsOverlay,
            { paddingTop: 16, paddingBottom: 16, pointerEvents: "box-none" },
          ]}
        >
          {isLocked ? (
            <View style={s.lockedContainer}>
              <Pressable
                style={s.lockButton}
                onPress={() => {
                  setIsLocked(false);
                  resetHideTimer();
                }}
              >
                <Ionicons name="lock-closed" size={24} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={s.topBar}>
                <Pressable onPress={onClose} style={s.iconButton}>
                  <Ionicons name="arrow-back" size={26} color="#fff" />
                </Pressable>
                <View style={s.titleContainer}>
                  <Text style={s.titleText} numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <View style={s.topBarRight}>
                  <Pressable
                    onPress={() => setShowCast(true)}
                    style={s.iconButton}
                  >
                    <CastIcon size={22} color="#fff" />
                  </Pressable>
                  <Pressable
                    onPress={() => setSettingsPanel("main")}
                    style={s.iconButton}
                  >
                    <Ionicons name="settings-outline" size={22} color="#fff" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setIsLocked(true);
                      setShowControls(true);
                    }}
                    style={s.iconButton}
                  >
                    <Ionicons name="lock-open" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <View style={s.centerControls}>
                <Pressable
                  onPress={() => seekRelative(-10)}
                  style={s.seekButton}
                >
                  <SkipBackIcon size={40} color="#fff" />
                </Pressable>
                <Pressable onPress={togglePlayPause} style={s.playPauseButton}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={42}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  onPress={() => seekRelative(10)}
                  style={s.seekButton}
                >
                  <SkipForwardIcon size={40} color="#fff" />
                </Pressable>
              </View>

              <View style={s.bottomBar}>
                <View style={s.timeRow}>
                  <Text style={s.timeText}>{formatTime(displayTime)}</Text>
                  <Text style={s.timeTextMuted}>
                    {" / "}
                    {formatTime(durationSec)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={toggleFullscreen} style={s.iconButton}>
                    <Ionicons
                      name={
                        isFullscreen ? "contract-outline" : "expand-outline"
                      }
                      size={22}
                      color="#fff"
                    />
                  </Pressable>
                </View>
                <div
                  ref={progressRef as any}
                  style={{
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    touchAction: "none",
                    position: "relative",
                    paddingTop: 12,
                    paddingBottom: 12,
                    marginLeft: -4,
                    marginRight: -4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 3,
                      backgroundColor: "rgba(255,255,255,0.3)",
                      borderRadius: 2,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: "100%",
                        backgroundColor: "#E50914",
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: -5,
                        left: `${progressPercent}%`,
                        width: 13,
                        height: 13,
                        borderRadius: 7,
                        backgroundColor: "#E50914",
                        marginLeft: -6,
                      }}
                    />
                  </div>
                </div>
              </View>
            </>
          )}
        </View>
      )}

      <CastModal
        visible={showCast}
        onClose={() => setShowCast(false)}
        onSelect={() => {}}
      />

      {/* Modal Paramètres web */}
      <SettingsModal
        visible={settingsPanel !== "none"}
        onClose={() => setSettingsPanel("none")}
        panel={settingsPanel === "none" ? "main" : settingsPanel}
        setPanel={setSettingsPanel}
        mediaSource={webMediaSource}
        serverUrl={serverUrl}
        itemId={itemId}
        token={token}
        selectedSubIndex={selectedSubIndex}
        onSelectSubtitle={handleWebSelectSubtitle}
        selectedAudioIndex={selectedAudioIndex}
        onSelectAudio={handleWebSelectAudio}
        selectedQuality={selectedQuality}
        onSelectQuality={setSelectedQuality}
        selectedAspect={aspectRatio}
        onSelectAspect={setAspectRatio}
      />
    </View>
  );
}

// ═══════════════════════════════════════════
// PLAYER NATIF — expo-video VideoView + gestes + paramètres
// ═══════════════════════════════════════════
function NativePlayer({
  streamUrl,
  title,
  itemId,
  onClose,
}: {
  streamUrl: string;
  title: string;
  itemId: string;
  onClose: () => void;
}) {
  const { useVideoPlayer: useNativePlayer, VideoView } = ExpoVideo!;
  const videoViewRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const token = useAuthStore((s) => s.token) ?? "";

  // State lecteur
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showCast, setShowCast] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // State paramètres
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>("none");
  const [selectedSubIndex, setSelectedSubIndex] = useState(-1);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<QualityProfile>(
    QUALITY_PROFILES[0],
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>("contain");

  // Gestes volume/luminosité
  const [gestureType, setGestureType] = useState<
    "volume" | "brightness" | null
  >(null);
  const [gestureValue, setGestureValue] = useState(0);
  const gestureStartY = useRef(0);
  const gestureStartVal = useRef(0);
  const gestureActive = useRef(false);
  const gestureSide = useRef<"left" | "right" | null>(null);
  const gestureHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderRef = useRef<View>(null);
  const isSeekingRef = useRef(false);
  const barLayout = useRef<{ x: number; width: number }>({ x: 0, width: 0 });

  const displayTime = isSeeking ? seekValue : currentTimeSec;
  const progressPercent =
    durationSec > 0 ? (displayTime / durationSec) * 100 : 0;

  // PlaybackInfo depuis Jellyfin (sous-titres, audio, sources)
  const { data: playbackInfo } = usePlaybackInfo(itemId);
  const mediaSource: MediaSource | null =
    playbackInfo?.MediaSources?.[0] ?? null;

  // Initialiser les index par défaut depuis la source
  useEffect(() => {
    if (mediaSource) {
      if (
        mediaSource.DefaultSubtitleStreamIndex != null &&
        mediaSource.DefaultSubtitleStreamIndex >= 0
      ) {
        setSelectedSubIndex(mediaSource.DefaultSubtitleStreamIndex);
      }
      if (mediaSource.DefaultAudioStreamIndex != null) {
        setSelectedAudioIndex(mediaSource.DefaultAudioStreamIndex);
      }
    }
  }, [mediaSource]);

  // Fallback : utiliser la durée Jellyfin si le player ne la rapporte pas
  useEffect(() => {
    if (durationSec <= 0 && mediaSource?.RunTimeTicks) {
      setDurationSec(mediaSource.RunTimeTicks / 10_000_000);
    }
  }, [durationSec, mediaSource]);

  const player = useNativePlayer(streamUrl, (p: any) => {
    p.loop = false;
    p.muted = false;
    p.play();
    p.timeUpdateEventInterval = 0.25;
  });

  // Verrouiller en paysage à l'ouverture du player
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, []);

  // Récupérer la luminosité initiale
  useEffect(() => {
    if (Brightness) {
      Brightness.getBrightnessAsync().then((b: number) => {
        setGestureValue(b);
      });
    }
  }, []);

  // Event listeners du player
  useEffect(() => {
    const timeSub = player.addListener(
      "timeUpdate",
      ({ currentTime: ct }: any) => {
        if (!isSeekingRef.current) setCurrentTimeSec(ct);
        // Récupérer la durée dès qu'elle est disponible
        if (player.duration > 0) {
          setDurationSec((prev) =>
            prev !== player.duration ? player.duration : prev,
          );
        }
      },
    );
    const statusSub = player.addListener("statusChange", ({ status }: any) => {
      if (status === "readyToPlay") {
        setIsBuffering(false);
        if (player.duration > 0) {
          setDurationSec(player.duration);
        }
      }
      if (status === "loading") setIsBuffering(true);
    });
    return () => {
      timeSub.remove();
      statusSub.remove();
    };
  }, [player]);

  // === Contrôles ===
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, [isPlaying]);

  useEffect(() => {
    if (!isLocked) resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, isLocked]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) player.pause();
    else player.play();
    setIsPlaying(!isPlaying);
    resetHideTimer();
  }, [isPlaying, player, resetHideTimer]);

  const seekRelative = useCallback(
    (sec: number) => {
      const t = Math.max(0, Math.min(player.currentTime + sec, durationSec));
      player.currentTime = t;
      setCurrentTimeSec(t);
      resetHideTimer();
    },
    [player, durationSec, resetHideTimer],
  );

  // === Barre de progression ===
  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    sliderRef.current?.measureInWindow((x: number) => {
      barLayout.current = { x, width };
    });
  }, []);

  const handleSliderPress = useCallback(
    (pageX: number) => {
      const { x, width } = barLayout.current;
      if (width <= 0 || durationSec <= 0) return;
      const ratio = Math.max(0, Math.min((pageX - x) / width, 1));
      const newTime = ratio * durationSec;
      setSeekValue(newTime);
      setIsSeeking(true);
      isSeekingRef.current = true;
    },
    [durationSec],
  );

  const handleSliderMove = useCallback(
    (pageX: number) => {
      if (!isSeekingRef.current) return;
      const { x, width } = barLayout.current;
      if (width <= 0 || durationSec <= 0) return;
      const ratio = Math.max(0, Math.min((pageX - x) / width, 1));
      setSeekValue(ratio * durationSec);
    },
    [durationSec],
  );

  const handleSliderRelease = useCallback(() => {
    if (isSeekingRef.current) {
      player.currentTime = seekValue;
      setCurrentTimeSec(seekValue);
      setIsSeeking(false);
      isSeekingRef.current = false;
      resetHideTimer();
    }
  }, [seekValue, player, resetHideTimer]);

  // === Gestes volume / luminosité ===
  const screenHeight = Dimensions.get("window").height;

  const handleGestureStart = useCallback(
    (pageX: number, pageY: number) => {
      const screenWidth = Dimensions.get("window").width;
      const side = pageX < screenWidth / 2 ? "left" : "right";
      gestureSide.current = side;
      gestureStartY.current = pageY;
      gestureActive.current = false;

      if (side === "right") {
        // Volume : on lit le volume du player
        gestureStartVal.current = player.volume ?? 1;
      } else {
        // Luminosité
        if (Brightness) {
          Brightness.getBrightnessAsync().then((b: number) => {
            gestureStartVal.current = b;
          });
        }
      }
    },
    [player],
  );

  const handleGestureMove = useCallback(
    (pageY: number) => {
      const deltaY = gestureStartY.current - pageY;
      if (!gestureActive.current && Math.abs(deltaY) < GESTURE_THRESHOLD)
        return;
      gestureActive.current = true;

      const ratio = deltaY / (screenHeight * 0.4);
      const newVal = Math.max(0, Math.min(1, gestureStartVal.current + ratio));

      if (gestureSide.current === "right") {
        // Volume
        player.volume = newVal;
        setGestureType("volume");
        setGestureValue(newVal);
      } else {
        // Luminosité
        if (Brightness) {
          Brightness.setBrightnessAsync(newVal);
        }
        setGestureType("brightness");
        setGestureValue(newVal);
      }
    },
    [player, screenHeight],
  );

  const handleGestureEnd = useCallback(() => {
    gestureActive.current = false;
    gestureSide.current = null;
    if (gestureHideTimer.current) clearTimeout(gestureHideTimer.current);
    gestureHideTimer.current = setTimeout(() => {
      setGestureType(null);
    }, 800);
  }, []);

  // === Reconstruit l'URL et remplace la source du player ===
  const replacePlayerSource = useCallback(
    (opts: { audioStreamIndex?: number; subtitleStreamIndex?: number }) => {
      const currentPos = player.currentTime;
      const newUrl = getStreamUrl(serverUrl, itemId, token, {
        audioStreamIndex: opts.audioStreamIndex ?? selectedAudioIndex,
        subtitleStreamIndex: opts.subtitleStreamIndex ?? selectedSubIndex,
        mediaSourceId: mediaSource?.Id,
      });
      player.replace(newUrl);
      // Restaurer la position après le chargement
      const sub = player.addListener("statusChange", ({ status }: any) => {
        if (status === "readyToPlay") {
          player.currentTime = currentPos;
          player.play();
          sub.remove();
        }
      });
    },
    [
      player,
      serverUrl,
      itemId,
      token,
      selectedAudioIndex,
      selectedSubIndex,
      mediaSource,
    ],
  );

  // === Sous-titres ===
  const handleSelectSubtitle = useCallback(
    (index: number) => {
      setSelectedSubIndex(index);
      replacePlayerSource({ subtitleStreamIndex: index });
    },
    [replacePlayerSource],
  );

  // === Audio ===
  const handleSelectAudio = useCallback(
    (index: number) => {
      setSelectedAudioIndex(index);
      replacePlayerSource({ audioStreamIndex: index });
    },
    [replacePlayerSource],
  );

  // === Qualité ===
  const handleSelectQuality = useCallback(
    (q: QualityProfile) => {
      setSelectedQuality(q);
      // Reconstruire l'URL avec la nouvelle qualité et remplacer
      const currentPos = player.currentTime;
      const newUrl = getStreamUrl(serverUrl, itemId, token, {
        audioStreamIndex: selectedAudioIndex,
        subtitleStreamIndex: selectedSubIndex,
        mediaSourceId: mediaSource?.Id,
      });
      player.replace(newUrl);
      const sub = player.addListener("statusChange", ({ status }: any) => {
        if (status === "readyToPlay") {
          player.currentTime = currentPos;
          player.play();
          sub.remove();
        }
      });
    },
    [
      player,
      serverUrl,
      itemId,
      token,
      selectedAudioIndex,
      selectedSubIndex,
      mediaSource,
    ],
  );

  // === Lock screen ===
  const handleLock = useCallback(() => {
    setIsLocked(true);
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Masquer les contrôles lock après le délai
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, []);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    resetHideTimer();
  }, [resetHideTimer]);

  return (
    <View style={s.container}>
      <StatusBar hidden />
      {/* Zone vidéo avec gestes volume/luminosité */}
      <View
        style={s.videoWrapper}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          if (isLocked) {
            // En mode verrouillé, toggle contrôles
            setShowControls((v) => !v);
            return;
          }
          handleGestureStart(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }}
        onResponderMove={(e) => {
          if (isLocked) return;
          handleGestureMove(e.nativeEvent.pageY);
        }}
        onResponderRelease={() => {
          if (isLocked) return;
          if (gestureActive.current) {
            handleGestureEnd();
          } else {
            // Simple tap : toggle contrôles
            if (showControls) {
              setShowControls(false);
              if (hideTimer.current) clearTimeout(hideTimer.current);
            } else {
              resetHideTimer();
            }
          }
        }}
      >
        <VideoView
          ref={videoViewRef}
          style={s.video}
          player={player}
          nativeControls={false}
          contentFit={aspectRatio}
        />
      </View>

      {/* Indicateur geste */}
      <GestureIndicator type={gestureType} value={gestureValue} />

      {isBuffering && (
        <View style={s.bufferingOverlay}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {showControls && (
        <View
          style={[
            s.controlsOverlay,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 8,
              pointerEvents: "box-none",
            },
          ]}
        >
          {isLocked ? (
            <View style={s.lockedContainer}>
              <Pressable style={s.lockButton} onPress={handleUnlock}>
                <Ionicons name="lock-closed" size={24} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <>
              {/* Barre du haut */}
              <View style={s.topBar}>
                <Pressable onPress={onClose} style={s.iconButton}>
                  <Ionicons name="arrow-back" size={26} color="#fff" />
                </Pressable>
                <View style={s.titleContainer}>
                  <Text style={s.titleText} numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <View style={s.topBarRight}>
                  <Pressable
                    onPress={() => setShowCast(true)}
                    style={s.iconButton}
                  >
                    <CastIcon size={22} color="#fff" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setSettingsPanel("main");
                    }}
                    style={s.iconButton}
                  >
                    <Ionicons name="settings-outline" size={22} color="#fff" />
                  </Pressable>
                  <Pressable onPress={handleLock} style={s.iconButton}>
                    <Ionicons name="lock-open" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {/* Contrôles centraux (skip + play/pause) */}
              <View style={s.centerControls}>
                <Pressable
                  onPress={() => seekRelative(-10)}
                  style={s.seekButton}
                >
                  <SkipBackIcon size={44} color="#fff" />
                </Pressable>
                <Pressable onPress={togglePlayPause} style={s.playPauseButton}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={42}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  onPress={() => seekRelative(10)}
                  style={s.seekButton}
                >
                  <SkipForwardIcon size={44} color="#fff" />
                </Pressable>
              </View>

              {/* Barre du bas : progression + temps */}
              <View style={s.bottomBar}>
                <View
                  ref={sliderRef}
                  style={s.progressBarContainer}
                  onLayout={handleBarLayout}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) =>
                    handleSliderPress(e.nativeEvent.pageX)
                  }
                  onResponderMove={(e) => handleSliderMove(e.nativeEvent.pageX)}
                  onResponderRelease={handleSliderRelease}
                  onResponderTerminate={handleSliderRelease}
                >
                  <View style={s.progressTrack}>
                    <View
                      style={[s.progressFill, { width: `${progressPercent}%` }]}
                    />
                    <View
                      style={[s.progressThumb, { left: `${progressPercent}%` }]}
                    />
                  </View>
                </View>
                <View style={s.timeRow}>
                  <Text style={s.timeText}>{formatTime(displayTime)}</Text>
                  <Text style={s.timeTextMuted}>
                    {" / "}
                    {formatTime(durationSec)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => videoViewRef.current?.enterFullscreen()}
                    style={s.iconButton}
                  >
                    <Ionicons name="expand-outline" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Modal Paramètres */}
      <SettingsModal
        visible={settingsPanel !== "none"}
        onClose={() => setSettingsPanel("none")}
        panel={settingsPanel === "none" ? "main" : settingsPanel}
        setPanel={setSettingsPanel}
        mediaSource={mediaSource}
        serverUrl={serverUrl}
        itemId={itemId}
        token={token}
        selectedSubIndex={selectedSubIndex}
        onSelectSubtitle={handleSelectSubtitle}
        selectedAudioIndex={selectedAudioIndex}
        onSelectAudio={handleSelectAudio}
        selectedQuality={selectedQuality}
        onSelectQuality={handleSelectQuality}
        selectedAspect={aspectRatio}
        onSelectAspect={setAspectRatio}
      />

      <CastModal
        visible={showCast}
        onClose={() => setShowCast(false)}
        onSelect={() => {}}
      />
    </View>
  );
}

// ═══════════════════════════════════════════
// ÉCRAN PRINCIPAL — routing vers Web ou Natif
// ═══════════════════════════════════════════
export default function PlayerScreen() {
  const { itemId: rawItemId, title: rawTitle } = useLocalSearchParams<{
    itemId: string;
    title?: string;
  }>();
  const router = useRouter();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const token = useAuthStore((s) => s.token) ?? "";
  const userId = useAuthStore((s) => s.userId) ?? "";

  // Si l'item est une série, résoudre vers le premier épisode
  const [resolvedItemId, setResolvedItemId] = useState<string | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState(rawTitle ?? "");
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!rawItemId || !serverUrl || !token) {
      setResolving(false);
      return;
    }
    (async () => {
      try {
        // Vérifier le type de l'item
        const baseUrl = serverUrl.replace(/\/+$/, "");
        const itemResp = await fetch(
          `${baseUrl}/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(rawItemId)}`,
          { headers: { Authorization: `MediaBrowser Token="${token}"` } },
        );
        if (!itemResp.ok) {
          setResolvedItemId(rawItemId);
          setResolving(false);
          return;
        }
        const item = await itemResp.json();

        if (item.Type === "Series") {
          // Récupérer le premier épisode
          const epResp = await fetch(
            `${baseUrl}/Shows/${encodeURIComponent(rawItemId)}/Episodes?userId=${encodeURIComponent(userId)}&startIndex=0&limit=1`,
            { headers: { Authorization: `MediaBrowser Token="${token}"` } },
          );
          if (epResp.ok) {
            const epData = await epResp.json();
            if (epData.Items && epData.Items.length > 0) {
              setResolvedItemId(epData.Items[0].Id);
              setResolvedTitle(epData.Items[0].Name ?? rawTitle ?? "");
              setResolving(false);
              return;
            }
          }
        }
        // Film ou épisode direct
        setResolvedItemId(rawItemId);
        setResolvedTitle(rawTitle ?? item.Name ?? "");
      } catch {
        setResolvedItemId(rawItemId);
      } finally {
        setResolving(false);
      }
    })();
  }, [rawItemId, serverUrl, token, userId, rawTitle]);

  const itemId = resolvedItemId;

  // Web : transcodé MP4/H.264 (compatible tous navigateurs) — seek via StartTimeTicks
  // Natif : direct stream (VLC/expo-video gère tous les codecs)
  const streamUrl =
    Platform.OS === "web"
      ? getWebTranscodedUrl(serverUrl, itemId ?? "", token)
      : getStreamUrl(serverUrl, itemId ?? "", token);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  if (resolving) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      </View>
    );
  }

  if (!itemId || !streamUrl) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Text style={s.errorText}>Impossible de charger la vidéo</Text>
          <Pressable style={s.errorButton} onPress={handleClose}>
            <Text style={s.errorButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <WebPlayer
        streamUrl={streamUrl}
        title={resolvedTitle}
        itemId={itemId ?? ""}
        onClose={handleClose}
      />
    );
  }
  return (
    <NativePlayer
      streamUrl={streamUrl}
      title={resolvedTitle}
      itemId={itemId ?? ""}
      onClose={handleClose}
    />
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
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
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  titleText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 56,
  },
  playPauseButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  seekButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
  },
  seekLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    position: "absolute",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  progressBarContainer: {
    height: 32,
    justifyContent: "center",
    cursor: "pointer" as any,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E50914",
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#E50914",
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  timeTextMuted: {
    color: "#999",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingLeft: 20,
    paddingBottom: 20,
  },
  lockButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});

// Styles panneau paramètres
const settingsStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "flex-end",
    zIndex: 9999,
  },
  container: {
    width: 320,
    maxHeight: "85%",
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    padding: 16,
  },
  menu: {
    gap: 4,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  menuText: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
  },
  menuValue: {
    color: "#999",
    fontSize: 13,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 8,
  },
  optionSelected: {
    backgroundColor: "rgba(229,9,20,0.15)",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  optionSub: {
    color: "#888",
    fontSize: 11,
  },
});

// Styles indicateur geste volume/luminosité
const gestureStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -28,
    marginTop: -60,
    width: 56,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 100,
  },
  barBg: {
    width: 4,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#E50914",
    borderRadius: 2,
  },
  label: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
