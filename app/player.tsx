import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue } from 'react-native-reanimated';
import { useAuthStore } from '@/src/stores/authStore';
import { getStreamUrl, getWebTranscodedUrl } from '@/src/utils/imageUrl';
import { useItemDetail } from '@/src/api/queries/useMediaQueries';

// Formatage du temps mm:ss ou h:mm:ss
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const CONTROLS_HIDE_DELAY = 4000;

export default function PlayerScreen() {
  const { itemId, title } = useLocalSearchParams<{ itemId: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? '';
  const token = useAuthStore((s) => s.token) ?? '';
  const videoViewRef = useRef<VideoView>(null);

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [durationMs, setDurationMs] = useState(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('0:00');
  const [durationDisplay, setDurationDisplay] = useState('0:00');
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(1);

  // MP4 transcodé sur web (compatible tous navigateurs), direct play sur natif
  const streamUrl = Platform.OS === 'web'
    ? getWebTranscodedUrl(serverUrl, itemId ?? '', token)
    : getStreamUrl(serverUrl, itemId ?? '', token);

  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
    p.timeUpdateEventInterval = 0.5;
  });

  // Gérer les événements du player
  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', ({ currentTime: ct }) => {
      progress.value = ct * 1000;
      setCurrentTimeDisplay(formatTime(ct * 1000));
    });
    const sourceSub = player.addListener('sourceLoad', ({ duration: d }) => {
      const ms = d * 1000;
      setDurationMs(ms);
      max.value = ms;
      setDurationDisplay(formatTime(ms));
      setIsBuffering(false);
    });
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setIsBuffering(false);
      }
    });
    return () => {
      timeSub.remove();
      sourceSub.remove();
      statusSub.remove();
    };
  }, [player]);

  // Auto-hide des contrôles
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, [isPlaying]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
    resetHideTimer();
  }, [isPlaying, player, resetHideTimer]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  }, [showControls, resetHideTimer]);

  const seekRelative = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(player.currentTime + seconds, durationMs / 1000));
    player.currentTime = newTime;
    resetHideTimer();
  }, [player, durationMs, resetHideTimer]);

  const handleClose = useCallback(() => {
    player.pause();
    router.back();
  }, [player, router]);

  const handleFullscreen = useCallback(() => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  }, []);

  if (!itemId || !streamUrl) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.center}>
          <Text style={styles.errorText}>Impossible de charger la vidéo</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video */}
      <Pressable style={styles.videoWrapper} onPress={toggleControls}>
        <VideoView
          ref={videoViewRef}
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="contain"
        />
      </Pressable>

      {/* Buffering indicator */}
      {isBuffering && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {/* Controls overlay */}
      {showControls && (
        <View style={[styles.controlsOverlay, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={handleClose} style={styles.controlButton}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.titleText} numberOfLines={1}>
              {title ?? ''}
            </Text>
            <View style={styles.topBarRight}>
              <Pressable onPress={handleFullscreen} style={styles.controlButton}>
                <Ionicons name="expand-outline" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Center controls */}
          <View style={styles.centerControls}>
            <Pressable onPress={() => seekRelative(-10)} style={styles.seekButton}>
              <Ionicons name="play-back" size={32} color="#fff" />
              <Text style={styles.seekLabel}>10</Text>
            </Pressable>

            <Pressable onPress={togglePlayPause} style={styles.playPauseButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={48}
                color="#fff"
              />
            </Pressable>

            <Pressable onPress={() => seekRelative(10)} style={styles.seekButton}>
              <Ionicons name="play-forward" size={32} color="#fff" />
              <Text style={styles.seekLabel}>10</Text>
            </Pressable>
          </View>

          {/* Bottom bar with slider */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{currentTimeDisplay}</Text>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                progress={progress}
                minimumValue={min}
                maximumValue={max}
                onValueChange={(value) => {
                  player.currentTime = value / 1000;
                  resetHideTimer();
                }}
                theme={{
                  minimumTrackTintColor: '#E50914',
                  bubbleBackgroundColor: '#E50914',
                }}
                thumbWidth={12}
                sliderHeight={3}
                disableTrackFollow={false}
                disableTapEvent={false}
              />
            </View>
            <Text style={styles.timeText}>{durationDisplay}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 12,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 12,
  },
  controlButton: {
    padding: 8,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 45,
    textAlign: 'center',
  },
  sliderWrapper: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 30,
  },
});
