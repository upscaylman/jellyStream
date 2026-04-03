import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.35, 160);

interface Props {
  onFinished: () => void;
}

export function SplashAnimation({ onFinished }: Props) {
  // Logo : scale + opacité
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);

  // Nom de l'app : opacité
  const titleOpacity = useSharedValue(0);

  // Conteneur global : opacité pour le fade-out final
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Logo entre
    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 100 });

    // 2. Le nom apparaît après 500ms
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // 3. Pause puis fade-out global — callback vers onFinished
    containerOpacity.value = withDelay(
      1800,
      withSequence(
        withTiming(0, { duration: 400 }, (finished) => {
          if (finished) runOnJS(onFinished)();
        }),
      ),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={logoStyle}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.title, titleStyle]}>
          JellyStream
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "700",
    color: "#E50914",
    letterSpacing: 2,
  },
});
