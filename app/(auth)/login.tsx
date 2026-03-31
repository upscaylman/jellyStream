// Écran de login JellyStream — style Netflix
import { useAuthStore } from "@/src/stores/authStore";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_WIDE = SCREEN_WIDTH > 600;

// Composant input avec label flottant style Netflix
function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  returnKeyType?: "next" | "go" | "done";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [focused, setFocused] = useState(false);
  const labelAnim = useSharedValue(value ? 1 : 0);

  const handleFocus = () => {
    setFocused(true);
    labelAnim.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      labelAnim.value = withTiming(0, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      });
    }
  };

  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(labelAnim.value, [0, 1], [18, 8]),
    fontSize: interpolate(labelAnim.value, [0, 1], [16, 11]),
  }));

  return (
    <View
      style={[styles.inputContainer, focused && styles.inputContainerFocused]}
    >
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        {label}
      </Animated.Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        selectionColor="#E50914"
      />
    </View>
  );
}

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const passwordRef = useRef<TextInput | null>(null);
  const { api, serverUrl, login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Veuillez saisir votre nom d'utilisateur.");
      return;
    }
    if (!api || !serverUrl) {
      setError(
        "Aucun serveur configuré. Veuillez d'abord sélectionner un serveur.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userApi = getUserApi(api);
      const result = await userApi.authenticateUserByName({
        authenticateUserByName: {
          Username: username.trim(),
          Pw: password,
        },
      });

      const token = result.data.AccessToken;
      const userId = result.data.User?.Id;

      if (!token || !userId) {
        setError("Réponse d'authentification invalide.");
        setLoading(false);
        return;
      }

      login(serverUrl, token, userId, result.data.User?.Name ?? username);
      router.replace("/(tabs)");
    } catch {
      setError("Mot de passe ou nom d'utilisateur incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Header avec logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>JELLYSTREAM</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Formulaire de connexion */}
          <View style={styles.formCard}>
            <Text style={styles.title}>
              Saisissez vos informations{"\n"}pour vous identifier
            </Text>

            {/* Erreur */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Inputs */}
            <FloatingInput
              label="Nom d'utilisateur"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <FloatingInput
              label="Mot de passe"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              inputRef={passwordRef}
            />

            {/* Bouton Continuer */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                loading && styles.buttonDisabled,
                pressed && !loading && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Continuer</Text>
              )}
            </Pressable>

            {/* Se souvenir de moi */}
            <View style={styles.rememberRow}>
              <Pressable
                style={styles.checkboxArea}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Se souvenir de moi</Text>
              </Pressable>

              <Pressable onPress={() => router.back()}>
                <Text style={styles.helpLink}>Obtenir de l'aide</Text>
              </Pressable>
            </View>

            {/* Serveur actuel */}
            <View style={styles.serverRow}>
              <Text style={styles.serverLabel}>Serveur : </Text>
              <Text style={styles.serverUrl} numberOfLines={1}>
                {serverUrl ?? "Non configuré"}
              </Text>
            </View>

            {/* Changer de serveur */}
            <Pressable
              style={styles.changeServerButton}
              onPress={() => router.back()}
            >
              <Text style={styles.changeServerText}>Changer de serveur</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Propulsé par <Text style={styles.footerHighlight}>Jellyfin</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 12,
    zIndex: 10,
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#E50914",
    letterSpacing: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: IS_WIDE ? 0 : 0,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 8,
    paddingHorizontal: IS_WIDE ? 68 : 24,
    paddingTop: 48,
    paddingBottom: 40,
    marginHorizontal: IS_WIDE ? SCREEN_WIDTH * 0.25 : 16,
    maxWidth: IS_WIDE ? 450 : undefined,
    alignSelf: IS_WIDE ? "center" : undefined,
    width: IS_WIDE ? 450 : undefined,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 28,
    lineHeight: 32,
  },
  errorBox: {
    backgroundColor: "#E87C03",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: "#333",
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
    height: 56,
    justifyContent: "flex-end",
  },
  inputContainerFocused: {
    borderColor: "#fff",
  },
  floatingLabel: {
    position: "absolute",
    left: 16,
    color: "#8C8C8C",
    zIndex: 1,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    fontSize: 16,
    color: "#fff",
  },
  button: {
    backgroundColor: "#E50914",
    borderRadius: 4,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    backgroundColor: "#C11119",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  rememberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  checkboxArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#737373",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  checkmark: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  rememberText: {
    color: "#B3B3B3",
    fontSize: 13,
  },
  helpLink: {
    color: "#B3B3B3",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
  },
  serverLabel: {
    color: "#737373",
    fontSize: 13,
  },
  serverUrl: {
    color: "#B3B3B3",
    fontSize: 13,
    flex: 1,
  },
  changeServerButton: {
    alignSelf: "flex-start",
  },
  changeServerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 24,
  },
  footerText: {
    color: "#737373",
    fontSize: 13,
  },
  footerHighlight: {
    color: "#00A4DC",
    fontWeight: "600",
  },
});
