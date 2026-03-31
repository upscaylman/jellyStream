import { CastModal } from "@/components/CastModal";
import { CategoriesListModal } from "@/components/CategoriesListModal/CategoriesListModal";
import { ThemedText } from "@/components/ThemedText";
import { CastIcon } from "@/icons/CastIcon";
import {
  useCollectionForItem,
  useEpisodes,
  useIsFavorite,
  useIsLiked,
  useSeasons,
  useSimilarItems,
  useToggleFavorite,
  useToggleLike,
} from "@/src/api/queries/useMediaQueries";
import { useAuthStore } from "@/src/stores/authStore";
import {
  getHlsStreamUrl,
  getImageUrl,
  getWebTranscodedUrl,
} from "@/src/utils/imageUrl";
import { expandedPlayerStyles as styles } from "@/styles/expanded-player";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Slider } from "react-native-awesome-slider";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Extraire l'ID YouTube d'une URL (youtube.com/watch?v=, youtu.be/, youtube.com/embed/)
function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
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
  trailerUrls?: string[];
  genres?: string[];
}

interface ExpandedPlayerProps {
  scrollComponent?: (props: any) => React.ReactElement;
  movie: MovieData;
}

export function ExpandedPlayer({
  scrollComponent,
  movie,
}: ExpandedPlayerProps) {
  const ScrollComponentToUse = scrollComponent || ScrollView;
  const insets = useSafeAreaInsets();
  const videoViewRef = useRef<VideoView>(null);
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(true);
  const [showCast, setShowCast] = useState(false);
  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(100);
  const [duration, setDuration] = useState(0);
  const serverUrl = useAuthStore((s) => s.serverUrl) ?? "";
  const token = useAuthStore((s) => s.token) ?? "";
  const { data: similarItems, isLoading: isLoadingSimilar } = useSimilarItems(
    typeof movie.id === "string" ? movie.id : movie.id.toString(),
    12,
    movie.genres,
  );

  const isSeries = movie.type === "Series" || movie.type === "Episode";
  const isMovie = movie.type === "Movie" || (!isSeries && !movie.type);
  const itemId = typeof movie.id === "string" ? movie.id : movie.id.toString();

  // Favoris / Ma liste
  const { data: isFavorite } = useIsFavorite(itemId);
  const toggleFavorite = useToggleFavorite();

  // Like / Évaluer
  const { data: isLiked } = useIsLiked(itemId);
  const toggleLike = useToggleLike();

  // Pour un épisode, on remonte à la série parente via seriesId
  const seriesId = movie.seriesId ?? (movie.type === "Series" ? itemId : "");

  // Collection (BoxSet) pour les films
  const { data: collectionData } = useCollectionForItem(isMovie ? itemId : "");
  const hasCollection = !!collectionData && collectionData.items.length > 1;
  const hasSimilar = !!similarItems && similarItems.length > 0;

  // Saisons & épisodes pour les séries
  const { data: seasons } = useSeasons(isSeries ? seriesId : "");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "episodes" | "trailers" | "similar" | "collection"
  >(isSeries ? "episodes" : "similar");

  // Bandes-annonces YouTube (max 6)
  const trailers = useMemo(() => {
    const urls =
      movie.trailerUrls ?? (movie.trailerUrl ? [movie.trailerUrl] : []);
    return urls
      .map((url) => {
        const id = extractYouTubeId(url);
        return id ? { id, url } : null;
      })
      .filter((t): t is { id: string; url: string } => t !== null)
      .slice(0, 6);
  }, [movie.trailerUrls, movie.trailerUrl]);
  const hasTrailers = trailers.length > 0;

  // Basculer l'onglet actif si celui sélectionné n'est plus disponible
  useEffect(() => {
    if (activeTab === "similar" && !hasSimilar && !isLoadingSimilar) {
      if (isSeries) setActiveTab("episodes");
      else if (hasCollection) setActiveTab("collection");
      else if (hasTrailers) setActiveTab("trailers");
    }
  }, [
    hasSimilar,
    isLoadingSimilar,
    activeTab,
    isSeries,
    hasCollection,
    hasTrailers,
  ]);

  // Sélectionner la première saison par défaut
  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].Id ?? null);
    }
  }, [seasons]);

  const { data: episodes } = useEpisodes(
    isSeries ? seriesId : "",
    selectedSeasonId ?? "",
  );
  const selectedSeason = seasons?.find((s) => s.Id === selectedSeasonId);

  const defaultMovieData = {
    video_url: "",
    year: "2024",
    duration: "2h 30m",
    rating: "PG-13",
    description: "No description available",
    cast: ["Cast not available"],
    director: "Unknown Director",
    ranking_text: "#1 in Movies Today",
    title: "Untitled",
    imageUrl: "",
  };

  const movieData = {
    ...defaultMovieData,
    ...Object.fromEntries(
      Object.entries(movie).filter(
        ([_, value]) => value !== null && value !== undefined && value !== "",
      ),
    ),
  };

  // URL HLS Jellyfin pour le preview (transcodé en H.264/AAC, compatible web+mobile)
  // Priorité : YouTube trailer > HLS stream
  const youtubeId = useMemo(
    () => extractYouTubeId(movie.trailerUrl),
    [movie.trailerUrl],
  );
  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&origin=${Platform.OS === "web" ? window.location.origin : ""}`
    : null;

  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  const previewUrl = !youtubeEmbedUrl
    ? (Platform.OS === "web"
        ? getWebTranscodedUrl(serverUrl, itemId, token, {
            maxWidth: 720,
            videoBitRate: 2000000,
          })
        : getHlsStreamUrl(serverUrl, itemId, token, {
            maxWidth: 720,
            videoBitRate: 2000000,
          })) || movieData.video_url
    : "";

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
    const subscription = player.addListener(
      "timeUpdate",
      ({ currentTime: ct }) => {
        progress.value = ct * 1000;
      },
    );
    const sourceSubscription = player.addListener(
      "sourceLoad",
      ({ duration: d }) => {
        const durationMs = d * 1000;
        setDuration(durationMs);
        max.value = durationMs;
      },
    );
    return () => {
      subscription.remove();
      sourceSubscription.remove();
    };
  }, []);

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
      <View style={styles.backHeader}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.backButton} onPress={() => setShowCast(true)}>
          <CastIcon size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollComponentToUse
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 76 }}
      >
        <View style={styles.videoContainer}>
          {youtubeEmbedUrl ? (
            <View
              style={
                { width: "100%", height: "100%", position: "relative" } as any
              }
            >
              <iframe
                ref={(el: HTMLIFrameElement | null) => {
                  ytIframeRef.current = el;
                }}
                src={youtubeEmbedUrl}
                style={{ width: "100%", height: "100%", border: "none" } as any}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
              <View
                style={
                  {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
                  } as any
                }
                pointerEvents="none"
              />
            </View>
          ) : hasTrailers ? (
            <>
              <VideoView
                ref={videoViewRef}
                style={styles.video}
                player={player}
                nativeControls={false}
                contentFit="cover"
              />
            </>
          ) : (
            <ExpoImage
              source={{ uri: movieData.imageUrl }}
              style={styles.video}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
          )}
          <View style={styles.videoOverlay} />
          {(youtubeEmbedUrl || (!youtubeEmbedUrl && hasTrailers)) && (
            <View style={styles.muteOverlay}>
              <Pressable
                style={styles.soundButton}
                onPress={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (youtubeEmbedUrl && ytIframeRef.current?.contentWindow) {
                    const cmd = next ? "mute" : "unMute";
                    ytIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: "command", func: cmd, args: [] }),
                      "*",
                    );
                  }
                }}
              >
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-medium"}
                  size={18}
                  color="white"
                />
              </Pressable>
            </View>
          )}
          {!youtubeEmbedUrl && hasTrailers && (
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
                  minimumTrackTintColor: "#db0000",
                  bubbleBackgroundColor: "#db0000",
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
            {movieData.year ? (
              <ThemedText style={styles.year}>{movieData.year}</ThemedText>
            ) : null}
            {movieData.duration ? (
              <ThemedText style={styles.duration}>
                {movieData.duration}
              </ThemedText>
            ) : null}
            {movieData.rating ? (
              <ThemedText style={styles.rating}>{movieData.rating}</ThemedText>
            ) : null}
            <ThemedText style={styles.quality}>HD</ThemedText>
            {isSeries && seasons && seasons.length > 0 && (
              <ThemedText style={styles.duration}>
                {seasons.length} saison{seasons.length > 1 ? "s" : ""}
              </ThemedText>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.playButton}
              onPress={() => {
                player.pause();
                // Pour une série, lancer le premier épisode disponible
                const playId =
                  isSeries && episodes && episodes.length > 0
                    ? episodes[0].Id
                    : itemId;
                const playTitle =
                  isSeries && episodes && episodes.length > 0
                    ? (episodes[0].Name ?? movieData.title)
                    : movieData.title;
                if (playId) {
                  router.push({
                    pathname: "/player",
                    params: { itemId: playId, title: playTitle },
                  });
                }
              }}
            >
              <Ionicons name="play" size={24} color="black" />
              <ThemedText style={styles.playButtonText}>Play</ThemedText>
            </Pressable>

            <Pressable style={styles.downloadButton}>
              <ExpoImage
                source={require("../../assets/images/replace-these/download-netflix-transparent.png")}
                style={{ width: 28, height: 28 }}
                cachePolicy="memory-disk"
                contentFit="contain"
              />
              <ThemedText style={styles.downloadButtonText}>
                Download
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.description}>
            {movieData.description}
          </ThemedText>

          <View style={styles.castInfo}>
            <ThemedText style={styles.castLabel}>Cast: </ThemedText>
            <ThemedText style={styles.castText}>
              {movieData.cast?.join(", ")}
            </ThemedText>
          </View>

          <View style={styles.directorInfo}>
            <ThemedText style={styles.directorLabel}>Director: </ThemedText>
            <ThemedText style={styles.directorText}>
              {movieData.director}
            </ThemedText>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionItem}
              onPress={() =>
                toggleFavorite.mutate({
                  itemId,
                  isFavorite: isFavorite ?? false,
                })
              }
            >
              <Ionicons
                name={isFavorite ? "checkmark" : "add"}
                size={24}
                color="white"
              />
              <ThemedText style={styles.actionItemText}>Ma liste</ThemedText>
            </Pressable>
            <Pressable
              style={styles.actionItem}
              onPress={() => toggleLike.mutate({ itemId, isLiked: !!isLiked })}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color="white"
              />
              <ThemedText style={styles.actionItemText}>Évaluer</ThemedText>
            </Pressable>
            <Pressable style={styles.actionItem}>
              <Ionicons name="share-social-outline" size={24} color="white" />
              <ThemedText style={styles.actionItemText}>Partager</ThemedText>
            </Pressable>
            <Pressable style={styles.actionItem}>
              <Ionicons name="download-outline" size={24} color="white" />
              <ThemedText style={styles.actionItemText}>Télécharger</ThemedText>
            </Pressable>
          </View>

          <View style={styles.tabBar}>
            <View style={styles.tabSeparator} />
            {isSeries && (
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "episodes" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("episodes")}
              >
                <ThemedText
                  style={[
                    styles.tabItemText,
                    activeTab === "episodes" && styles.tabItemTextActive,
                  ]}
                >
                  Épisodes
                </ThemedText>
              </Pressable>
            )}
            {hasSimilar && (
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "similar" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("similar")}
              >
                <ThemedText
                  style={[
                    styles.tabItemText,
                    activeTab === "similar" && styles.tabItemTextActive,
                  ]}
                >
                  Titres similaires
                </ThemedText>
              </Pressable>
            )}
            {hasCollection && (
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "collection" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("collection")}
              >
                <ThemedText
                  style={[
                    styles.tabItemText,
                    activeTab === "collection" && styles.tabItemTextActive,
                  ]}
                >
                  Collection
                </ThemedText>
              </Pressable>
            )}
            {hasTrailers && (
              <Pressable
                style={[
                  styles.tabItem,
                  activeTab === "trailers" && styles.tabItemActive,
                ]}
                onPress={() => setActiveTab("trailers")}
              >
                <ThemedText
                  style={[
                    styles.tabItemText,
                    activeTab === "trailers" && styles.tabItemTextActive,
                  ]}
                >
                  Bande-annonce
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Épisodes pour les séries */}
        {isSeries &&
          activeTab === "episodes" &&
          seasons &&
          seasons.length > 0 && (
            <View style={episodeStyles.container}>
              {/* Bouton saison — affiché uniquement si plusieurs saisons */}
              {seasons.length > 1 ? (
                <>
                  <Pressable
                    style={episodeStyles.seasonDropdown}
                    onPress={() => setShowSeasonPicker(true)}
                  >
                    <ThemedText style={episodeStyles.seasonDropdownText}>
                      {selectedSeason?.Name ?? seasons[0]?.Name ?? "Épisodes"}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={18} color="white" />
                  </Pressable>

                  <CategoriesListModal
                    visible={showSeasonPicker}
                    onClose={() => setShowSeasonPicker(false)}
                    items={seasons.map((s) => ({
                      id: s.Id ?? "",
                      label: s.Name ?? "",
                    }))}
                    selectedId={selectedSeasonId}
                    onSelect={(id) => setSelectedSeasonId(id)}
                  />
                </>
              ) : null}

              {/* Liste des épisodes */}
              {(episodes ?? []).map((ep) => {
                const epTag = ep.ImageTags?.["Primary"];
                const epThumb = ep.Id
                  ? getImageUrl({
                      serverUrl,
                      itemId: ep.Id,
                      maxWidth: 400,
                      quality: 80,
                      tag: epTag ?? undefined,
                    })
                  : "";
                const epDuration = ep.RunTimeTicks
                  ? `${Math.round(ep.RunTimeTicks / 600000000)}m`
                  : "";
                return (
                  <Pressable
                    key={ep.Id}
                    style={episodeStyles.episodeRow}
                    onPress={() => {
                      if (ep.Id) {
                        player.pause();
                        router.push({
                          pathname: "/player",
                          params: { itemId: ep.Id, title: ep.Name ?? "" },
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
                        <View
                          style={[
                            episodeStyles.episodeThumb,
                            { backgroundColor: "#2a2a2a" },
                          ]}
                        />
                      )}
                      <View style={episodeStyles.playOverlay}>
                        <Ionicons
                          name="play-circle-outline"
                          size={30}
                          color="white"
                        />
                      </View>
                    </View>
                    <View style={episodeStyles.episodeInfo}>
                      <ThemedText
                        style={episodeStyles.episodeTitle}
                        numberOfLines={1}
                      >
                        {ep.IndexNumber ? `${ep.IndexNumber}. ` : ""}
                        {ep.Name}
                      </ThemedText>
                      {epDuration ? (
                        <ThemedText style={episodeStyles.episodeDuration}>
                          {epDuration}
                        </ThemedText>
                      ) : null}
                      {ep.Overview ? (
                        <ThemedText
                          style={episodeStyles.episodeOverview}
                          numberOfLines={2}
                        >
                          {ep.Overview}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

        {/* Bandes-annonces YouTube */}
        {activeTab === "trailers" && hasTrailers && (
          <View style={trailerStyles.container}>
            {trailers.map((trailer) => (
              <Pressable
                key={trailer.id}
                style={trailerStyles.trailerRow}
                onPress={() => Linking.openURL(trailer.url)}
              >
                <View style={trailerStyles.thumbContainer}>
                  <ExpoImage
                    source={{
                      uri: `https://img.youtube.com/vi/${trailer.id}/mqdefault.jpg`,
                    }}
                    style={trailerStyles.thumb}
                    cachePolicy="memory-disk"
                    transition={200}
                    contentFit="cover"
                  />
                  <View style={trailerStyles.playOverlay}>
                    <Ionicons
                      name="play-circle-outline"
                      size={36}
                      color="white"
                    />
                  </View>
                </View>
                <View style={trailerStyles.info}>
                  <ThemedText style={trailerStyles.title} numberOfLines={2}>
                    {movie.title} - Bande-annonce officielle
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Collection (BoxSet) */}
        {activeTab === "collection" && hasCollection && (
          <View style={collectionStyles.container}>
            <ThemedText style={collectionStyles.collectionName}>
              {collectionData!.boxSet.Name}
            </ThemedText>
            {collectionData!.items
              .filter((colItem) => colItem.Id !== itemId)
              .map((colItem) => {
                const colTag = colItem.ImageTags?.["Primary"];
                const colThumb = colItem.Id
                  ? getImageUrl({
                      serverUrl,
                      itemId: colItem.Id,
                      maxWidth: 300,
                      quality: 80,
                      tag: colTag ?? undefined,
                    })
                  : "";
                const colYear = colItem.ProductionYear
                  ? String(colItem.ProductionYear)
                  : "";
                const colDuration = colItem.RunTimeTicks
                  ? (() => {
                      const totalMin = Math.round(
                        colItem.RunTimeTicks / 600000000,
                      );
                      const h = Math.floor(totalMin / 60);
                      const m = totalMin % 60;
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })()
                  : "";
                return (
                  <Pressable
                    key={colItem.Id}
                    style={collectionStyles.itemRow}
                    onPress={() => {
                      if (colItem.Id) {
                        router.push({
                          pathname: "/movie/[id]",
                          params: { id: colItem.Id },
                        });
                      }
                    }}
                  >
                    <View style={collectionStyles.thumbContainer}>
                      {colThumb ? (
                        <ExpoImage
                          source={{ uri: colThumb }}
                          style={collectionStyles.thumb}
                          cachePolicy="memory-disk"
                          transition={200}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            collectionStyles.thumb,
                            { backgroundColor: "#2a2a2a" },
                          ]}
                        />
                      )}
                      <View style={collectionStyles.playOverlay}>
                        <Ionicons
                          name="play-circle-outline"
                          size={30}
                          color="white"
                        />
                      </View>
                    </View>
                    <View style={collectionStyles.info}>
                      <ThemedText
                        style={collectionStyles.title}
                        numberOfLines={1}
                      >
                        {colItem.Name}
                      </ThemedText>
                      <View style={collectionStyles.metaRow}>
                        {colYear ? (
                          <ThemedText style={collectionStyles.meta}>
                            {colYear}
                          </ThemedText>
                        ) : null}
                        {colDuration ? (
                          <ThemedText style={collectionStyles.meta}>
                            {colDuration}
                          </ThemedText>
                        ) : null}
                      </View>
                      {colItem.Overview ? (
                        <ThemedText
                          style={collectionStyles.overview}
                          numberOfLines={2}
                        >
                          {colItem.Overview}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        )}

        {activeTab === "similar" && (
          <View style={styles.moreLikeThis}>
            <View style={styles.movieGrid}>
              {(similarItems ?? []).slice(0, 12).map((similar) => {
                const tag = similar.ImageTags?.["Primary"];
                const uri = similar.Id
                  ? getImageUrl({
                      serverUrl,
                      itemId: similar.Id,
                      maxWidth: 300,
                      quality: 80,
                      tag: tag ?? undefined,
                    })
                  : "";
                return (
                  <Pressable
                    key={similar.Id}
                    style={styles.moviePoster}
                    onPress={() => {
                      if (similar.Id) {
                        router.push({
                          pathname: "/movie/[id]",
                          params: { id: similar.Id },
                        });
                      }
                    }}
                  >
                    {uri ? (
                      <ExpoImage
                        source={{ uri }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 4,
                        }}
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 4,
                          backgroundColor: "#2a2a2a",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="film-outline" size={20} color="#555" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollComponentToUse>

      <CastModal
        visible={showCast}
        onClose={() => setShowCast(false)}
        onSelect={() => {
          /* TODO: action après sélection */
        }}
      />
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
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  seasonDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  seasonDropdownText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
  singleSeasonTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  episodeRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  episodeThumbContainer: {
    position: "relative",
    width: 130,
    aspectRatio: 16 / 9,
    borderRadius: 4,
    overflow: "hidden",
  },
  episodeThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  episodeInfo: {
    flex: 1,
    justifyContent: "center",
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  episodeDuration: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  episodeOverview: {
    fontSize: 12,
    lineHeight: 16,
    color: "#888",
  },
});

const trailerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  trailerRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  thumbContainer: {
    position: "relative",
    width: 160,
    aspectRatio: 16 / 9,
    borderRadius: 4,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
});

const collectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  thumbContainer: {
    position: "relative",
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: 4,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: "#999",
  },
  overview: {
    fontSize: 12,
    lineHeight: 16,
    color: "#888",
  },
});
