import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function useCachedResources() {
    const [isLoadingComplete, setLoadingComplete] = useState(false);

    useEffect(() => {
        async function loadResourcesAndDataAsync() {
            try {
                // Sur web, les icon fonts sont chargés via CSS @font-face dans +html.tsx
                // Sur natif, on les charge via Font.loadAsync
                const fonts: Record<string, any> = {
                    'arialic': require('../assets/fonts/arialic.ttf'),
                };
                if (Platform.OS !== 'web') {
                    Object.assign(fonts,
                        Ionicons.font,
                        MaterialIcons.font,
                        MaterialCommunityIcons.font,
                        FontAwesome.font,
                    );
                }
                await Font.loadAsync(fonts);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoadingComplete(true);
            }
        }

        loadResourcesAndDataAsync();
    }, []);

    return isLoadingComplete;
} 