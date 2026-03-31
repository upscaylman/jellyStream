import * as React from 'react';
import {
    View, Text, Pressable, Modal, StyleSheet,
    Animated, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 52;
const VISIBLE_COUNT = 9;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CategoriesListModalProps {
    visible: boolean;
    onClose: () => void;
    items?: { id: string; label: string }[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
}

const categories = [
    'My List',
    'Available for Download',
    'Action',
    'AMC Collection',
    'Anime',
    'Comedies',
    'Crime',
    'Critically Acclaimed',
    'Documentaries',
    'Dramas',
    'Fantasy',
    'Holidays',
    'Horror',
    'Independent',
    'International',
    'Kids & Family',
    'LGBTQ',
    'Music & Musicals',
    'Reality',
    'Romance',
    'Sci-Fi',
    'Sports',
    'Stand-Up',
    'Thrillers',
    'Audio Description in English'
];

function WheelItem({ item, index, scrollY, onPress }: {
    item: { id: string; label: string };
    index: number;
    scrollY: Animated.Value;
    onPress: () => void;
}) {
    const center = ITEM_HEIGHT * index;
    const distance = Animated.subtract(scrollY, center);

    const scale = distance.interpolate({
        inputRange: [-ITEM_HEIGHT * 3, -ITEM_HEIGHT * 2, -ITEM_HEIGHT, 0, ITEM_HEIGHT, ITEM_HEIGHT * 2, ITEM_HEIGHT * 3],
        outputRange: [0.7, 0.78, 0.88, 1.15, 0.88, 0.78, 0.7],
        extrapolate: 'clamp',
    });

    const opacity = distance.interpolate({
        inputRange: [-ITEM_HEIGHT * 3, -ITEM_HEIGHT * 2, -ITEM_HEIGHT, 0, ITEM_HEIGHT, ITEM_HEIGHT * 2, ITEM_HEIGHT * 3],
        outputRange: [0.2, 0.3, 0.5, 1, 0.5, 0.3, 0.2],
        extrapolate: 'clamp',
    });

    return (
        <Pressable onPress={onPress}>
            <Animated.View style={[styles.itemContainer, {
                transform: [{ scale }],
                opacity,
            }]}>
                <Text style={styles.itemText} numberOfLines={1}>{item.label}</Text>
            </Animated.View>
        </Pressable>
    );
}

export function CategoriesListModal({ visible, onClose, items, selectedId, onSelect }: CategoriesListModalProps) {
    const insets = useSafeAreaInsets();
    const scrollRef = React.useRef<Animated.ScrollView>(null);
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const currentIndex = React.useRef(0);
    const lastHapticIndex = React.useRef(-1);

    const displayItems = items ?? categories.map((c) => ({ id: c, label: c }));

    const listHeight = Math.min(ITEM_HEIGHT * VISIBLE_COUNT, SCREEN_HEIGHT * 0.6);
    const padV = (listHeight - ITEM_HEIGHT) / 2;

    const initialIndex = React.useMemo(() => {
        if (!selectedId) return 0;
        const idx = displayItems.findIndex((i) => i.id === selectedId);
        return idx >= 0 ? idx : 0;
    }, [displayItems, selectedId]);

    React.useEffect(() => {
        if (visible) {
            currentIndex.current = initialIndex;
            lastHapticIndex.current = initialIndex;
            scrollY.setValue(initialIndex * ITEM_HEIGHT);
            const timer = setTimeout(() => {
                const node = scrollRef.current as unknown as { scrollTo?: (opts: { y: number; animated: boolean }) => void; getNode?: () => { scrollTo: (opts: { y: number; animated: boolean }) => void } };
                const scrollable = node?.getNode?.() ?? node;
                scrollable?.scrollTo?.({ y: initialIndex * ITEM_HEIGHT, animated: false });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [visible, initialIndex, scrollY]);

    React.useEffect(() => {
        const id = scrollY.addListener(({ value }) => {
            const idx = Math.round(value / ITEM_HEIGHT);
            const clamped = Math.max(0, Math.min(idx, displayItems.length - 1));
            currentIndex.current = clamped;
            if (clamped !== lastHapticIndex.current) {
                lastHapticIndex.current = clamped;
                Haptics.selectionAsync();
            }
        });
        return () => scrollY.removeListener(id);
    }, [scrollY, displayItems.length]);

    const handleItemPress = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSelect && displayItems[index]) {
            onSelect(displayItems[index].id);
        }
        onClose();
    };

    const handleClose = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const idx = currentIndex.current;
        if (onSelect && displayItems[idx]) {
            onSelect(displayItems[idx].id);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={96} tint="dark" style={StyleSheet.absoluteFill}>
                    <View style={styles.centerContainer}>
                        <View style={[styles.listWrapper, { height: listHeight }]}>
                            <Animated.ScrollView
                                ref={scrollRef}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                bounces={true}
                                overScrollMode="always"
                                scrollEventThrottle={16}
                                onScroll={Animated.event(
                                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                    { useNativeDriver: true },
                                )}
                                contentContainerStyle={{
                                    paddingTop: padV,
                                    paddingBottom: padV,
                                }}
                            >
                                {displayItems.map((item, index) => (
                                    <WheelItem
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        scrollY={scrollY}
                                        onPress={() => handleItemPress(index)}
                                    />
                                ))}
                            </Animated.ScrollView>
                        </View>
                    </View>

                    <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
                        <Pressable
                            style={styles.closeButton}
                            onPress={handleClose}
                        >
                            <Ionicons name="close" size={26} color="#000" />
                        </Pressable>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listWrapper: {
        width: '100%',
        overflow: 'hidden',
    },
    itemContainer: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingVertical: 20,
        zIndex: 1000,
    },
    closeButton: {
        width: 50,
        height: 50,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
}); 