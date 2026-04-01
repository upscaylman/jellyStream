import React, { createContext, useCallback, useContext, useState } from "react";
import { Dimensions } from "react-native";
import { GlobalBottomSheet } from "./GlobalBottomSheet";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetOptions {
  /** Contenu à afficher dans le sheet */
  content: React.ReactNode;
  /** Hauteur max (défaut: 60% écran) */
  maxHeight?: number;
  /** Afficher la poignée (défaut: true) */
  showHandle?: boolean;
}

interface BottomSheetContextType {
  /** Ouvrir un bottom sheet avec du contenu */
  openSheet: (options: BottomSheetOptions) => void;
  /** Fermer le bottom sheet actif */
  closeSheet: () => void;
  /** Si un sheet est actuellement ouvert */
  isOpen: boolean;
}

const BottomSheetContext = createContext<BottomSheetContextType>({
  openSheet: () => {},
  closeSheet: () => {},
  isOpen: false,
});

export const useBottomSheet = () => useContext(BottomSheetContext);

export function BottomSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [sheetContent, setSheetContent] = useState<React.ReactNode>(null);
  const [maxHeight, setMaxHeight] = useState(SCREEN_HEIGHT * 0.6);
  const [showHandle, setShowHandle] = useState(true);

  const openSheet = useCallback((options: BottomSheetOptions) => {
    setSheetContent(options.content);
    setMaxHeight(options.maxHeight ?? SCREEN_HEIGHT * 0.6);
    setShowHandle(options.showHandle ?? true);
    setVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <BottomSheetContext.Provider
      value={{ openSheet, closeSheet, isOpen: visible }}
    >
      {children}
      <GlobalBottomSheet
        visible={visible}
        onClose={closeSheet}
        maxHeight={maxHeight}
        showHandle={showHandle}
      >
        {sheetContent}
      </GlobalBottomSheet>
    </BottomSheetContext.Provider>
  );
}
