import { View, StyleSheet, Text, Pressable, Dimensions, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { useEffect, useState, useRef, useMemo } from 'react';
import { expandedPlayerStyles as styles } from '@/styles/expanded-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { useSimilarItems, useSeasons, useEpisodes } from '@/src/api/queries/useMediaQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { getImageUrl, getWebTranscodedUrl, getHlsStreamUrl } from '@/src/utils/imageUrl';
import { CategoriesListModal } from '@/components/CategoriesListModal/CategoriesListModal';

// Extraire l'ID YouTube d'une URL (youtube.com/watch?v=, youtu.be/, youtube.com/embed/)
function extractYouTubeId(url?: string): string | null {
    if (!url) return null;
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match?.[1] ?? null;
}

interface MovieData {
    id: string | number;
    title: string;
    imageUrl: string;
    video_url?: string;
    year?: string;
    duration?: string;
    rating?: string;
    description?: string;
    cast?: string[];
    director?: string;
    ranking_text?: string;
    type?: string;
    seasonCount?: number;
    seriesId?: string;
    trailerUrl?: string;
}

interface ExpandedPlayerProps {
    scrollComponent?: (props: any) => React.ReactElement;
    movie: MovieData;
}

export function ExpandedPlayer({ scrollComponent, movie }: ExpandedPlayerProps) {
    const ScrollComponentToUse = scrollComponent || ScrollView;
    const insets = useSafeAreaInsets();
    const videoViewRef = useRef<VideoView>(null);
    const router = useRouter();
    const [isMuted, setIsMuted] = useState(true);
    const progress = useSharedValue(0);
    const min = useSharedValue(0);
    const max = useSharedValue(100);
    const [duration, setDuration] = useState(0);
    const serverUrl = useAuthStore((s) => s.serverUrl) ?? '';
    const token = useAuthStore((s) => s.token) ?? '';
    const { data: similarItems } = useSimilarItems(typeof movie.id === 'string' ? movie.id : movie.id.toString());

    const isSeries = movie.type === 'Series' || movie.type === 'Episode';
    const itemId = typeof movie.id === 'string' ? movie.id : movie.id.toString();
    // Pour un épisode, on remonte à la série parente via seriesId
    const seriesId = movie.seriesId ?? (movie.type === 'Series' ? itemId : '');

    // Saisons & épisodes pour les séries
    const { data: seasons } = useSeasons(isSeries ? seriesId : '');
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [showSeasonPicker, setShowSeasonPicker] = useState(false);

    // Sélectionner la première saison par défaut
    useEffect(() => {
        if (seasons && seasons.length > 0 && !selectedSeasonId) {
            setSelectedSeasonId(seasons[0].Id ?? null);
        }
    }, [seasons]);

    const { data: episodes } = useEpisodes(isSeries ? seriesId : '', selectedSeasonId ?? '');
    const selectedSeason = seasons?.find((s) => s.Id === selectedSeasonId);

    const defaultMovieData = {
        video_url: '',
        year: '2024',
        duration: '2h 30m',
        rating: 'PG-13',
        description: 'No description available',
        cast: ['Cast not available'],
        director: 'Unknown Director',
        ranking_text: '#1 in Movies Today',
        title: 'Untitled',
        imageUrl: '',
    };

    const movieData = {
        ...defaultMovieData,
        ...Object.fromEntries(
            Object.entries(movie).filter(([_, value]) =>
                value !== null && value !== undefined && value !== ''
            )
        )
    };

    // URL HLS Jellyfin pour le preview (transcodé en H.264/AAC, compatible web+mobile)
    // Priorité : YouTube trailer > HLS stream
    const youtubeId = useMemo(() => extractYouTubeId(movie.trailerUrl), [movie.trailerUrl]);
    const youtubeEmbedUrl = youtubeId
        ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&showinfo=0`
        : null;

    const previewUrl = !youtubeEmbedUrl
        ? ((Platform.OS === 'web'
            ? getWebTranscodedUrl(serverUrl, itemId, token, { maxWidth: 720, videoBitRate: 2000000 })
            : getHlsStreamUrl(serverUrl, itemId, token, { maxWidth: 720, videoBitRate: 2000000 })
          ) || movieData.video_url)
        : '';

    const player = useVideoPlayer(previewUrl, (p) => {
        p.loop = true;
        p.muted = isMuted;
        if (previewUrl) p.play();
        p.timeUpdateEventInterval = 0.5;
    });

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const subscription = player.addListener('timeUpdate', ({ currentTime: ct }) => {
            progress.value = ct * 1000;
        });
        const sourceSubscription = player.addListener('sourceLoad', ({ duration: d }) => {
            const durationMs = d * 1000;
            setDuration(durationMs);
            max.value = durationMs;
        });
        return () => {
            subscription.remove();
            sourceSubscription.remove();
        };
    }, []);

    return (
        <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
            <View style={styles.backHeader}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
            </View>

            <ScrollComponentToUse
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 76 }}
            >
                <View style={styles.videoContainer}>
                    {youtubeEmbedUrl ? (
                        <iframe
                            src={youtubeEmbedUrl}
                            style={{ width: '100%', height: '100%', border: 'none' } as any}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    ) : (
                        <VideoView
                            ref={videoViewRef}
                            style={styles.video}
                            player={player}
                            nativeControls={false}
                            contentFit="cover"
                        />
                    )}
                    <View style={styles.videoOverlay} />
                    {!youtubeEmbedUrl && (
                        <View style={styles.muteOverlay}>
                            <Pressable
                                style={styles.soundButton}
                                onPress={() => setIsMuted(!isMuted)}
                            >
                                <Ionicons
                                    name={isMuted ? "volume-mute" : "volume-medium"}
                                    size={18}
                                    color="white"
                                />
                            </Pressable>
                        </View>
                    )}
                    {!youtubeEmbedUrl && (
                        <View style={styles.sliderContainer}>
                            <Slider
                                style={styles.slider}
                                progress={progress}
                                minimumValue={min}
                                maximumValue={max}
                                onValueChange={(value) => {
                                    player.currentTime = value / 1000;
                                }}
                                theme={{
                                    minimumTrackTintColor: '#db0000',
                                    bubbleBackgroundColor: '#db0000',
                                }}
                                thumbWidth={5}
                                sliderHeight={5}
                                containerStyle={styles.sliderInner}
                                disableTrackFollow={false}
                                disableTapEvent={false}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <ThemedText style={styles.title}>{movieData.title}</ThemedText>

                    <View style={styles.metaInfo}>
                        {movieData.year ? <ThemedText style={styles.year}>{movieData.year}</ThemedText> : null}
                        {movieData.duration ? <ThemedText style={styles.duration}>{movieData.duration}</ThemedText> : null}
                        {movieData.rating ? <ThemedText style={styles.rating}>{movieData.rating}</ThemedText> : null}
                        <ThemedText style={styles.quality}>HD</ThemedText>
                        {isSeries && seasons && seasons.length > 0 && (
                            <ThemedText style={styles.duration}>{seasons.length} saison{seasons.length > 1 ? 's' : ''}</ThemedText>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={styles.playButton}
                            onPress={() => {
                                player.pause();
                                router.push({
                                    pathname: '/player',
                                    params: { itemId, title: movieData.title },
                                });
                            }}
                        >
                            <Ionicons name="play" size={24} color="black" />
                            <ThemedText style={styles.playButtonText}>Play</ThemedText>
                        </Pressable>

                        <Pressable style={styles.downloadButton}>
                            <ExpoImage
                                source={require('../../assets/images/replace-these/download-netflix-transparent.png')}
                                style={{ width: 28, height: 28 }}
                                cachePolicy="memory-disk"
                                contentFit="contain"
                            />
                            <ThemedText style={styles.downloadButtonText}>Download</ThemedText>
                        </Pressable>
                    </View>

                    <ThemedText style={styles.description}>
                        {movieData.description}
                    </ThemedText>

                    <View style={styles.castInfo}>
                        <ThemedText style={styles.castLabel}>Cast: </ThemedText>
                        <ThemedText style={styles.castText}>
                            {movieData.cast?.join(', ')}
                        </ThemedText>
                    </View>

                    <View style={styles.directorInfo}>
                        <ThemedText style={styles.directorLabel}>Director: </ThemedText>
                        <ThemedText style={styles.directorText}>
                            {movieData.director}
                        </ThemedText>
                    </View>

                    <View style={styles.actionButtons}>
                        <Pressable style={[styles.actionButton, {
                            width: 100,
                            borderBottomWidth: 4,
                            borderBottomColor: '#db0000',
                        }]}>
                            <Ionicons name="add" size={24} color="white" />
                            <ThemedText style={styles.actionButtonText}>My List</ThemedText>
                        </Pressable>
                        <Pressable style={styles.actionButton}>
                            <Ionicons name="thumbs-up-outline" size={24} color="white" />
                            <ThemedText style={styles.actionButtonText}>Rate</ThemedText>
                        </Pressable>
                        <Pressable style={styles.actionButton}>
                            <Ionicons name="send-outline" size={20} color="white" style={{
                                marginBottom: 4,
                                transform: [{ rotate: '320deg' }]
                            }} />
                            <ThemedText style={styles.actionButtonText}>Share</ThemedText>
                        </Pressable>
                    </View>
                </View>

                {/* Épisodes pour les séries */}
                {isSeries && seasons && seasons.length > 0 && (
                    <View style={episodeStyles.container}>
                        {/* Bouton saison — ouvre la modal CategoriesListModal */}
                        <Pressable
                            style={episodeStyles.seasonDropdown}
                            onPress={() => setShowSeasonPicker(true)}
                        >
                            <ThemedText style={episodeStyles.seasonDropdownText}>
                                {selectedSeason?.Name ?? seasons[0]?.Name ?? 'Épisodes'}
                            </ThemedText>
                            {seasons.length > 1 && (
                                <Ionicons name="chevron-down" size={18} color="white" />
                            )}
                        </Pressable>

                        <CategoriesListModal
                            visible={showSeasonPicker}
                            onClose={() => setShowSeasonPicker(false)}
                            items={seasons.map((s) => ({ id: s.Id ?? '', label: s.Name ?? '' }))}
                            selectedId={selectedSeasonId}
                            onSelect={(id) => setSelectedSeasonId(id)}
                        />

                        {/* Liste des épisodes */}
                        {(episodes ?? []).map((ep) => {
                            const epTag = ep.ImageTags?.['Primary'];
                            const epThumb = ep.Id
                                ? getImageUrl({ serverUrl, itemId: ep.Id, maxWidth: 400, quality: 80, tag: epTag ?? undefined })
                                : '';
                            const epDuration = ep.RunTimeTicks
                                ? `${Math.round(ep.RunTimeTicks / 600000000)}m`
                                : '';
                            return (
                                <Pressable
                                    key={ep.Id}
                                    style={episodeStyles.episodeRow}
                                    onPress={() => {
                                        if (ep.Id) {
                                            player.pause();
                                            router.push({
                                                pathname: '/player',
                                                params: { itemId: ep.Id, title: ep.Name ?? '' },
                                            });
                                        }
                                    }}
                                >
                                    <View style={episodeStyles.episodeThumbContainer}>
                                        {epThumb ? (
                                            <ExpoImage
                                                source={{ uri: epThumb }}
                                                style={episodeStyles.episodeThumb}
                                                cachePolicy="memory-disk"
                                                transition={200}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={[episodeStyles.episodeThumb, { backgroundColor: '#2a2a2a' }]} />
                                        )}
                                        <View style={episodeStyles.playOverlay}>
                                            <Ionicons name="play-circle-outline" size={30} color="white" />
                                        </View>
                                    </View>
                                    <View style={episodeStyles.episodeInfo}>
                                        <ThemedText style={episodeStyles.episodeTitle} numberOfLines={1}>
                                            {ep.IndexNumber ? `${ep.IndexNumber}. ` : ''}{ep.Name}
                                        </ThemedText>
                                        {epDuration ? (
                                            <ThemedText style={episodeStyles.episodeDuration}>{epDuration}</ThemedText>
                                        ) : null}
                                        {ep.Overview ? (
                                            <ThemedText style={episodeStyles.episodeOverview} numberOfLines={2}>
                                                {ep.Overview}
                                            </ThemedText>
                                        ) : null}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                <View style={styles.moreLikeThis}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                        <ThemedText style={styles.moreLikeThisTitle}>Similaires</ThemedText>
                    </View>
                    <View style={styles.movieGrid}>
                        {(similarItems ?? []).slice(0, 12).map((similar) => {
                            const tag = similar.ImageTags?.['Primary'];
                            const uri = similar.Id
                                ? getImageUrl({ serverUrl, itemId: similar.Id, maxWidth: 300, quality: 80, tag: tag ?? undefined })
                                : '';
                            return (
                                <Pressable
                                    key={similar.Id}
                                    style={styles.moviePoster}
                                    onPress={() => {
                                        if (similar.Id) {
                                            router.push({ pathname: '/movie/[id]', params: { id: similar.Id } });
                                        }
                                    }}
                                >
                                    {uri ? (
                                        <ExpoImage
                                            source={{ uri }}
                                            style={{ width: '100%', height: '100%', borderRadius: 4 }}
                                            cachePolicy="memory-disk"
                                            transition={200}
                                        />
                                    ) : (
                                        <View style={{ width: '100%', height: '100%', borderRadius: 4, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="film-outline" size={20} color="#555" />
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollComponentToUse>
        </View>
    );
}

const episodeStyles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#fff',
    },
    seasonDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#2a2a2a',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    seasonDropdownText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    episodeRow: {
        flexDirection: 'row',
        marginBottom: 14,
        gap: 10,
    },
    episodeThumbContainer: {
        position: 'relative',
        width: 130,
        aspectRatio: 16 / 9,
        borderRadius: 4,
        overflow: 'hidden',
    },
    episodeThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    episodeInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    episodeTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    episodeDuration: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    episodeOverview: {
        fontSize: 12,
        lineHeight: 16,
        color: '#888',
    },
});