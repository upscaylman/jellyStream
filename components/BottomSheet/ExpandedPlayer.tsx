import { View, StyleSheet, Text, Pressable, Dimensions, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { useEffect, useState, useRef } from 'react';
import { expandedPlayerStyles as styles } from '@/styles/expanded-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { useSimilarItems } from '@/src/api/queries/useMediaQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { getImageUrl } from '@/src/utils/imageUrl';

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
}

interface ExpandedPlayerProps {
    scrollComponent: (props: any) => React.ReactElement;
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
    const { data: similarItems } = useSimilarItems(typeof movie.id === 'string' ? movie.id : movie.id.toString());

    const defaultMovieData = {
        video_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
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

    const player = useVideoPlayer(movieData.video_url, (p) => {
        p.loop = true;
        p.muted = isMuted;
        p.play();
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
        <BlurView
            intensity={85}
            tint="systemThickMaterialDark"
            style={[styles.rootContainer, { marginTop: insets.top }]}
        >
            <View style={styles.videoContainer}>
                <VideoView
                    ref={videoViewRef}
                    style={styles.video}
                    player={player}
                    nativeControls={false}
                    contentFit="cover"
                />
                <View style={styles.videoOverlay}>
                    <Pressable
                        style={styles.closeButton}
                        onPress={() => {/* handle close */ }}
                    >
                        <Ionicons name="close-outline" size={26} color="white" />
                    </Pressable>
                </View>
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
                            // maximumTrackTintColor: 'rgba(255, 255, 255, 0.795)',
                            bubbleBackgroundColor: '#db0000',
                        }}
                        thumbWidth={5}
                        sliderHeight={5}
                        containerStyle={styles.sliderInner}
                        disableTrackFollow={false}
                        disableTapEvent={false}
                    />
                </View>
            </View>

            <ScrollComponentToUse
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentContainer}>
                    <ThemedText style={styles.title}>{movieData.title}</ThemedText>

                    <View style={styles.metaInfo}>
                        {movieData.year ? <ThemedText style={styles.year}>{movieData.year}</ThemedText> : null}
                        {movieData.duration ? <ThemedText style={styles.duration}>{movieData.duration}</ThemedText> : null}
                        {movieData.rating ? <ThemedText style={styles.rating}>{movieData.rating}</ThemedText> : null}
                        <ThemedText style={styles.quality}>HD</ThemedText>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Pressable style={styles.playButton}>
                            <Ionicons name="play" size={24} color="black" />
                            <ThemedText style={styles.playButtonText}>Play</ThemedText>
                        </Pressable>

                        <Pressable style={styles.downloadButton}>
                            {/* <Ionicons name="download" size={20} color="white" /> */}
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
                            // backgroundColor: '#000000bb',
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

                <View style={styles.moreLikeThis}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                        <ThemedText style={styles.moreLikeThisTitle}>Similaires</ThemedText>
                    </View>
                    <View style={styles.movieGrid}>
                        {(similarItems ?? []).slice(0, 6).map((similar) => {
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
        </BlurView>
    );
}

