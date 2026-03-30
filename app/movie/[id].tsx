import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Dimensions, useColorScheme, View, ActivityIndicator, Text, Pressable } from 'react-native';
import { useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';
import { ExpandedPlayer } from '@/components/BottomSheet/ExpandedPlayer';
import { useRootScale } from '@/contexts/RootScaleContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useItemDetail } from '@/src/api/queries/useMediaQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { getImageUrl, getBackdropUrl } from '@/src/utils/imageUrl';

const SCALE_FACTOR = 0.83;
const DRAG_THRESHOLD = Math.min(Dimensions.get('window').height * 0.20, 150);
const HORIZONTAL_DRAG_THRESHOLD = Math.min(Dimensions.get('window').width * 0.51, 80);
const DIRECTION_LOCK_ANGLE = 45; // Angle in degrees to determine horizontal vs vertical movement
const ENABLE_HORIZONTAL_DRAG_CLOSE = true;

export default function MovieScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { setScale } = useRootScale();
    const translateY = useSharedValue(0);
    const isClosing = useRef(false);
    const statusBarStyle = useSharedValue<'light' | 'dark'>('light');
    const scrollOffset = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const translateX = useSharedValue(0);
    const initialGestureX = useSharedValue(0);
    const initialGestureY = useSharedValue(0);
    const isHorizontalGesture = useSharedValue(false);
    const isScrolling = useSharedValue(false);
    const colorScheme = useColorScheme();
    const blurIntensity = useSharedValue(20);

    const itemId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
    const serverUrl = useAuthStore((s) => s.serverUrl) ?? '';
    const { data: item, isLoading, isError } = useItemDetail(itemId);

    const handleHapticFeedback = useCallback(() => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
            console.log('Haptics not available:', error);
        }
    }, []);

    const goBack = useCallback(() => {
        if (!isClosing.current) {
            isClosing.current = true;
            handleHapticFeedback();
            requestAnimationFrame(() => {
                router.back();
            });
        }
    }, [router, handleHapticFeedback]);

    const handleScale = useCallback((newScale: number) => {
        try {
            setScale(newScale);
        } catch (error) {
            console.log('Scale error:', error);
        }
    }, [setScale]);

    const calculateGestureAngle = (x: number, y: number) => {
        'worklet';
        const angle = Math.abs(Math.atan2(y, x) * (180 / Math.PI));
        return angle;
    };

    const panGesture = Gesture.Pan()
        .onStart((event) => {
            'worklet';
            initialGestureX.value = event.x;
            initialGestureY.value = event.y;
            isHorizontalGesture.value = false;

            if (scrollOffset.value <= 0) {
                isDragging.value = true;
            }
        })
        .onUpdate((event) => {
            'worklet';
            const dx = event.translationX;
            const dy = event.translationY;
            const angle = calculateGestureAngle(dx, dy);

            if (ENABLE_HORIZONTAL_DRAG_CLOSE && !isHorizontalGesture.value && !isScrolling.value) {
                if (Math.abs(dx) > 10) {
                    if (angle < DIRECTION_LOCK_ANGLE) {
                        isHorizontalGesture.value = true;
                    }
                }
            }

            if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
                translateX.value = dx;
                translateY.value = dy;
                blurIntensity.value = Math.max(0, 20 - (Math.abs(dx) / 10));

                if (Math.abs(dx) / 300 > 0.2) {
                    statusBarStyle.value = 'dark';
                } else {
                    statusBarStyle.value = 'light';
                }
            }
            else if (scrollOffset.value <= 0 && isDragging.value) {
                translateY.value = Math.max(0, dy);
                blurIntensity.value = Math.max(0, 20 - (dy / 20));

                if (dy / 600 > 0.5) {
                    statusBarStyle.value = 'dark';
                } else {
                    statusBarStyle.value = 'light';
                }
            }
        })
        .onEnd((event) => {
            'worklet';
            isDragging.value = false;

            if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
                const dx = event.translationX;
                const dy = event.translationY;
                const totalDistance = Math.sqrt(dx * dx + dy * dy);
                const shouldClose = totalDistance > HORIZONTAL_DRAG_THRESHOLD;

                if (shouldClose) {
                    const exitX = dx * 2;
                    const exitY = dy * 2;

                    translateX.value = withTiming(exitX, { duration: 300 });
                    translateY.value = withTiming(exitY, { duration: 300 });

                    runOnJS(handleScale)(1);
                    runOnJS(handleHapticFeedback)();
                    runOnJS(goBack)();
                } else {
                    translateX.value = withSpring(0, {
                        damping: 15,
                        stiffness: 150,
                    });
                    translateY.value = withSpring(0, {
                        damping: 15,
                        stiffness: 150,
                    });
                    runOnJS(handleScale)(SCALE_FACTOR);
                }
            }
            else if (scrollOffset.value <= 0) {
                const shouldClose = event.translationY > DRAG_THRESHOLD;

                if (shouldClose) {
                    translateY.value = withTiming(event.translationY + 100, {
                        duration: 300,
                    });
                    runOnJS(handleScale)(1);
                    runOnJS(handleHapticFeedback)();
                    runOnJS(goBack)();
                } else {
                    translateY.value = withSpring(0, {
                        damping: 15,
                        stiffness: 150,
                    });
                    runOnJS(handleScale)(SCALE_FACTOR);
                }
            }
        })
        .onFinalize(() => {
            'worklet';
            isDragging.value = false;
            isHorizontalGesture.value = false;
        });

    const scrollGesture = Gesture.Native()
        .onBegin(() => {
            'worklet';
            isScrolling.value = true;
            if (!isDragging.value) {
                translateY.value = 0;
            }
        })
        .onEnd(() => {
            'worklet';
            isScrolling.value = false;
        });

    const composedGestures = Gesture.Simultaneous(panGesture, scrollGesture);

    const ScrollComponent = useCallback((props: any) => {
        return (
            <GestureDetector gesture={composedGestures}>
                <Animated.ScrollView
                    {...props}
                    onScroll={(event) => {
                        'worklet';
                        scrollOffset.value = event.nativeEvent.contentOffset.y;
                        if (!isDragging.value && translateY.value !== 0) {
                            translateY.value = 0;
                        }
                        props.onScroll?.(event);
                    }}
                    scrollEventThrottle={16}
                    // bounces={scrollOffset.value >= 0 && !isDragging.value}
                    bounces={false}


                />
            </GestureDetector>
        );
    }, [composedGestures]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value }
        ],
        opacity: withSpring(1),
    }));

    const blurStyle = useAnimatedStyle(() => ({
        intensity: blurIntensity.value,
    }));

    useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                setScale(SCALE_FACTOR);
            } catch (error) {
                console.log('Initial scale error:', error);
            }
        }, 0);

        return () => {
            clearTimeout(timeout);
            try {
                setScale(1);
            } catch (error) {
                console.log('Cleanup scale error:', error);
            }
        };
    }, []);

    // Construire l'URL d'image depuis les données Jellyfin
    const imageUrl = item?.ImageTags?.['Primary']
        ? getImageUrl({ serverUrl, itemId: item.Id ?? '', maxWidth: 800, quality: 90, tag: item.ImageTags['Primary'] })
        : '';

    // Extraire cast et réalisateur depuis People
    const castNames = (item?.People ?? [])
        .filter((p) => p.Type === 'Actor')
        .slice(0, 5)
        .map((p) => p.Name ?? '');
    const director = (item?.People ?? [])
        .find((p) => p.Type === 'Director')?.Name ?? '';

    // Durée formatée
    const durationStr = item?.RunTimeTicks
        ? (() => {
            const totalMin = Math.round(item.RunTimeTicks / 600000000);
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        })()
        : '';

    if (isLoading) {
        return (
            <ThemedView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#E50914" />
                </View>
            </ThemedView>
        );
    }

    if (isError || !item) {
        return (
            <ThemedView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
                        Impossible de charger ce contenu
                    </Text>
                    <Pressable
                        onPress={() => router.back()}
                        style={{ backgroundColor: '#E50914', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 4 }}
                    >
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Retour</Text>
                    </Pressable>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <StatusBar animated={true} style={statusBarStyle.value} />
            <Animated.View style={[styles.modalContent, animatedStyle]}>
                <ExpandedPlayer
                    scrollComponent={ScrollComponent}
                    movie={{
                        id: item.Id ?? '',
                        title: item.Name ?? '',
                        imageUrl,
                        year: item.ProductionYear?.toString() ?? '',
                        duration: durationStr,
                        rating: item.OfficialRating ?? '',
                        description: item.Overview ?? '',
                        cast: castNames.length > 0 ? castNames : undefined,
                        director: director || undefined,
                    }}
                />
            </Animated.View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    modalContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
