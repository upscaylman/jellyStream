// Écran de login Jellyfin — username + password
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { api, serverUrl, login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Entrez votre nom d\'utilisateur');
      return;
    }
    if (!api || !serverUrl) {
      setError('Aucun serveur configuré');
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
        setError('Réponse d\'authentification invalide');
        setLoading(false);
        return;
      }

      login(serverUrl, token, userId, result.data.User?.Name ?? username);
      router.replace('/(tabs)');
    } catch {
      setError('Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.serverInfo}>{serverUrl}</Text>

        <TextInput
          style={styles.input}
          placeholder="Nom d'utilisateur"
          placeholderTextColor="#808080"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#808080"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Changer de serveur</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  serverInfo: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  error: {
    color: '#E50914',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#B3B3B3',
    fontSize: 14,
  },
});
