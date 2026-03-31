import {
  useIsFavorite,
  useToggleFavorite,
} from "@/src/api/queries/useMediaQueries";
import { styles } from "@/styles";
import { FeaturedMovie } from "@/types/movie";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

interface FeaturedContentProps {
  movie: FeaturedMovie;
  imageStyle: any;
  categoriesStyle: any;
  buttonsStyle: any;
  topMargin: number;
  dominantColor?: string;
}

export function FeaturedContent({
  movie,
  imageStyle,
  categoriesStyle,
  buttonsStyle,
  topMargin,
  dominantColor,
}: FeaturedContentProps) {
  const router = useRouter();
  const isValidId = movie.id && movie.id !== "placeholder";
  const { data: isFavorite } = useIsFavorite(isValidId ? movie.id : "");
  const toggleFavorite = useToggleFavorite();

  return (
    <Pressable
      style={[styles.featuredContent, { marginTop: topMargin }]}
      onPress={() => {
        if (isValidId) {
          router.push({ pathname: "/movie/[id]", params: { id: movie.id } });
        }
      }}
    >
      <View style={styles.featuredWrapper}>
        <View style={styles.featuredImageContainer}>
          {movie.thumbnail ? (
            <Animated.Image
              source={{ uri: movie.thumbnail }}
              style={[styles.featuredImage, imageStyle]}
            />
          ) : (
            <Animated.View
              style={[
                styles.featuredImage,
                imageStyle,
                { backgroundColor: "#1a1a2e" },
              ]}
            />
          )}
          <LinearGradient
            colors={[
              "transparent",
              dominantColor ? `${dominantColor}cc` : "rgba(0,0,0,0.8)",
            ]}
            style={styles.featuredGradient}
          />
        </View>

        <View style={styles.featuredOverlay}>
          {movie.logoUrl ? (
            <View style={localStyles.logoContainer}>
              <ExpoImage
                source={{ uri: movie.logoUrl }}
                style={localStyles.logo}
                contentFit="contain"
              />
            </View>
          ) : movie.title ? (
            <View style={localStyles.logoContainer}>
              <Text style={localStyles.titleFallback}>{movie.title}</Text>
            </View>
          ) : null}

          <Animated.View style={[styles.featuredCategories, categoriesStyle]}>
            <Text style={styles.categoriesText}>
              {movie.categories.join(" • ")}
            </Text>
          </Animated.View>

          {/* <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 2 }}>
                        <Animated.Image
                            source={{ uri: 'https://loodibee.com/wp-content/uploads/Netflix-N-Symbol-logo.png' }}
                            style={{ width: 20, height: 20, top: -4, position: 'absolute', left: 0 }}
                        />
                        {movie.type && <Text style={styles.netflixTag}>{movie.type}</Text>}
                    </View> */}

          <Animated.View style={[styles.featuredButtons, buttonsStyle]}>
            <Pressable
              style={styles.playButton}
              onPress={() => {
                if (movie.id && movie.id !== "placeholder") {
                  router.push({
                    pathname: "/player",
                    params: { itemId: movie.id, title: movie.title },
                  });
                }
              }}
            >
              <Ionicons name="play" size={24} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </Pressable>
            <Pressable
              style={styles.myListButton}
              onPress={() => {
                if (isValidId) {
                  toggleFavorite.mutate({
                    itemId: movie.id,
                    isFavorite: !!isFavorite,
                  });
                }
              }}
            >
              <Ionicons
                name={isFavorite ? "checkmark" : "add"}
                size={24}
                color="#fff"
              />
              <Text style={styles.myListButtonText}>Ma liste</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  logo: {
    width: 220,
    height: 80,
  },
  titleFallback: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    textShadow: "0px 2px 6px rgba(0,0,0,0.8)",
  },
});
