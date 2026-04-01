import React, { useCallback, useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 100;

interface IGlobalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Hauteur max du sheet (défaut: 60% écran) */
  maxHeight?: number;
  /** Afficher la poignée de drag (défaut: true) */
  showHandle?: boolean;
}

export function GlobalBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = SCREEN_HEIGHT * 0.6,
  showHandle = true,
}: IGlobalBottomSheetProps) {
  const translateY = useSharedValue(maxHeight);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  // Ouvrir / fermer
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(maxHeight, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, maxHeight]);

  const dismissSheet = useCallback(() => {
    onClose();
  }, [onClose]);

  // Geste pan pour drag-to-dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Seulement vers le bas
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(0, newY);
      // Backdrop suit le drag
      backdropOpacity.value = interpolate(
        translateY.value,
        [0, maxHeight],
        [1, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 500) {
        // Dismiss
        translateY.value = withTiming(maxHeight, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(dismissSheet)();
      } else {
        // Snap back
        translateY.value = withSpring(0, {
          damping: 25,
          stiffness: 200,
        });
        backdropOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, { maxHeight }, sheetStyle]}>
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#666",
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
});
