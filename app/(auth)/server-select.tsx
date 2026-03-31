// Écran de sélection du serveur Jellyfin
import { jellyfin } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ServerSelectScreen() {
  const savedServerUrl = useAuthStore((s) => s.serverUrl);
  const [serverUrl, setServerUrl] = useState(savedServerUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setServer = useAuthStore((s) => s.setServer);
  const router = useRouter();

  const handleConnect = async () => {
    let trimmed = serverUrl.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setError("Entrez l'adresse de votre serveur");
      return;
    }

    // Corriger les typos courantes dans le protocole (;  au lieu de :)
    trimmed = trimmed.replace(/^https?[;]/i, (match) =>
      match.replace(";", ":"),
    );

    // Ajouter https:// par défaut si pas de protocole valide
    if (!/^https?:\/\//i.test(trimmed)) {
      // Retirer tout protocole malformé résiduel
      trimmed = trimmed.replace(/^[a-z]+[:;]\/*/i, "");
      trimmed = `https://${trimmed}`;
    }

    setLoading(true);
    setError(null);

    try {
      // Essayer d'abord la discovery SDK
      const servers =
        await jellyfin.discovery.getRecommendedServerCandidates(trimmed);
      const best = jellyfin.discovery.findBestServer(servers);

      if (best) {
        // Récupérer le nom du serveur
        try {
          const res = await fetch(`${best.address}/System/Info/Public`);
          if (res.ok) {
            const info = await res.json();
            setServer(best.address, info.ServerName ?? undefined);
          } else {
            setServer(best.address);
          }
        } catch {
          setServer(best.address);
        }
        router.replace("/(auth)/login");
        return;
      }
    } catch {
      // La discovery peut échouer (CORS, timeout) — on tente un fallback direct
    }

    try {
      // Fallback : tester directement le endpoint public du serveur
      const response = await fetch(`${trimmed}/System/Info/Public`);
      if (response.ok) {
        const info = await response.json();
        if (info.ServerName || info.Id) {
          setServer(trimmed, info.ServerName ?? undefined);
          router.replace("/(auth)/login");
          return;
        }
      }
      setError("Serveur Jellyfin introuvable à cette adresse");
    } catch {
      setError(
        "Impossible de contacter le serveur. Vérifiez l'adresse et votre connexion.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logo}>JellyStream</Text>
        </View>
        <Text style={styles.subtitle}>
          Connectez-vous à votre serveur Jellyfin
        </Text>

        <TextInput
          style={styles.input}
          placeholder="https://jellyfin.exemple.com"
          placeholderTextColor="#808080"
          value={serverUrl}
          onChangeText={(text) => {
            setServerUrl(text);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  logo: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#E50914",
  },
  subtitle: {
    fontSize: 16,
    color: "#B3B3B3",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
  },
  error: {
    color: "#E50914",
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
