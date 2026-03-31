import { CastModal } from "@/components/CastModal";
import { CastIcon } from "@/icons/CastIcon";
import { useAuthStore } from "@/src/stores/authStore";
import { getStreamUrl, getWebTranscodedUrl } from "@/src/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import conditionnel expo-video (seulement sur natif)
const ExpoVideo = Platform.OS !== "web" ? require("expo-video") : null;

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

// ═══════════════════════════════════════════
// PLAYER WEB — <video> HTML natif + contrôles custom
// ═══════════════════════════════════════════
function WebPlayer({
  streamUrl,
  title,
  onClose,
}: {
  streamUrl: string;
  title: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

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

    video.addEventListener("loadedmetadata", () => {
      setDurationSec(video.duration);
      setIsBuffering(false);
    });
    video.addEventListener("timeupdate", () => {
      if (!isSeeking) setCurrentTimeSec(video.currentTime);
    });
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      if (!isSeeking) setCurrentTimeSec(video.currentTime);
    };
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [isSeeking]);

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
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(
        0,
        Math.min(v.currentTime + sec, v.duration || 0),
      );
      setCurrentTimeSec(v.currentTime);
      resetHideTimer();
    },
    [resetHideTimer],
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const seekFromMouse = useCallback(
    (clientX: number, commit: boolean) => {
      const bar = progressRef.current;
      const v = videoRef.current;
      if (!bar || !v || durationSec <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min((clientX - rect.left) / rect.width, 1),
      );
      const newTime = ratio * durationSec;
      if (commit) {
        v.currentTime = newTime;
        setCurrentTimeSec(newTime);
        setIsSeeking(false);
      } else {
        setSeekValue(newTime);
        setIsSeeking(true);
      }
    },
    [durationSec],
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
  }, [seekFromMouse, resetHideTimer]);

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
    <View style={s.container}>
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
          style={[s.controlsOverlay, { paddingTop: 16, paddingBottom: 16, pointerEvents: "box-none" }]}
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
                  <Ionicons
                    name="refresh-outline"
                    size={36}
                    color="#fff"
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                  <Text style={s.seekLabel}>10</Text>
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
                  <Ionicons name="refresh-outline" size={36} color="#fff" />
                  <Text style={s.seekLabel}>10</Text>
                </Pressable>
              </View>

              <View style={s.bottomBar}>
                <div
                  ref={progressRef as any}
                  style={{
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    touchAction: "none",
                    position: "relative",
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
    </View>
  );
}

// ═══════════════════════════════════════════
// PLAYER NATIF — expo-video VideoView
// ═══════════════════════════════════════════
function NativePlayer({
  streamUrl,
  title,
  onClose,
}: {
  streamUrl: string;
  title: string;
  onClose: () => void;
}) {
  const { useVideoPlayer: useNativePlayer, VideoView } = ExpoVideo!;
  const videoViewRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showCast, setShowCast] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderRef = useRef<View>(null);

  const displayTime = isSeeking ? seekValue : currentTimeSec;
  const progressPercent =
    durationSec > 0 ? (displayTime / durationSec) * 100 : 0;

  const player = useNativePlayer(streamUrl, (p: any) => {
    p.loop = false;
    p.muted = false;
    p.play();
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    const timeSub = player.addListener(
      "timeUpdate",
      ({ currentTime: ct }: any) => {
        if (!isSeeking) setCurrentTimeSec(ct);
      },
    );
    const sourceSub = player.addListener(
      "sourceLoad",
      ({ duration: d }: any) => {
        setDurationSec(d);
        setIsBuffering(false);
      },
    );
    const statusSub = player.addListener("statusChange", ({ status }: any) => {
      if (status === "readyToPlay") setIsBuffering(false);
    });
    return () => {
      timeSub.remove();
      sourceSub.remove();
      statusSub.remove();
    };
  }, [player, isSeeking]);

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

  const handleSliderPress = useCallback(
    (pageX: number) => {
      if (!sliderRef.current || durationSec <= 0) return;
      sliderRef.current.measure((_x, _y, width, _h, px) => {
        const ratio = Math.max(0, Math.min((pageX - px) / width, 1));
        setSeekValue(ratio * durationSec);
        setIsSeeking(true);
      });
    },
    [durationSec],
  );

  const handleSliderMove = useCallback(
    (pageX: number) => {
      if (!isSeeking || !sliderRef.current || durationSec <= 0) return;
      sliderRef.current.measure((_x, _y, width, _h, px) => {
        const ratio = Math.max(0, Math.min((pageX - px) / width, 1));
        setSeekValue(ratio * durationSec);
      });
    },
    [isSeeking, durationSec],
  );

  const handleSliderRelease = useCallback(() => {
    if (isSeeking) {
      player.currentTime = seekValue;
      setCurrentTimeSec(seekValue);
      setIsSeeking(false);
      resetHideTimer();
    }
  }, [isSeeking, seekValue, player, resetHideTimer]);

  return (
    <View style={s.container}>
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
        <VideoView
          ref={videoViewRef}
          style={s.video}
          player={player}
          nativeControls={false}
          contentFit="contain"
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
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, pointerEvents: "box-none" },
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
                  <Ionicons
                    name="refresh-outline"
                    size={36}
                    color="#fff"
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                  <Text style={s.seekLabel}>10</Text>
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
                  <Ionicons name="refresh-outline" size={36} color="#fff" />
                  <Text style={s.seekLabel}>10</Text>
                </Pressable>
              </View>

              <View style={s.bottomBar}>
                <View
                  ref={sliderRef}
                  style={s.progressBarContainer}
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
  const { itemId, title } = useLocalSearchParams<{
    itemId: string;
    title?: string;
  }>();
  const router = useRouter();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const token = useAuthStore((s) => s.token) ?? "";

  const streamUrl =
    Platform.OS === "web"
      ? getWebTranscodedUrl(serverUrl, itemId ?? "", token)
      : getStreamUrl(serverUrl, itemId ?? "", token);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

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
        title={title ?? ""}
        onClose={handleClose}
      />
    );
  }
  return (
    <NativePlayer
      streamUrl={streamUrl}
      title={title ?? ""}
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
    width: 48,
    height: 48,
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
