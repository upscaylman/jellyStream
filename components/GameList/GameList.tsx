import { useWebDragScroll } from "@/hooks/useWebDragScroll";
import { styles } from "@/styles";
import { Movie, MovieRow } from "@/types/movie";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

const GameItem = ({ item, router }: { item: Movie; router: any }) => (
  <Pressable
    onPress={() =>
      router.push({
        pathname: "/(tabs)/movie/[id]",
        params: { id: item.id },
      })
    }
    style={styles.contentItem}
  >
    <Image
      source={{ uri: item.imageUrl }}
      style={[styles.thumbnail, { width: 120, aspectRatio: 1 }]}
    />
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.type}>{item.type}</Text>
  </Pressable>
);

export function GameList({ rowTitle, movies }: MovieRow) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  useWebDragScroll(flatListRef);

  return (
    <View style={styles.movieRow}>
      <Text style={styles.sectionTitle}>{rowTitle}</Text>
      <FlatList
        ref={flatListRef}
        horizontal
        data={movies}
        renderItem={(props) => <GameItem {...props} router={router} />}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentList}
      />
    </View>
  );
}
