import { TAB_SCREENS } from "@/app/(tabs)/_layout";
import { TabScreenWrapper } from "@/components/TabScreenWrapper";
import { CastIcon } from "@/icons/CastIcon";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DownloadsScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const currentTabIndex = TAB_SCREENS.findIndex(
    (screen) => screen.name === "(profile)/profile",
  );
  const activeTabIndex = TAB_SCREENS.findIndex(
    (screen) =>
      pathname === `/${screen.name}` ||
      (screen.name === "index" && pathname === "/"),
  );

  const slideDirection = activeTabIndex > currentTabIndex ? "right" : "left";
  const isActive = pathname === "/downloads";

  return (
    <TabScreenWrapper isActive={isActive} slideDirection={slideDirection}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Downloads</Text>
          <TouchableOpacity style={styles.castButton}>
            <CastIcon size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="arrow-down" size={70} color="#6e6e6e" />
          </View>

          <Text style={styles.heading}>Never be without Jellystream</Text>

          <Text style={styles.description}>
            Download shows and movies so you'll never be without something to
            watch — even when you're offline.
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>See What You Can Download</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  castButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 4,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
