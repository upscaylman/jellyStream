import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { ItemPreviewSheet } from "@/components/BottomSheet/ItemPreviewSheet";
import { useWebDragScroll } from "@/hooks/useWebDragScroll";
import { styles as globalStyles } from "@/styles";
import { Movie, MovieRow } from "@/types/movie";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const CARD_WIDTH = 165.32;
const CARD_HEIGHT = 340.48;
const CARD_GAP = 10;

const BigCard = ({
  item,
  router,
  onLongPress,
}: {
  item: Movie;
  router: ReturnType<typeof useRouter>;
  onLongPress?: () => void;
}) => {
  const imageUri = item.backdropUrl || item.imageUrl;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/movie/[id]",
          params: { id: item.id },
        })
      }
      onLongPress={onLongPress}
      delayLongPress={400}
      style={cardStyles.card}
    >
      <View style={cardStyles.imageContainer}>
        {imageUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={cardStyles.image}
            cachePolicy="memory-disk"
            transition={200}
            contentFit="cover"
          />
        ) : (
          <View style={[cardStyles.image, { backgroundColor: "#2a2a2a" }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          locations={[0.5, 1]}
          style={cardStyles.gradient}
        />
        <View style={cardStyles.titleContainer}>
          {item.logoUrl ? (
            <ExpoImage
              source={{ uri: item.logoUrl }}
              style={cardStyles.logo}
              cachePolicy="memory-disk"
              contentFit="contain"
            />
          ) : (
            <Text style={cardStyles.title} numberOfLines={2}>
              {item.title}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export function BigCardRow({ rowTitle, movies }: MovieRow) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { openSheet } = useBottomSheet();
  useWebDragScroll(flatListRef);

  const handleLongPress = (itemId: string) => {
    openSheet({
      content: <ItemPreviewSheet itemId={itemId} />,
      maxHeight: 480,
    });
  };

  const renderItem = ({ item }: { item: Movie }) => (
    <BigCard
      item={item}
      router={router}
      onLongPress={() => handleLongPress(item.id)}
    />
  );

  return (
    <View>
      <Text
        style={[globalStyles.sectionTitle, { marginTop: 28, marginBottom: 10 }]}
      >
        {rowTitle}
      </Text>
      <FlatList
        ref={flatListRef}
        horizontal
        data={movies}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: CARD_GAP,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  titleContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  logo: {
    width: "80%",
    height: 50,
    alignSelf: "flex-start",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
