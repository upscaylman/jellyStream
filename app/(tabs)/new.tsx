import React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { newStyles } from '@/styles/new';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';
import { usePathname } from 'expo-router';
import { useRef, useState } from 'react';
import { useScrollToTop } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
} from 'react-native-reanimated';
import { useNewlyAdded, useTrending } from '@/src/api/queries/useMediaQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { getImageUrl, getBackdropUrl } from '@/src/utils/imageUrl';
import { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Platform } from 'react-native';

// Extraire l'ID YouTube d'une URL
function extractYouTubeId(url?: string): string | null {
    if (!url) return null;
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match?.[1] ?? null;
}

const TAB_OPTIONS = [
    { id: 'newly-added', label: 'Nouveautés', icon: 'time-outline' as const },
    { id: 'trending', label: 'Tendances', icon: 'trending-up-outline' as const },
];

export default function NewScreen() {
    const pathname = usePathname();
    const isActive = pathname === '/new';
    const currentTabIndex = TAB_SCREENS.findIndex(screen => screen.name === 'new');
    const activeTabIndex = TAB_SCREENS.findIndex(screen =>
        pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
    );
    const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

    const router = useRouter();
    const scrollY = useSharedValue(0);
    const [activeTab, setActiveTab] = useState('newly-added');
    const serverUrl = useAuthStore((s) => s.serverUrl) ?? '';

    const { data: newlyAdded, isLoading: isLoadingNew } = useNewlyAdded(30);
    const { data: trending, isLoading: isLoadingTrending } = useTrending(30);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const scrollViewRef = useRef(null);
    useScrollToTop(scrollViewRef);

    const displayItems = activeTab === 'newly-added' ? newlyAdded : trending;
    const isLoading = activeTab === 'newly-added' ? isLoadingNew : isLoadingTrending;

    const getItemBackdrop = (item: BaseItemDto) => {
        const backdropTag = item.BackdropImageTags?.[0];
        if (backdropTag) {
            return getBackdropUrl(serverUrl, item.Id ?? '', 800, 80, backdropTag);
        }
        const primaryTag = item.ImageTags?.['Primary'];
        if (primaryTag) {
            return getImageUrl({ serverUrl, itemId: item.Id ?? '', maxWidth: 800, quality: 80, tag: primaryTag });
        }
        // Fallback sans tag — Jellyfin peut quand même servir l'image s'il en existe une
        if (item.Id) {
            return getBackdropUrl(serverUrl, item.Id, 800, 80);
        }
        return '';
    };

    const renderItem = (item: BaseItemDto) => {
        const imageUri = getItemBackdrop(item);
        const year = item.PremiereDate
            ? new Date(item.PremiereDate).getFullYear().toString()
            : item.ProductionYear?.toString() ?? '';
        const genres = item.Genres?.slice(0, 3).join(' • ') ?? '';

        return (
            <Pressable
                key={item.Id}
                style={newStyles.comingSoonItem}
                onPress={() => router.push(`/movie/${item.Id}`)}
            >
                <View style={newStyles.contentContainer}>
                    <View style={newStyles.previewCard}>
                        {item.OfficialRating && (
                            <View style={newStyles.ratedContainer}>
                                <Text style={newStyles.rated}>{item.OfficialRating}</Text>
                            </View>
                        )}
                        {(() => {
                            const ytId = extractYouTubeId(item.RemoteTrailers?.[0]?.Url);
                            if (ytId && Platform.OS === 'web') {
                                return (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&rel=0&showinfo=0`}
                                        style={{ width: '100%', height: '100%', border: 'none' } as any}
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                    />
                                );
                            }
                            if (imageUri) {
                                return (
                                    <ExpoImage
                                        source={{ uri: imageUri }}
                                        style={newStyles.previewImage}
                                        cachePolicy="memory-disk"
                                        transition={200}
                                    />
                                );
                            }
                            return (
                                <View style={[newStyles.previewImage, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="film-outline" size={32} color="#555" />
                                </View>
                            );
                        })()}
                    </View>

                    <View style={newStyles.titleContainer}>
                        <Text style={newStyles.title} numberOfLines={2}>{item.Name}</Text>
                        {year ? <Text style={newStyles.eventDate}>{year}{genres ? ` • ${genres}` : ''}</Text> : null}
                        {item.Overview ? (
                            <Text style={newStyles.description} numberOfLines={3}>{item.Overview}</Text>
                        ) : null}
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderTab = (tab: typeof TAB_OPTIONS[0]) => (
        <Pressable
            key={tab.id}
            style={[newStyles.categoryTab, activeTab === tab.id && newStyles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
        >
            <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? '#000' : '#fff'}
                style={{ marginRight: 6 }}
            />
            <Text style={[
                newStyles.categoryTabText,
                activeTab === tab.id && newStyles.activeTabText
            ]}>
                {tab.label}
            </Text>
        </Pressable>
    );

    return (
        <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
            <View style={newStyles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={[newStyles.header]}>
                        <View style={newStyles.headerContent}>
                            <Text style={newStyles.headerTitle}>Nouveautés</Text>
                            <View style={newStyles.headerRight}>
                                <Pressable onPress={() => router.push('/search')}>
                                    <Ionicons name="search" size={24} color="#fff" />
                                </Pressable>
                            </View>
                        </View>

                        <View style={newStyles.categoryTabs}>
                            {TAB_OPTIONS.map(renderTab)}
                        </View>
                    </View>

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#E50914" />
                        </View>
                    ) : (
                        <Animated.ScrollView
                            ref={scrollViewRef}
                            showsVerticalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                        >
                            <View style={newStyles.comingSoonList}>
                                {(displayItems ?? []).map(renderItem)}
                            </View>
                        </Animated.ScrollView>
                    )}
                </SafeAreaView>
            </View>
        </TabScreenWrapper>
    );
}
