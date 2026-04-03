import { BottomSheetProvider } from "@/components/BottomSheet/BottomSheetContext";
import { OverlayProvider } from "@/components/Overlay/OverlayProvider";
import { SplashAnimation } from "@/components/SplashAnimation";
import { RootScaleProvider, useRootScale } from "@/contexts/RootScaleContext";
import useCachedResources from "@/hooks/useCachedResources";
import { useVisionOS } from "@/hooks/useVisionOS";
import { JellyQueryProvider } from "@/src/api/queryProvider";
import { useAuthStore } from "@/src/stores/authStore";
import { useNotificationStore } from "@/src/stores/notificationStore";
import { usePreferencesStore } from "@/src/stores/preferencesStore";
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
    useNotificationStore.getState().restore();
    usePreferencesStore.getState().restore();
    setIsRestoring(false);
  }, []);

  // Rediriger selon l'état d'auth
  // - Pas auth → écran login
  // - Login (false→true) → sélection profil
  // - Session restaurée + première ouverture → sélection profil
  // - Simple refresh (sessionStorage a le flag) → ne rien faire
  const prevAuth = useRef<boolean | null>(null);
  useEffect(() => {
    if (isRestoring) return;
    const wasAuthenticated = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (!isAuthenticated) {
      try {
        sessionStorage.removeItem("profileSelected");
      } catch {
        /* native */
      }
      requestAnimationFrame(() => router.replace("/(auth)/server-select"));
    } else if (wasAuthenticated === false) {
      // Login : était déconnecté, maintenant connecté → sélection profil
      requestAnimationFrame(() => router.replace("/(auth)/profile-select"));
    } else if (wasAuthenticated === null) {
      // Session restaurée au démarrage — vérifier si c'est un refresh ou un cold start
      let alreadySelected = false;
      try {
        alreadySelected = sessionStorage.getItem("profileSelected") === "1";
      } catch {
        /* native : pas de sessionStorage → toujours montrer profile-select */
      }
      if (!alreadySelected) {
        requestAnimationFrame(() => router.replace("/(auth)/profile-select"));
      }
    }
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
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: "#000" },
            }}
          />
          <Stack.Screen
            name="switch-profile"
            options={{
              headerShown: false,
              animation: "fade",
              contentStyle: {
                backgroundColor: "#232323",
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
            name="notifications"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#000",
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
            name="settings"
            options={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#232323",
              },
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </Animated.View>
    </View>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isLoaded = useCachedResources();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoaded]);

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
              <BottomSheetProvider>
                <AnimatedStack />
                {!splashDone && (
                  <SplashAnimation onFinished={() => setSplashDone(true)} />
                )}
              </BottomSheetProvider>
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
