import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { CastSheet } from "@/components/BottomSheet/CastSheet";
import type { SessionInfoDto } from "@jellyfin/sdk/lib/generated-client/models/session-info-dto";
import React, { useCallback } from "react";

/**
 * Hook pour ouvrir le bottom sheet Cast depuis n'importe quel écran.
 * Retourne une fonction openCast() à appeler onPress du bouton Cast.
 */
export function useCastSheet(
  onSelect?: (session: SessionInfoDto) => void,
) {
  const { openSheet } = useBottomSheet();

  const openCast = useCallback(() => {
    openSheet({
      content: <CastSheet onSelect={onSelect} />,
      maxHeight: 400,
    });
  }, [openSheet, onSelect]);

  return openCast;
}
