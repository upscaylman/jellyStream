import React, { useRef, useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Text,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useDebounce } from 'use-debounce';
import { useSearchItems, useTrending } from '@/src/api/queries/useMediaQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { getImageUrl, getBackdropUrl } from '@/src/utils/imageUrl';
import { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width / 3 - 16;

export default function SearchTab() {
    const pathname = usePathname();
    const isActive = pathname === '/search';
    const currentTabIndex = TAB_SCREENS.findIndex(screen => screen.name === 'search');
    const activeTabIndex = TAB_SCREENS.findIndex(screen =>
        pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
    );
    const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchQuery, 300);
    const inputRef = useRef<TextInput>(null);
    const router = useRouter();
    const serverUrl = useAuthStore((s) => s.serverUrl) ?? '';

    const { data: searchResults, isLoading: isSearching } = useSearchItems(debouncedSearchTerm);
    const { data: trendingItems } = useTrending(30);

    const displayItems = debouncedSearchTerm.length >= 2 ? searchResults : trendingItems;
    const isLoading = debouncedSearchTerm.length >= 2 && isSearching;

    const getItemImage = (item: BaseItemDto, type: 'poster' | 'backdrop') => {
        if (type === 'backdrop') {
            const backdropTag = item.BackdropImageTags?.[0];
            if (backdropTag) {
                return getBackdropUrl(serverUrl, item.Id ?? '', 400, 80, backdropTag);
            }
        }
        const primaryTag = item.ImageTags?.['Primary'];
        if (primaryTag) {
            return getImageUrl({ serverUrl, itemId: item.Id ?? '', maxWidth: 300, quality: 90, tag: primaryTag });
        }
        if (item.Id) {
            return getImageUrl({ serverUrl, itemId: item.Id, maxWidth: 300, quality: 90 });
        }
        return '';
    };

    return (
        <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
            <View style={styles.container}>
                <StatusBar style="light" />

                <View style={styles.header}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder="Rechercher films, séries..."
                            placeholderTextColor="#6b6b6b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#E50914" />
                    </View>
                ) : debouncedSearchTerm.length >= 2 && (!displayItems || displayItems.length === 0) ? (
                    <View style={styles.noResults}>
                        <Text style={styles.noResultsTitle}>Aucun résultat</Text>
                        <Text style={styles.noResultsSubtitle}>
                            Essayez de rechercher un autre film, série, acteur ou genre.
                        </Text>
                    </View>
                ) : (
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {debouncedSearchTerm.length >= 2 ? 'Résultats' : 'Tendances'}
                            </Text>
                            <View style={styles.posterGrid}>
                                {(displayItems ?? []).map((item) => {
                                    const imageUri = getItemImage(item, 'poster');
                                    return (
                                        <TouchableOpacity
                                            key={item.Id}
                                            style={styles.posterCard}
                                            onPress={() => router.push({ pathname: '/movie/[id]', params: { id: item.Id ?? '' } })}
                                        >
                                            {imageUri ? (
                                                <ExpoImage
                                                    source={{ uri: imageUri }}
                                                    style={styles.posterImage}
                                                    cachePolicy="memory-disk"
                                                    transition={200}
                                                />
                                            ) : (
                                                <View style={[styles.posterImage, { backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Ionicons name="film-outline" size={24} color="#666" />
                                                </View>
                                            )}
                                            <Text style={styles.posterTitle} numberOfLines={2}>{item.Name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                )}
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchInputContainer: {
        height: 40,
        backgroundColor: '#323232',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    section: {
        paddingVertical: 16,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    posterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 8,
    },
    posterCard: {
        width: POSTER_WIDTH,
        marginBottom: 12,
    },
    posterImage: {
        width: POSTER_WIDTH,
        height: POSTER_WIDTH * 1.5,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    posterTitle: {
        color: '#ccc',
        fontSize: 12,
        marginTop: 4,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    noResults: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 80,
    },
    noResultsTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    noResultsSubtitle: {
        color: '#6b6b6b',
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
