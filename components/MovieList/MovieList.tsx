import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import { ItemPreviewSheet } from "@/components/BottomSheet/ItemPreviewSheet";
import { RankNumber } from "@/components/ui/RankNumber";
import { HoverableView } from "@/components/ui/VisionContainer";
import { useVisionOS } from "@/hooks/useVisionOS";
import { useWebDragScroll } from "@/hooks/useWebDragScroll";
import { styles } from "@/styles";
import { Movie, MovieRow } from "@/types/movie";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const NumberBackground = ({ number }: { number: number }) => {
  return (
    <View style={styles.numberContainer}>
      <View style={[styles.numberText, number === 10 && { left: -70 }]}>
        <RankNumber number={number} size={95} />
      </View>
    </View>
  );
};

const MovieItem = ({
  item,
  router,
  index,
  isTop10,
  onLongPress,
}: {
  item: Movie;
  router: any;
  index: number;
  isTop10: boolean;
  onLongPress?: () => void;
}) => (
  <Pressable
    onPress={() =>
      router.push({
        pathname: "/movie/[id]",
        params: { id: item.id },
      })
    }
    onLongPress={onLongPress}
    delayLongPress={400}
    style={[styles.contentItem, isTop10 && styles.top10Item]}
  >
    {isTop10 && <NumberBackground number={(index % 10) + 1} />}
    <View
      style={[
        {
          position: "relative",
          borderRadius: isTop10 ? 4 : 6,
          overflow: "hidden",
        },
      ]}
    >
      {item.imageUrl ? (
        <ExpoImage
          source={{ uri: item.imageUrl }}
          style={[
            styles.thumbnail,
            isTop10 && styles.top10Thumbnail,
            { borderRadius: 0 },
          ]}
          cachePolicy="memory-disk"
          transition={200}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.thumbnail,
            isTop10 && styles.top10Thumbnail,
            { backgroundColor: "#2a2a2a", borderRadius: 0 },
          ]}
        />
      )}
      {item.isTopRated && (
        <View style={topRatedStyles.iconContainer}>
          <ExpoImage
            source={require("../../assets/images/top.png")}
            style={topRatedStyles.icon}
            cachePolicy="memory-disk"
            contentFit="contain"
          />
        </View>
      )}
    </View>
    {item.badge && (
      <View
        style={[
          badgeStyles.badgeContainer,
          isTop10 && badgeStyles.badgeContainerTop10,
        ]}
      >
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText} numberOfLines={1}>
            {item.badge}
          </Text>
        </View>
      </View>
    )}
  </Pressable>
);

export function MovieList({
  rowTitle,
  movies,
  type,
  showAll,
  showAllRoute,
}: MovieRow) {
  const router = useRouter();
  const isTop10 = type === "top_10";
  const { isVisionOS } = useVisionOS();
  const flatListRef = useRef<FlatList>(null);
  const { openSheet } = useBottomSheet();
  useWebDragScroll(flatListRef);

  const handleLongPress = (itemId: string) => {
    openSheet({
      content: <ItemPreviewSheet itemId={itemId} />,
      maxHeight: 480,
    });
  };

  const renderItem = ({ item, index }) => (
    <HoverableView key={`${item.id}-${index}`}>
      <MovieItem
        item={item}
        router={router}
        index={index}
        isTop10={isTop10}
        onLongPress={() => handleLongPress(item.id)}
      />
    </HoverableView>
  );

  return (
    <View style={isVisionOS ? styles.visionContainer : styles.container}>
      <View style={rowHeaderStyles.header}>
        <Text style={[styles.sectionTitle, rowHeaderStyles.headerTitle]}>
          {rowTitle}
        </Text>
        {showAll && (
          <Pressable
            style={rowHeaderStyles.showAll}
            onPress={() => router.push(showAllRoute ?? "/my-list")}
          >
            <Text style={rowHeaderStyles.showAllText}>Tout voir</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
      <FlatList
        ref={flatListRef}
        horizontal
        data={movies}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentList,
          isTop10 && styles.top10List,
        ]}
      />
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  badgeContainerTop10: {
    bottom: 16,
  },
  badge: {
    backgroundColor: "#E50914",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});

const topRatedStyles = StyleSheet.create({
  iconContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
  },
  icon: {
    width: 28,
    height: 28,
  },
});

const rowHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingRight: 12,
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 16,
  },
  headerTitle: {
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  showAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  showAllText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
