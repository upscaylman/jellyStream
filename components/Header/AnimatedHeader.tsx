import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  AnimatedProps,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCastSheet } from "@/hooks/useCastSheet";
import { CastIcon } from "@/icons/CastIcon";
import { useNotificationBadgeCount } from "@/src/stores/notificationStore";
import { styles } from "@/styles";
import { CategoriesListModal } from "../CategoriesListModal/CategoriesListModal";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type MediaFilter = "Movie" | "Series" | null;

interface AnimatedHeaderProps {
  headerAnimatedProps: AnimatedProps<any>;
  title: string;
  scrollDirection: Animated.SharedValue<number>;
  scrollY: Animated.SharedValue<number>;
  activeFilter?: MediaFilter;
  onFilterChange?: (filter: MediaFilter) => void;
  /** Mode sous-page : affiche un bouton back et un seul tab "Toutes les catégories" */
  subPage?: boolean;
  /** Genres disponibles pour le mode subPage */
  genres?: string[];
  /** Genre actuellement sélectionné */
  selectedGenre?: string | null;
  /** Callback quand un genre est sélectionné */
  onGenreSelect?: (genre: string | null) => void;
  /** Nombre d'items à afficher (style IPTV) */
  itemCount?: number;
}

export function AnimatedHeader({
  headerAnimatedProps,
  title,
  scrollDirection,
  scrollY,
  activeFilter,
  onFilterChange,
  subPage,
  genres,
  selectedGenre,
  onGenreSelect,
  itemCount,
}: AnimatedHeaderProps) {
  const [showCategories, setShowCategories] = useState(false);
  const openCast = useCastSheet();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const badgeCount = useNotificationBadgeCount();

  const onCategoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCategories(true);
  };

  const handleGenreSelect = (id: string) => {
    if (id === "__all__") {
      onGenreSelect?.(null);
    } else {
      onGenreSelect?.(id);
    }
  };

  const genreItems = React.useMemo(() => {
    if (!genres) return undefined;
    return [
      { id: "__all__", label: "Toutes les catégories" },
      ...genres.map((g) => ({ id: g, label: g })),
    ];
  }, [genres]);

  const headerTitleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(scrollDirection.value, [0, 1], [1, 0.96], "clamp"),
        },
      ],
    };
  });

  const tabsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollDirection.value,
        [0, 0.5, 1],
        [1, 0.8, 0],
        "clamp",
      ),
      transform: [
        {
          translateY: interpolate(
            scrollDirection.value,
            [0, 1],
            [0, -40],
            "clamp",
          ),
        },
      ],
      overflow: "hidden",
      height: interpolate(scrollDirection.value, [0, 1], [47, 0], "clamp"),
    };
  });

  const blurOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 90], [0, 1], "clamp"),
    };
  });

  return (
    <>
      <Animated.View style={[styles.header]}>
        <Animated.View
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            blurOpacityStyle,
          ]}
        >
          <AnimatedBlurView
            tint="systemThickMaterialDark"
            style={{ width: "100%", height: "100%" }}
            animatedProps={headerAnimatedProps}
          />
        </Animated.View>
        <View style={[styles.blurContainer, { paddingTop: insets.top }]}>
          <Animated.View
            style={[styles.headerTitleContainer, headerTitleStyle]}
          >
            {subPage ? (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Pressable
                    onPress={() => {
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace("/");
                      }
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="arrow-back" size={24} color="white" />
                  </Pressable>
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>
                <Pressable style={styles.searchButton} onPress={openCast}>
                  <CastIcon size={28} color="#fff" />
                </Pressable>
              </>
            ) : (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <ExpoImage
                    source={require("../../assets/images/logo.png")}
                    style={{ width: 28, height: 28 }}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                  />
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>

                <View style={styles.headerButtons}>
                  <Pressable style={styles.searchButton} onPress={openCast}>
                    <CastIcon size={28} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.searchButton}
                    onPress={() => router.push("/downloads")}
                  >
                    <ExpoImage
                      source={require("../../assets/images/replace-these/download-netflix-transparent.png")}
                      style={{ width: 28, height: 28 }}
                      cachePolicy="memory-disk"
                      contentFit="contain"
                    />
                  </Pressable>
                  <Pressable
                    style={styles.searchButton}
                    onPress={() => {
                      router.push("/notifications");
                    }}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={28}
                      color="#fff"
                    />
                    {badgeCount > 0 && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          backgroundColor: "#E50914",
                          borderRadius: 9,
                          minWidth: 18,
                          height: 18,
                          justifyContent: "center",
                          alignItems: "center",
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
          <Animated.View style={[styles.categoryTabs, tabsAnimatedStyle]}>
            {subPage ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                {selectedGenre && (
                  <Pressable
                    style={[
                      styles.categoryTab,
                      { backgroundColor: "rgba(255,255,255,0.15)" },
                    ]}
                    onPress={() => onGenreSelect?.(null)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                    <Text
                      style={[styles.categoryTabText, { fontWeight: "bold" }]}
                    >
                      {selectedGenre}
                    </Text>
                  </Pressable>
                )}
                <Pressable style={styles.categoryTab} onPress={onCategoryPress}>
                  <Text style={styles.categoryTabTextWithIcon}>
                    {selectedGenre ? "Catégories" : "Toutes les catégories"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </Pressable>
                {itemCount != null && (
                  <View style={{ marginLeft: "auto" }}>
                    <Text style={{ color: "#808080", fontSize: 13 }}>
                      {itemCount}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.categoryTab,
                    {
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                      borderTopLeftRadius: 20,
                      borderBottomLeftRadius: 20,
                    },
                    activeFilter === "Series" && {
                      backgroundColor: "rgba(255,255,255,0.15)",
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.navigate("/(tabs)/series-list");
                  }}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      activeFilter === "Series" && { fontWeight: "bold" },
                    ]}
                  >
                    Séries
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.categoryTab,
                    { borderRadius: 12 },
                    activeFilter === "Movie" && {
                      backgroundColor: "rgba(255,255,255,0.15)",
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.navigate("/(tabs)/films");
                  }}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      activeFilter === "Movie" && { fontWeight: "bold" },
                    ]}
                  >
                    Films
                  </Text>
                </Pressable>
                {selectedGenre ? (
                  <>
                    <Pressable
                      style={[
                        styles.categoryTab,
                        {
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                          borderTopRightRadius: 20,
                          borderBottomRightRadius: 20,
                        },
                      ]}
                      onPress={() => onGenreSelect?.(null)}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                      <Text
                        style={[styles.categoryTabText, { fontWeight: "bold" }]}
                      >
                        {selectedGenre}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.categoryTab}
                      onPress={onCategoryPress}
                    >
                      <Ionicons name="chevron-down" size={16} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={[
                      styles.categoryTab,
                      {
                        borderTopLeftRadius: 12,
                        borderBottomLeftRadius: 12,
                        borderTopRightRadius: 20,
                        borderBottomRightRadius: 20,
                      },
                    ]}
                    onPress={onCategoryPress}
                  >
                    <Text style={styles.categoryTabTextWithIcon}>
                      Categories
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" />
                  </Pressable>
                )}
              </>
            )}
          </Animated.View>
        </View>
      </Animated.View>

      <CategoriesListModal
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        items={genreItems}
        selectedId={selectedGenre ?? "__all__"}
        onSelect={handleGenreSelect}
      />
    </>
  );
}
