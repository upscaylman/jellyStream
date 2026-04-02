// Écran de sélection de profil après connexion — style Netflix
import { ThemedText } from "@/components/ThemedText";
import { useAuthStore } from "@/src/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import type { UserDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SLIDE_INTERVAL = 5000;
const TMDB_API_KEY = "0d6ab6b7b423555a44bd9a18c7330e06";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/";

interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string | null;
  logo_path?: string | null;
}

/** URL de l'image de profil Jellyfin (GetAvatar plugin) */
function getUserImageUrl(
  serverUrl: string,
  userId: string,
  userName: string,
  token?: string,
  version?: number,
): string {
  const base = serverUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({ quality: "90", maxWidth: "200" });
  if (token) params.set("api_key", token);
  params.set("_r", String(version ?? 0));
  return `${base}/Users/${userId}/Images/Primary?${params.toString()}`;
}

export default function ProfileSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const serverUrl = useAuthStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);
  const api = useAuthStore((s) => s.api);
  const userId = useAuthStore((s) => s.userId);
  const switchProfile = useAuthStore((s) => s.switchProfile);
  const savedProfiles = useAuthStore((s) => s.savedProfiles);

  const [users, setUsers] = useState<UserDto[]>([]);
  const [carouselItems, setCarouselItems] = useState<TmdbMovie[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Avatar picker
  interface AvatarItem {
    Id: string;
    Name: string;
    Url: string;
  }
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<AvatarItem[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [settingAvatar, setSettingAvatar] = useState(false);
  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  const bumpAvatarVersion = useAuthStore((s) => s.bumpAvatarVersion);

  // Charger les utilisateurs et les derniers ajouts
  useEffect(() => {
    if (!api || !serverUrl) return;

    // Charger les utilisateurs
    const loadUsers = async () => {
      try {
        const userApi = getUserApi(api);
        try {
          const result = await userApi.getUsers();
          setUsers(result.data ?? []);
        } catch {
          const result = await userApi.getPublicUsers();
          setUsers(result.data ?? []);
        }
      } catch {
        // Fallback : pas de users
      }
    };

    loadUsers();
  }, [api, serverUrl]);

  // Charger les films tendance depuis TMDB
  useEffect(() => {
    const loadCarousel = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=fr-FR`,
        );
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        const data = await res.json();
        // Garder les 4 premiers avec backdrop
        const movies: TmdbMovie[] = (data.results ?? [])
          .filter((m: TmdbMovie) => m.backdrop_path)
          .slice(0, 4);

        // Récupérer les logos pour chaque film
        const withLogos = await Promise.all(
          movies.map(async (m) => {
            try {
              const imgRes = await fetch(
                `https://api.themoviedb.org/3/movie/${m.id}/images?api_key=${TMDB_API_KEY}&include_image_languages=fr,en,null`,
              );
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                const logo = imgData.logos?.[0];
                return { ...m, logo_path: logo?.file_path ?? null };
              }
            } catch {
              /* ignore */
            }
            return { ...m, logo_path: null };
          }),
        );
        setCarouselItems(withLogos);
      } catch (e) {
        console.warn("TMDB carousel error:", e);
      } finally {
        setCarouselLoading(false);
      }
    };

    loadCarousel();
  }, []);

  // Auto-scroll du carousel
  useEffect(() => {
    if (carouselItems.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % carouselItems.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, SLIDE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [carouselItems.length]);

  const handleSelectProfile = useCallback(
    (user: UserDto) => {
      if (!user.Id) return;
      setLoadingProfile(user.Id);

      // Marquer le profil comme sélectionné (évite redirect au refresh)
      try {
        sessionStorage.setItem("profileSelected", "1");
      } catch {
        /* native */
      }

      // Chercher dans les savedProfiles
      const saved = savedProfiles.find((p) => p.userId === user.Id);
      if (saved) {
        switchProfile(saved.id);
        requestAnimationFrame(() => router.replace("/(tabs)"));
      } else {
        // Rediriger vers login pour ce user
        router.replace("/(tabs)");
      }
    },
    [savedProfiles, switchProfile, router],
  );

  // Charger les avatars disponibles (GetAvatar plugin)
  const fetchAvatars = useCallback(async () => {
    if (!serverUrl || !token) return;
    setLoadingAvatars(true);
    try {
      const res = await fetch(`${serverUrl}/GetAvatar/Avatars`, {
        headers: { "X-Emby-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableAvatars(data);
      }
    } catch {
      // Plugin pas installé ou erreur réseau
    } finally {
      setLoadingAvatars(false);
    }
  }, [serverUrl, token]);

  // Appliquer un avatar
  const setAvatar = useCallback(
    async (avatarId: string) => {
      if (!serverUrl || !token) return;
      setSettingAvatar(true);
      try {
        const res = await fetch(`${serverUrl}/GetAvatar/SetAvatar`, {
          method: "POST",
          headers: {
            "X-Emby-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ AvatarId: avatarId }),
        });
        if (res.ok) {
          setAvatarPickerVisible(false);
          bumpAvatarVersion();
        }
      } catch {
        // Erreur réseau
      } finally {
        setSettingAvatar(false);
      }
    },
    [serverUrl, token, bumpAvatarVersion],
  );

  const handleEdit = useCallback(() => {
    setAvatarPickerVisible(true);
    fetchAvatars();
  }, [fetchAvatars]);

  const renderCarouselItem = useCallback(({ item }: { item: TmdbMovie }) => {
    const imageUrl = `${TMDB_IMG_BASE}w1280${item.backdrop_path}`;
    const logoUrl = item.logo_path
      ? `${TMDB_IMG_BASE}w500${item.logo_path}`
      : null;
    const title = item.title || item.name || "";

    return (
      <View style={styles.slide}>
        <Image source={{ uri: imageUrl }} style={styles.slideImage} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.95)"]}
          locations={[0.2, 0.55, 0.85]}
          style={styles.slideGradient}
        />
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.movieLogo}
            resizeMode="contain"
          />
        ) : (
          <ThemedText style={styles.movieTitle}>{title}</ThemedText>
        )}
      </View>
    );
  }, []);

  // Dots du carousel
  const renderDots = () => {
    if (carouselItems.length <= 1) return null;
    return (
      <View style={styles.dotsContainer}>
        {carouselItems.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentSlide && styles.dotActive]}
          />
        ))}
      </View>
    );
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentSlide(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      {/* Carousel en fond */}
      {carouselItems.length > 0 ? (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={carouselItems}
            renderItem={renderCarouselItem}
            keyExtractor={(item) => String(item.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />
          {renderDots()}
        </View>
      ) : (
        <View style={styles.carouselPlaceholder}>
          <LinearGradient
            colors={["rgba(139, 0, 0, 0.4)", "rgba(0,0,0,0.95)"]}
            locations={[0, 0.6]}
            style={StyleSheet.absoluteFillObject}
          />
          {carouselLoading && (
            <ActivityIndicator
              color="#E50914"
              size="large"
              style={{ marginTop: SCREEN_HEIGHT * 0.3 }}
            />
          )}
        </View>
      )}

      {/* Zone profils en bas */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={[styles.profilesSection, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Ellipse avec dégradé sombre */}
        <LinearGradient
          colors={["#1e1e26", "#252338"]}
          locations={[0, 1]}
          style={styles.profilesBackground}
        />

        <ThemedText style={styles.chooseText}>
          Choisissez votre profil
        </ThemedText>

        <View style={styles.profilesGrid}>
          {users.map((user) => (
            <Pressable
              key={user.Id}
              style={styles.profileItem}
              onPress={() => handleSelectProfile(user)}
              disabled={loadingProfile !== null}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri: getUserImageUrl(
                      serverUrl!,
                      user.Id!,
                      user.Name ?? "U",
                      token ?? undefined,
                      avatarVersion,
                    ),
                  }}
                  style={styles.avatar}
                />
                {loadingProfile === user.Id && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </View>
              <ThemedText style={styles.profileName} numberOfLines={1}>
                {user.Name}
              </ThemedText>
            </Pressable>
          ))}

          {/* Bouton Modifier */}
          <Pressable style={styles.profileItem} onPress={handleEdit}>
            <View style={[styles.avatar, styles.editAvatar]}>
              <Ionicons name="pencil" size={28} color="#ccc" />
            </View>
            <ThemedText style={styles.profileName}>Modifier</ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Choisir un avatar
              </ThemedText>
              <TouchableOpacity
                onPress={() => setAvatarPickerVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {loadingAvatars ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#E50914" size="large" />
              </View>
            ) : availableAvatars.length === 0 ? (
              <View style={styles.modalLoading}>
                <Ionicons name="images-outline" size={48} color="#555" />
                <ThemedText style={styles.noAvatarsText}>
                  Aucun avatar disponible
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={availableAvatars}
                numColumns={3}
                keyExtractor={(item) => item.Id}
                contentContainerStyle={styles.avatarGrid}
                columnWrapperStyle={styles.avatarRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.avatarOption}
                    onPress={() => setAvatar(item.Id)}
                    disabled={settingAvatar}
                  >
                    <Image
                      source={{
                        uri: `${serverUrl}${item.Url}${token ? `?api_key=${token}` : ""}`,
                      }}
                      style={styles.avatarOptionImage}
                    />
                    <ThemedText
                      style={styles.avatarOptionName}
                      numberOfLines={1}
                    >
                      {item.Name}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              />
            )}

            {settingAvatar && (
              <View style={styles.settingOverlay}>
                <ActivityIndicator color="#E50914" size="large" />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  // Carousel
  carouselContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
  },
  carouselPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: "#141414",
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  slideImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  slideGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  movieLogo: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: SCREEN_WIDTH * 0.6,
    height: 80,
  },
  movieTitle: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 20,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Profils
  profilesSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
  },
  profilesBackground: {
    position: "absolute",
    bottom: 0,
    left: -SCREEN_WIDTH * 0.35,
    right: -SCREEN_WIDTH * 0.35,
    top: 125,
    borderTopLeftRadius: SCREEN_WIDTH,
    borderTopRightRadius: SCREEN_WIDTH,
    overflow: "hidden",
  },
  chooseText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
    zIndex: 1,
  },
  profilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
  },
  profileItem: {
    alignItems: "center",
    width: SCREEN_WIDTH > 600 ? 100 : (SCREEN_WIDTH - 48 - 40) / 3,
    gap: 6,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: SCREEN_WIDTH > 600 ? 90 : 80,
    height: SCREEN_WIDTH > 600 ? 90 : 80,
    borderRadius: 16,
    backgroundColor: "#2d2d2d",
  },
  editAvatar: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(68, 68, 68, 0.5)",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  // Modal avatar picker
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#232323",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 60,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noAvatarsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
  },
  avatarGrid: {
    padding: 16,
  },
  avatarRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  avatarOption: {
    flex: 1,
    maxWidth: "31%",
    alignItems: "center",
    gap: 6,
  },
  avatarOptionImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#2d2d2d",
  },
  avatarOptionName: {
    fontSize: 11,
    color: "#ccc",
    textAlign: "center",
  },
  settingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
