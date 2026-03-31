import { OverlayProvider } from "@/components/Overlay/OverlayProvider";
import { RootScaleProvider, useRootScale } from "@/contexts/RootScaleContext";
import useCachedResources from "@/hooks/useCachedResources";
import { useVisionOS } from "@/hooks/useVisionOS";
import { JellyQueryProvider } from "@/src/api/queryProvider";
import { useAuthStore } from "@/src/stores/authStore";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

function AnimatedStack() {
  const { scale } = useRootScale();
  const router = useRouter();
  const [isModalActive, setIsModalActive] = useState(false);
  const [canBlur, setCanBlur] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const colorScheme = useColorScheme();
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        {
          translateY: (1 - scale.value) * -150,
        },
      ],
    };
  });
  const { isVisionOS } = useVisionOS();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Restaurer la session au montage (synchrone, une seule fois)
  useEffect(() => {
    restoreSession();
    setIsRestoring(false);
  }, []);

  // Rediriger selon l'état d'auth
  // - Pas auth → écran login
  // - Vient de se connecter (false→true) → /(tabs)
  // - Déjà auth au démarrage → ne rien faire (route par défaut = tabs)
  const prevAuth = useRef<boolean | null>(null);
  useEffect(() => {
    if (isRestoring) return;
    const wasAuthenticated = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (!isAuthenticated) {
      router.replace("/(auth)/server-select");
    } else if (wasAuthenticated === false) {
      // Login : était déconnecté, maintenant connecté
      router.replace("/(tabs)");
    }
    // wasAuthenticated === null (premier rendu, déjà auth) → on ne fait rien
  }, [isRestoring, isAuthenticated]);

  // Écran de chargement pendant la restauration de session
  if (isRestoring) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar style="light" />
      </View>
    );
  }

  // UN SEUL arbre Stack — toujours le même, jamais démonté
  return (
    <View
      style={[
        styles.container,
        isVisionOS && { backgroundColor: "transparent" },
      ]}
    >
      {isModalActive && canBlur && (
        <BlurView
          intensity={50}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          tint={colorScheme === "dark" ? "dark" : "light"}
        />
      )}
      <Animated.View
        style={[styles.stackContainer, animatedStyle, { zIndex: 1 }]}
      >
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="switch-profile"
            options={{
              presentation: "transparentModal",
              headerShown: false,
              contentStyle: {
                backgroundColor: "transparent",
              },
            }}
            listeners={{
              focus: () => {
                setIsModalActive(true);
                setCanBlur(false);
              },
              beforeRemove: () => {
                setIsModalActive(false);
                setCanBlur(false);
              },
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "transparent",
              },
            }}
          />
          <Stack.Screen
            name="downloads"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "transparent",
              },
            }}
          />
          <Stack.Screen
            name="player"
            options={{
              headerShown: false,
              animation: "fade",
              contentStyle: {
                backgroundColor: "#000",
              },
            }}
          />
          <Stack.Screen
            name="my-list"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#141414",
              },
            }}
          />
          <Stack.Screen
            name="films"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#141414",
              },
            }}
          />
          <Stack.Screen
            name="series-list"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#141414",
              },
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </Animated.View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isLoaded = useCachedResources();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <JellyQueryProvider>
      <GestureHandlerRootView style={styles.container}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <RootScaleProvider>
            <OverlayProvider>
              <AnimatedStack />
            </OverlayProvider>
          </RootScaleProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </JellyQueryProvider>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  stackContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 5,
  },
});
