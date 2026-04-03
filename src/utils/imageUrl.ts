// Helper pour construire les URLs d'images Jellyfin optimisées
import { ImageType } from "@jellyfin/sdk/lib/generated-client/models";

interface ImageUrlOptions {
  serverUrl: string;
  itemId: string;
  imageType?: ImageType;
  maxWidth?: number;
  quality?: number;
  tag?: string;
}

export function getImageUrl({
  serverUrl,
  itemId,
  imageType = ImageType.Primary,
  maxWidth = 400,
  quality = 90,
  tag,
}: ImageUrlOptions): string {
  if (!serverUrl || !itemId) return "";
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    maxWidth: String(maxWidth),
    quality: String(quality),
  });
  if (tag) {
    params.set("tag", tag);
  }
  return `${baseUrl}/Items/${itemId}/Images/${imageType}?${params.toString()}`;
}

export function getBackdropUrl(
  serverUrl: string,
  itemId: string,
  maxWidth = 1280,
  quality = 80,
  tag?: string,
): string {
  return getImageUrl({
    serverUrl,
    itemId,
    imageType: ImageType.Backdrop,
    maxWidth,
    quality,
    tag,
  });
}

export function getLogoUrl(
  serverUrl: string,
  itemId: string,
  maxWidth = 500,
  quality = 90,
  tag?: string,
): string {
  return getImageUrl({
    serverUrl,
    itemId,
    imageType: ImageType.Logo,
    maxWidth,
    quality,
    tag,
  });
}

// Construit l'URL de streaming direct pour un item Jellyfin
export function getStreamUrl(
  serverUrl: string,
  itemId: string,
  token: string,
  options?: {
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    mediaSourceId?: string;
  },
): string {
  if (!serverUrl || !itemId || !token) return "";
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    static: "true",
    api_key: token,
  });
  if (options?.audioStreamIndex != null) {
    params.set("AudioStreamIndex", String(options.audioStreamIndex));
  }
  if (
    options?.subtitleStreamIndex != null &&
    options.subtitleStreamIndex >= 0
  ) {
    params.set("SubtitleStreamIndex", String(options.subtitleStreamIndex));
  }
  if (options?.mediaSourceId) {
    params.set("MediaSourceId", options.mediaSourceId);
  }
  return `${baseUrl}/Videos/${itemId}/stream?${params.toString()}`;
}

// Construit l'URL de streaming transcodé progressif (MP4/H.264) pour le web
// Fonctionne dans <video> sur tous les navigateurs, pas besoin de HLS.js
export function getWebTranscodedUrl(
  serverUrl: string,
  itemId: string,
  token: string,
  options?: {
    maxWidth?: number;
    videoBitRate?: number;
    audioBitRate?: number;
    startTimeTicks?: number;
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    playSessionId?: string;
    mediaSourceId?: string;
  },
): string {
  if (!serverUrl || !itemId || !token) return "";
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    api_key: token,
    DeviceId: `jellystream-web-${Date.now()}`,
    // Utiliser le MediaSourceId réel de PlaybackInfo (peut différer de itemId pour certains fichiers)
    MediaSourceId: options?.mediaSourceId ?? itemId,
    Container: "mp4",
    VideoCodec: "h264",
    AudioCodec: "aac",
    // Forcer le transcodage audio (jamais de stream-copy) → évite DTS/AC3/TrueHD silencieux dans MP4
    AllowAudioStreamCopy: "false",
    MaxStreamingBitrate: String(options?.videoBitRate ?? 8000000),
    VideoBitrate: String(options?.videoBitRate ?? 8000000),
    AudioBitrate: String(options?.audioBitRate ?? 192000),
    // MaxAudioChannels est le bon paramètre pour stream.mp4 (TranscodingMaxAudioChannels = HLS uniquement)
    MaxAudioChannels: "2",
  });
  if (options?.maxWidth) {
    params.set("MaxWidth", String(options.maxWidth));
  }
  if (options?.startTimeTicks != null && options.startTimeTicks > 0) {
    params.set("StartTimeTicks", String(Math.round(options.startTimeTicks)));
  }
  if (options?.audioStreamIndex != null) {
    params.set("AudioStreamIndex", String(options.audioStreamIndex));
  }
  if (
    options?.subtitleStreamIndex != null &&
    options.subtitleStreamIndex >= 0
  ) {
    params.set("SubtitleStreamIndex", String(options.subtitleStreamIndex));
    params.set("SubtitleMethod", "Encode");
  }
  if (options?.playSessionId) {
    params.set("PlaySessionId", options.playSessionId);
  }
  return `${baseUrl}/Videos/${itemId}/stream.mp4?${params.toString()}`;
}

// Construit l'URL de streaming HLS (transcodage adaptatif) pour preview web/mobile
export function getHlsStreamUrl(
  serverUrl: string,
  itemId: string,
  token: string,
  options?: {
    maxWidth?: number;
    videoBitRate?: number;
    audioBitRate?: number;
  },
): string {
  if (!serverUrl || !itemId || !token) return "";
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    api_key: token,
    DeviceId: "jellystream-web",
    MediaSourceId: itemId,
    VideoCodec: "h264",
    AudioCodec: "aac",
    MaxStreamingBitrate: String(options?.videoBitRate ?? 4000000),
    VideoBitrate: String(options?.videoBitRate ?? 4000000),
    AudioBitrate: String(options?.audioBitRate ?? 128000),
    TranscodingMaxAudioChannels: "2",
    SegmentContainer: "ts",
    MinSegments: "1",
    BreakOnNonKeyFrames: "true",
    TranscodeReasons: "ContainerNotSupported",
  });
  if (options?.maxWidth) {
    params.set("MaxWidth", String(options.maxWidth));
  }
  return `${baseUrl}/Videos/${itemId}/master.m3u8?${params.toString()}`;
}
