// Hook Jellyfin Sessions — casting vers d'autres appareils
import { jellyfin } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import { PlayCommand } from "@jellyfin/sdk/lib/generated-client/models/play-command";
import { PlaystateCommand } from "@jellyfin/sdk/lib/generated-client/models/playstate-command";
import type { SessionInfoDto } from "@jellyfin/sdk/lib/generated-client/models/session-info-dto";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { useQuery } from "@tanstack/react-query";

/**
 * Récupère les sessions contrôlables par l'utilisateur courant
 * (appareils sur lesquels on peut envoyer la lecture)
 */
export function useCastSessions() {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);

  return useQuery<SessionInfoDto[]>({
    queryKey: ["jellyfin", "sessions", userId],
    queryFn: async () => {
      if (!api || !userId) return [];
      const sessionApi = getSessionApi(api);
      const currentDeviceId = jellyfin.deviceInfo.id;

      // Stratégie 1 : sessions contrôlables par l'utilisateur
      const { data: controllable } = await sessionApi.getSessions({
        controllableByUserId: userId,
        activeWithinSeconds: 960,
      });

      // Stratégie 2 : toutes les sessions actives (fallback)
      const { data: allSessions } = await sessionApi.getSessions({
        activeWithinSeconds: 960,
      });

      // Fusionner et dédupliquer par Id
      const seen = new Set<string>();
      const merged: SessionInfoDto[] = [];
      for (const s of [...controllable, ...allSessions]) {
        if (!s.Id || seen.has(s.Id)) continue;
        seen.add(s.Id);
        // Exclure l'appareil courant
        if (s.DeviceId === currentDeviceId) continue;
        merged.push(s);
      }

      return merged;
    },
    enabled: !!api && !!userId,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/**
 * Envoie la lecture d'un item sur une session distante
 */
export async function castToSession(
  api: NonNullable<ReturnType<typeof useAuthStore.getState>["api"]>,
  sessionId: string,
  itemId: string,
  startPositionTicks = 0,
) {
  const sessionApi = getSessionApi(api);
  await sessionApi.play({
    sessionId,
    playCommand: PlayCommand.PlayNow,
    itemIds: [itemId],
    startPositionTicks,
  });
}

/**
 * Envoie une commande de transport (pause, stop, etc.) à une session
 */
export async function sendPlaystateToSession(
  api: NonNullable<ReturnType<typeof useAuthStore.getState>["api"]>,
  sessionId: string,
  command: PlaystateCommand,
) {
  const sessionApi = getSessionApi(api);
  await sessionApi.sendPlaystateCommand({
    sessionId,
    command,
  });
}
