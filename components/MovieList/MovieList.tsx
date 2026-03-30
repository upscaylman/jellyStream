import React, { useRef } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { styles } from '@/styles';
import { Movie, MovieRow } from '@/types/movie';
import Svg, { Path } from 'react-native-svg';
import { useVisionOS } from '@/hooks/useVisionOS';
import { HoverableView } from '@/components/ui/VisionContainer';
import { useWebDragScroll } from '@/hooks/useWebDragScroll';

const NumberBackground = ({ number }: { number: number }) => {
    const num = (number).toString().padStart(2, '0');

    return (
        <View style={styles.numberContainer}>
            <Text style={[styles.numberText, {
                color: 'white',
                opacity: 0.15,
                fontSize: 200,
                fontFamily: 'arialic',
            }]}>{num}</Text>
        </View>
    );
};

const MovieItem = ({ item, router, index, isTop10 }: {
    item: Movie;
    router: any;
    index: number;
    isTop10: boolean;
}) => (
    <Pressable
        onPress={() => router.push({
            pathname: '/movie/[id]',
            params: { id: item.id }
        })}
        style={[
            styles.contentItem,
            isTop10 && styles.top10Item
        ]}
    >
        {isTop10 && <NumberBackground number={index + 1} />}
        {item.imageUrl ? (
            <ExpoImage
                source={{ uri: item.imageUrl }}
                style={[
                    styles.thumbnail,
                    isTop10 && styles.top10Thumbnail
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
                    { backgroundColor: '#2a2a2a' }
                ]}
            />
        )}
        {item.badge && (
            <View style={badgeStyles.badgeContainer}>
                <Text style={badgeStyles.badgeText} numberOfLines={1}>{item.badge}</Text>
            </View>
        )}
    </Pressable>
);

export function MovieList({ rowTitle, movies, type }: MovieRow) {
    const router = useRouter();
    const isTop10 = type === 'top_10';
    const { isVisionOS } = useVisionOS();
    const flatListRef = useRef<FlatList>(null);
    useWebDragScroll(flatListRef);

    const renderItem = ({ item, index }) => (
        <HoverableView key={`${item.id}-${index}`}>
            <MovieItem
                item={item}
                router={router}
                index={index}
                isTop10={isTop10}
            />
        </HoverableView>
    );

    return (
        <View style={isVisionOS ? styles.visionContainer : styles.container}>
            <Text style={styles.sectionTitle}>{rowTitle}</Text>
            <FlatList
                ref={flatListRef}
                horizontal
                data={movies}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.contentList,
                    isTop10 && styles.top10List
                ]}
            />
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badgeContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#E50914',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});