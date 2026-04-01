// Hook Google Cast Web SDK — détecte et contrôle les appareils Chromecast
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/** Appareil Cast détecté */
export interface CastDevice {
  id: string;
  name: string;
  type: "chromecast";
}

/** État global Cast */
interface GoogleCastState {
  available: boolean;
  devices: CastDevice[];
  connectedDevice: CastDevice | null;
  isConnecting: boolean;
}

// Typage minimal du Cast SDK (pas de @types disponible)
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => CastContextInstance;
        };
        CastSession: new () => CastSessionObj;
        SessionState: Record<string, string>;
        RemotePlayerEventType: Record<string, string>;
        RemotePlayer: new () => unknown;
        RemotePlayerController: new (player: unknown) => unknown;
      };
    };
    chrome?: {
      cast: {
        AutoJoinPolicy: Record<string, string>;
        isAvailable: boolean;
        media: {
          MediaInfo: new (
            contentId: string,
            contentType: string,
          ) => MediaInfoObj;
          LoadRequest: new (mediaInfo: MediaInfoObj) => LoadRequestObj;
        };
      };
    };
  }
}

interface CastContextInstance {
  setOptions: (opts: Record<string, unknown>) => void;
  requestSession: () => Promise<unknown>;
  getCurrentSession: () => CastSessionObj | null;
  addEventListener: (
    type: string,
    handler: (e: CastStateEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    handler: (e: CastStateEvent) => void,
  ) => void;
  getCastState: () => string;
}

interface CastSessionObj {
  getSessionId: () => string;
  getCastDevice: () => { friendlyName: string; deviceId?: string };
  loadMedia: (req: LoadRequestObj) => Promise<unknown>;
  endSession: (stopCasting: boolean) => void;
}

interface CastStateEvent {
  castState: string;
}

interface MediaInfoObj {
  contentId: string;
  contentType: string;
  metadata?: unknown;
}

interface LoadRequestObj {
  autoplay: boolean;
  currentTime: number;
}

// ID de l'application Default Media Receiver de Google
const DEFAULT_APP_ID = "CC1AD845";

/**
 * Hook qui gère la connexion Google Cast sur web.
 * Sur native, retourne un état vide (pas de support Cast SDK natif pour l'instant).
 */
export function useGoogleCast(): GoogleCastState & {
  requestSession: () => Promise<void>;
  castMedia: (url: string, contentType?: string) => Promise<void>;
  disconnect: () => void;
} {
  const [state, setState] = useState<GoogleCastState>({
    available: false,
    devices: [],
    connectedDevice: null,
    isConnecting: false,
  });

  const contextRef = useRef<CastContextInstance | null>(null);

  // Initialise le Cast SDK quand il est prêt
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const initCast = (isAvailable: boolean) => {
      if (!isAvailable || !window.cast?.framework) return;

      const context = window.cast.framework.CastContext.getInstance();
      context.setOptions({
        receiverApplicationId: DEFAULT_APP_ID,
        autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED,
      });

      contextRef.current = context;
      setState((prev) => ({ ...prev, available: true }));

      // Écouter les changements d'état de session
      const handleStateChange = () => {
        const session = context.getCurrentSession();
        if (session) {
          const device = session.getCastDevice();
          setState((prev) => ({
            ...prev,
            connectedDevice: {
              id: device.deviceId ?? session.getSessionId(),
              name: device.friendlyName,
              type: "chromecast",
            },
            isConnecting: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            connectedDevice: null,
            isConnecting: false,
          }));
        }
      };

      context.addEventListener("SESSION_STATE_CHANGED", handleStateChange);

      // Vérifier s'il y a déjà une session active
      handleStateChange();

      return () => {
        context.removeEventListener("SESSION_STATE_CHANGED", handleStateChange);
      };
    };

    // Si le SDK est déjà chargé
    if (window.chrome?.cast?.isAvailable && window.cast?.framework) {
      initCast(true);
    } else {
      // Callback appelé par le SDK quand il est prêt
      window.__onGCastApiAvailable = initCast;
    }
  }, []);

  const requestSession = useCallback(async () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    setState((prev) => ({ ...prev, isConnecting: true }));
    try {
      await ctx.requestSession();
    } catch {
      setState((prev) => ({ ...prev, isConnecting: false }));
    }
  }, []);

  const castMedia = useCallback(
    async (url: string, contentType = "video/mp4") => {
      const ctx = contextRef.current;
      if (!ctx || !window.chrome?.cast) return;
      const session = ctx.getCurrentSession();
      if (!session) return;

      const mediaInfo = new window.chrome.cast.media.MediaInfo(
        url,
        contentType,
      );
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      request.currentTime = 0;

      await session.loadMedia(request);
    },
    [],
  );

  const disconnect = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    const session = ctx.getCurrentSession();
    session?.endSession(true);
  }, []);

  return { ...state, requestSession, castMedia, disconnect };
}
