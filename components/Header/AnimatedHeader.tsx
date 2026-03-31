import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  AnimatedProps,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CastButton = Platform.OS !== "web"
  ? require("react-native-google-cast").CastButton
  : () => null;

import { styles } from "@/styles";
import { CategoriesListModal } from "../CategoriesListModal/CategoriesListModal";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type MediaFilter = "Movie" | "Series" | null;

interface AnimatedHeaderProps {
  headerAnimatedProps: AnimatedProps<any>;
  title: string;
  scrollDirection: Animated.SharedValue<number>;
  activeFilter?: MediaFilter;
  onFilterChange?: (filter: MediaFilter) => void;
}

export function AnimatedHeader({
  headerAnimatedProps,
  title,
  scrollDirection,
  activeFilter,
  onFilterChange,
}: AnimatedHeaderProps) {
  const [showCategories, setShowCategories] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onCategoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCategories(true);
  };

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

  return (
    <>
      <Animated.View style={[styles.header]}>
        <AnimatedBlurView
          tint="systemThickMaterialDark"
          style={[styles.blurContainer, { paddingTop: insets.top }]}
          animatedProps={headerAnimatedProps}
        >
          <Animated.View
            style={[styles.headerTitleContainer, headerTitleStyle]}
          >
            <Text style={styles.headerTitle}>{title}</Text>

            <View style={styles.headerButtons}>
              <CastButton style={{ width: 28, height: 28, tintColor: "#fff" }} />
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
                  /* TODO: notifications */
                }}
              >
                <Ionicons name="notifications-outline" size={28} color="#fff" />
              </Pressable>
            </View>
          </Animated.View>
          <Animated.View style={[styles.categoryTabs, tabsAnimatedStyle]}>
            <Pressable
              style={[
                styles.categoryTab,
                activeFilter === "Series" && {
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 20,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/series-list");
              }}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeFilter === "Series" && { fontWeight: "bold" },
                ]}
              >
                TV Shows
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.categoryTab,
                activeFilter === "Movie" && {
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 20,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/films");
              }}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeFilter === "Movie" && { fontWeight: "bold" },
                ]}
              >
                Movies
              </Text>
            </Pressable>
            <Pressable style={styles.categoryTab} onPress={onCategoryPress}>
              <Text style={styles.categoryTabTextWithIcon}>Categories</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </Pressable>
          </Animated.View>
        </AnimatedBlurView>
      </Animated.View>

      <CategoriesListModal
        visible={showCategories}
        onClose={() => setShowCategories(false)}
      />
    </>
  );
}
