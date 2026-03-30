// Helper pour construire les URLs d'images Jellyfin optimisées
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models';

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
  if (!serverUrl || !itemId) return '';
  const baseUrl = serverUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    maxWidth: String(maxWidth),
    quality: String(quality),
  });
  if (tag) {
    params.set('tag', tag);
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

// Construit l'URL de streaming direct pour un item Jellyfin
export function getStreamUrl(
  serverUrl: string,
  itemId: string,
  token: string,
): string {
  if (!serverUrl || !itemId || !token) return '';
  const baseUrl = serverUrl.replace(/\/+$/, '');
  return `${baseUrl}/Videos/${itemId}/stream?static=true&api_key=${encodeURIComponent(token)}`;
}
