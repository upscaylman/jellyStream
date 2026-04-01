import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Home } from "@/icons/Home";
import { useAuthStore } from "@/src/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

// Helper component for cross-platform icons
function TabIcon({
  ionIcon,
  color,
}: {
  ionIcon: "person" | "home-sharp" | "play-square";
  color: string;
}) {
  return <TabBarIcon name={ionIcon} color={color} />;
}

// Icône profil avec initiale du user Jellyfin
function ProfileImage({ focused }: { focused: boolean }) {
  const userName = useAuthStore((s) => s.userName);

  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        opacity: focused ? 1 : 0.5,
        borderWidth: 2,
        borderColor: focused ? "white" : "transparent",
        backgroundColor: "#E50914",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ExpoImage
        source={{
          uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName ?? "U")}&background=E50914&color=fff&size=48`,
        }}
        style={{ width: 20, height: 20, borderRadius: 2 }}
        cachePolicy="memory-disk"
      />
    </View>
  );
}

export const TAB_SCREENS = [
  {
    name: "index",
    title: "Accueil",
    icon: ({ color, focused }: { color: string; focused: boolean }) => (
      <Home color={color} isActive={focused} />
    ),
  },
  {
    name: "direct-tv",
    title: "Direct TV",
    icon: ({ color }: { color: string }) => (
      <Ionicons name="tv-outline" size={24} color={color} />
    ),
  },
  {
    name: "new",
    title: "New & Hot",
    icon: ({ color, focused }: { color: string; focused: boolean }) => (
      <ExpoImage
        source={
          focused
            ? require("../../assets/images/replace-these/new-netflix.png")
            : require("../../assets/images/replace-these/new-netflix-outline.png")
        }
        style={{ width: 24, height: 24 }}
        cachePolicy="memory-disk"
        contentFit="contain"
      />
    ),
  },
  {
    name: "search",
    title: "Rechercher",
    icon: ({ color }: { color: string }) => (
      <Ionicons name="search-outline" size={24} color={color} />
    ),
  },
  {
    name: "(profile)/profile",
    title: "Mon JellyStream",
    icon: ({ focused }: { focused: boolean }) => (
      <ProfileImage focused={focused} />
    ),
  },
];

const styles = StyleSheet.create({
  blurView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
});

export default function TabLayout() {
  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#B3B3B3",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "transparent",
        },
        tabBarBackground: () => (
          <BlurView tint="dark" intensity={99} style={styles.blurView} />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 2,
        },
        tabBarButton: (props) => (
          <Pressable
            {...props}
            onPress={(e) => {
              handleTabPress();
              props.onPress?.(e);
            }}
          />
        ),
      }}
    >
      {TAB_SCREENS.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: screen.icon,
          }}
        />
      ))}
      <Tabs.Screen
        name="movie/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="films"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="series-list"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
