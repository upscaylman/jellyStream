// Rapporte la progression de lecture à Jellyfin (start, progress toutes les 10s, stop)
// Permet à Jellyfin de populer "Reprendre la lecture" et de mettre à jour les boutons Play/Reprendre
import { useAuthStore } from "@/src/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

const PROGRESS_INTERVAL_MS = 10_000;

interface PlaybackReportingOptions {
  itemId: string;
  mediaSourceId?: string;
  playSessionId?: string;
  isPaused?: boolean;
}

export function usePlaybackReporting({
  itemId,
  mediaSourceId,
  playSessionId,
  isPaused,
}: PlaybackReportingOptions) {
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionTicksRef = useRef(0);

  // Refs pour les valeurs dynamiques (évite les closures périmées)
  const itemIdRef = useRef(itemId);
  const mediaSourceIdRef = useRef(mediaSourceId);
  const playSessionIdRef = useRef(playSessionId);
  const isPausedRef = useRef(isPaused);
  const baseUrlRef = useRef((serverUrl ?? "").replace(/\/+$/, ""));
  const tokenRef = useRef(token);
  const userIdRef = useRef(userId);

  itemIdRef.current = itemId;
  mediaSourceIdRef.current = mediaSourceId;
  playSessionIdRef.current = playSessionId;
  isPausedRef.current = isPaused;
  baseUrlRef.current = (serverUrl ?? "").replace(/\/+$/, "");
  tokenRef.current = token;
  userIdRef.current = userId;

  const getHeaders = () =>
    tokenRef.current
      ? {
          Authorization: `MediaBrowser Token="${tokenRef.current}"`,
          "Content-Type": "application/json",
        }
      : undefined;

  const reportStart = useCallback(async () => {
    const base = baseUrlRef.current;
    const id = itemIdRef.current;
    if (!base || !tokenRef.current || !id || startedRef.current) return;
    startedRef.current = true;
    const body = {
      ItemId: id,
      MediaSourceId: mediaSourceIdRef.current,
      PlaySessionId: playSessionIdRef.current,
      CanSeek: true,
      PlayMethod: "Transcode",
      PositionTicks: 0,
    };
    console.log("[PlaybackReporting] START", body);
    try {
      const resp = await fetch(`${base}/Sessions/Playing`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      console.log("[PlaybackReporting] START response:", resp.status);
    } catch (e) {
      console.warn("[PlaybackReporting] START error:", e);
    }
  }, []);

  const reportProgress = useCallback(async () => {
    const base = baseUrlRef.current;
    const id = itemIdRef.current;
    if (!base || !tokenRef.current || !id) return;
    const body = {
      ItemId: id,
      MediaSourceId: mediaSourceIdRef.current,
      PlaySessionId: playSessionIdRef.current,
      PositionTicks: Math.round(positionTicksRef.current),
      IsPaused: isPausedRef.current ?? false,
      CanSeek: true,
      PlayMethod: "Transcode",
    };
    console.log(
      "[PlaybackReporting] PROGRESS",
      body.PositionTicks,
      "ticks, paused:",
      body.IsPaused,
    );
    try {
      const resp = await fetch(`${base}/Sessions/Playing/Progress`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!resp.ok)
        console.warn("[PlaybackReporting] PROGRESS response:", resp.status);
    } catch (e) {
      console.warn("[PlaybackReporting] PROGRESS error:", e);
    }
  }, []);

  const reportStop = useCallback(async () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const base = baseUrlRef.current;
    const id = itemIdRef.current;
    if (!base || !tokenRef.current || !id) return;
    const body = {
      ItemId: id,
      MediaSourceId: mediaSourceIdRef.current,
      PlaySessionId: playSessionIdRef.current,
      PositionTicks: Math.round(positionTicksRef.current),
    };
    console.log("[PlaybackReporting] STOP", body);
    try {
      const resp = await fetch(`${base}/Sessions/Playing/Stopped`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      console.log("[PlaybackReporting] STOP response:", resp.status);
    } catch (e) {
      console.warn("[PlaybackReporting] STOP error:", e);
    }

    // Vérifier que Jellyfin a bien sauvegardé la progression
    try {
      const checkResp = await fetch(
        `${base}/Users/${userIdRef.current}/Items/${id}`,
        {
          headers: {
            Authorization: `MediaBrowser Token="${tokenRef.current}"`,
          },
        },
      );
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        console.log("[PlaybackReporting] VERIFY UserData:", {
          PlaybackPositionTicks: checkData.UserData?.PlaybackPositionTicks,
          Played: checkData.UserData?.Played,
          PlayedPercentage: checkData.UserData?.PlayedPercentage,
        });
      }
    } catch {}

    // Invalider les queries APRÈS confirmation du STOP
    queryClient.invalidateQueries({ queryKey: ["resume"] });
    queryClient.invalidateQueries({ queryKey: ["item", id] });
  }, [queryClient]);

  // Mettre à jour la position courante (appelé par le player)
  const updatePosition = useCallback((currentTimeSec: number) => {
    positionTicksRef.current = currentTimeSec * 10_000_000;
  }, []);

  // Attendre que playSessionId soit disponible (async via TanStack Query)
  // puis démarrer le reporting
  useEffect(() => {
    if (!itemId || !baseUrlRef.current || !tokenRef.current || !playSessionId) {
      return;
    }

    stoppedRef.current = false;
    console.log(
      "[PlaybackReporting] Init — itemId:",
      itemId,
      "playSessionId:",
      playSessionId,
    );
    reportStart();

    intervalRef.current = setInterval(() => {
      reportProgress();
    }, PROGRESS_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      reportStop();
      startedRef.current = false;
    };
  }, [itemId, playSessionId]);

  return { updatePosition, reportStop };
}
