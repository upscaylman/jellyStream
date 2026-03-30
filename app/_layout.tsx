import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack, useRouter, useSegments} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect, useState} from 'react';
import {StyleSheet, useColorScheme, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {RootScaleProvider} from '@/contexts/RootScaleContext';
import {useRootScale} from '@/contexts/RootScaleContext';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {OverlayProvider} from '@/components/Overlay/OverlayProvider';
import {BlurView} from 'expo-blur';
import useCachedResources from '@/hooks/useCachedResources';
import { useVisionOS } from '@/hooks/useVisionOS';
import { JellyQueryProvider } from '@/src/api/queryProvider';
import { useAuthStore } from '@/src/stores/authStore';

function AnimatedStack() {
    const {scale} = useRootScale();
    const router = useRouter();
    const segments = useSegments();
    const [isModalActive, setIsModalActive] = useState(false);
    const [canBlur, setCanBlur] = useState(false);
    const [isRestoring, setIsRestoring] = useState(true);
    const colorScheme = useColorScheme();
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {scale: scale.value},
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

    // Rediriger selon l'état d'auth — SANS changer l'arbre de composants
    useEffect(() => {
        if (isRestoring) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/server-select');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [isRestoring, isAuthenticated, segments]);

    // Écran de chargement pendant la restauration de session
    if (isRestoring) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar style="light" />
            </View>
        );
    }

    // UN SEUL arbre Stack — toujours le même, jamais démonté
    return (
        <View style={[
            styles.container,
            isVisionOS && { backgroundColor: 'transparent' }
        ]}>
            {(isModalActive && canBlur) && (
                <BlurView
                    intensity={50}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                    tint={colorScheme === 'dark' ? 'dark' : 'light'}
                />
            )}
            <Animated.View style={[styles.stackContainer, animatedStyle, { zIndex: 1 }]}>
                <Stack>
                    <Stack.Screen name="(auth)" options={{headerShown: false}}/>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen
                        name="switch-profile"
                        options={{
                            presentation: 'transparentModal',
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
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
                                backgroundColor: 'transparent',
                            },
                        }}
                    />
                    <Stack.Screen
                        name="downloads"
                        options={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                        }}
                    />
                    <Stack.Screen
                        name="player"
                        options={{
                            headerShown: false,
                            animation: 'fade',
                            contentStyle: {
                                backgroundColor: '#000',
                            },
                        }}
                    />
                    <Stack.Screen name="+not-found"/>
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
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <RootScaleProvider>
                        <OverlayProvider>
                            <AnimatedStack/>
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
        backgroundColor: '#000',
    },
    stackContainer: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 5,
    },
});

