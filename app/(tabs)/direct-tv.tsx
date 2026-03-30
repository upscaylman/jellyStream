import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { TAB_SCREENS } from '@/app/(tabs)/_layout';
import { TabScreenWrapper } from '@/components/TabScreenWrapper';

export default function DirectTVScreen() {
    const pathname = usePathname();
    const isActive = pathname === '/direct-tv';
    const currentTabIndex = TAB_SCREENS.findIndex(screen => screen.name === 'direct-tv');
    const activeTabIndex = TAB_SCREENS.findIndex(screen =>
        pathname === `/${screen.name}` || (screen.name === 'index' && pathname === '/')
    );
    const slideDirection = activeTabIndex > currentTabIndex ? 'right' : 'left';

    return (
        <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.content}>
                    <Ionicons name="tv-outline" size={64} color="#333" />
                    <Text style={styles.title}>Direct TV</Text>
                    <Text style={styles.subtitle}>Bientôt disponible</Text>
                </View>
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#808080',
        fontSize: 16,
    },
});
