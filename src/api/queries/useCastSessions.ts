// Hook Jellyfin Sessions — casting vers d'autres appareils
import { useAuthStore } from '@/src/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import type { SessionInfoDto } from '@jellyfin/sdk/lib/generated-client/models/session-info-dto';
import { PlayCommand } from '@jellyfin/sdk/lib/generated-client/models/play-command';
import { PlaystateCommand } from '@jellyfin/sdk/lib/generated-client/models/playstate-command';
import { jellyfin } from '@/src/api/client';

/**
 * Récupère les sessions contrôlables par l'utilisateur courant
 * (appareils sur lesquels on peut envoyer la lecture)
 */
export function useCastSessions() {
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);

  return useQuery<SessionInfoDto[]>({
    queryKey: ['jellyfin', 'sessions', userId],
    queryFn: async () => {
      if (!api || !userId) return [];
      const sessionApi = getSessionApi(api);
      const { data } = await sessionApi.getSessions({
        controllableByUserId: userId,
        activeWithinSeconds: 960,
      });
      // Exclure l'appareil courant
      const currentDeviceId = jellyfin.deviceInfo.id;
      return data.filter(
        (s) => s.SupportsMediaControl && s.DeviceId !== currentDeviceId,
      );
    },
    enabled: !!api && !!userId,
    refetchInterval: 10_000, // Rafraîchir toutes les 10s
    staleTime: 5_000,
  });
}

/**
 * Envoie la lecture d'un item sur une session distante
 */
export async function castToSession(
  api: NonNullable<ReturnType<typeof useAuthStore.getState>['api']>,
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
  api: NonNullable<ReturnType<typeof useAuthStore.getState>['api']>,
  sessionId: string,
  command: PlaystateCommand,
) {
  const sessionApi = getSessionApi(api);
  await sessionApi.sendPlaystateCommand({
    sessionId,
    command,
  });
}
