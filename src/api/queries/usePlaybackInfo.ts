// Hook pour récupérer les infos de lecture (sources, sous-titres, profils de qualité)
import { useAuthStore } from "@/src/stores/authStore";
import { useQuery } from "@tanstack/react-query";

// Types pour le retour Jellyfin PlaybackInfo
export interface MediaStream {
  Index: number;
  Type: "Video" | "Audio" | "Subtitle" | "Embedded";
  Codec: string;
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
  IsExternal?: boolean;
  DeliveryMethod?: "Encode" | "Embed" | "External" | "Hls";
  DeliveryUrl?: string;
  SupportsExternalStream?: boolean;
  Channels?: number;
}

export interface MediaSource {
  Id: string;
  Name?: string;
  Path?: string;
  Container?: string;
  Size?: number;
  Bitrate?: number;
  RunTimeTicks?: number;
  MediaStreams: MediaStream[];
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  TranscodingUrl?: string;
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
}

export interface PlaybackInfo {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}

// Profils de qualité disponibles
export interface QualityProfile {
  label: string;
  maxBitrate: number;
  maxWidth?: number;
}

export const QUALITY_PROFILES: QualityProfile[] = [
  { label: "Auto", maxBitrate: 0 },
  { label: "4K - 120 Mbps", maxBitrate: 120000000, maxWidth: 3840 },
  { label: "1080p - 40 Mbps", maxBitrate: 40000000, maxWidth: 1920 },
  { label: "1080p - 20 Mbps", maxBitrate: 20000000, maxWidth: 1920 },
  { label: "720p - 8 Mbps", maxBitrate: 8000000, maxWidth: 1280 },
  { label: "720p - 4 Mbps", maxBitrate: 4000000, maxWidth: 1280 },
  { label: "480p - 1.5 Mbps", maxBitrate: 1500000, maxWidth: 854 },
  { label: "360p - 420 Kbps", maxBitrate: 420000, maxWidth: 640 },
];

// Récupérer les PlaybackInfo d'un item (sources, sous-titres, audio)
export function usePlaybackInfo(itemId: string) {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  const token = useAuthStore((s) => s.token);
  const serverUrl = useAuthStore((s) => s.serverUrl);

  return useQuery<PlaybackInfo>({
    queryKey: ["playbackInfo", itemId],
    queryFn: async () => {
      const baseUrl = (serverUrl ?? "").replace(/\/+$/, "");
      const response = await fetch(
        `${baseUrl}/Items/${encodeURIComponent(itemId)}/PlaybackInfo?userId=${encodeURIComponent(userId ?? "")}`,
        {
          method: "POST",
          headers: {
            Authorization: `MediaBrowser Token="${token}"`,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );

      if (!response.ok) {
        throw new Error(`PlaybackInfo failed: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!serverUrl && !!token && !!userId && !!itemId,
  });
}

// Extraire les sous-titres d'une source média
export function getSubtitleStreams(source: MediaSource): MediaStream[] {
  return (source.MediaStreams ?? []).filter((s) => s.Type === "Subtitle");
}

// Extraire les pistes audio d'une source média
export function getAudioStreams(source: MediaSource): MediaStream[] {
  return (source.MediaStreams ?? []).filter((s) => s.Type === "Audio");
}

// Construire l'URL de sous-titres externes Jellyfin
export function getSubtitleUrl(
  serverUrl: string,
  itemId: string,
  mediaSourceId: string,
  streamIndex: number,
  format: string,
  token: string,
): string {
  const baseUrl = serverUrl.replace(/\/+$/, "");
  return `${baseUrl}/Videos/${encodeURIComponent(itemId)}/${encodeURIComponent(mediaSourceId)}/Subtitles/${streamIndex}/0/Stream.${format}?api_key=${encodeURIComponent(token)}`;
}

// Construire l'URL de streaming avec qualité spécifique
export function getQualityStreamUrl(
  serverUrl: string,
  itemId: string,
  token: string,
  profile: QualityProfile,
  mediaSourceId?: string,
): string {
  const baseUrl = serverUrl.replace(/\/+$/, "");
  // Auto = direct play
  if (profile.maxBitrate === 0) {
    const params = new URLSearchParams({
      static: "true",
      api_key: token,
    });
    if (mediaSourceId) params.set("mediaSourceId", mediaSourceId);
    return `${baseUrl}/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`;
  }
  // Transcodage HLS pour une qualité spécifique
  const params = new URLSearchParams({
    api_key: token,
    DeviceId: "jellystream-native",
    MediaSourceId: mediaSourceId ?? itemId,
    VideoCodec: "h264",
    AudioCodec: "aac",
    MaxStreamingBitrate: String(profile.maxBitrate),
    TranscodingMaxAudioChannels: "6",
    SegmentContainer: "ts",
    MinSegments: "1",
    BreakOnNonKeyFrames: "true",
  });
  if (profile.maxWidth) {
    params.set("MaxWidth", String(profile.maxWidth));
  }
  return `${baseUrl}/Videos/${encodeURIComponent(itemId)}/master.m3u8?${params.toString()}`;
}
