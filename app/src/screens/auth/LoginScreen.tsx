import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/contexts/ThemeContext';

const DARK_IMAGE = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=80";

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setToken, setUser } = useAuthStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await setToken(data.token);
      setUser(data.user);
      setError(null);
    },
    onError: (error) => {
      setError(error.message || 'Login failed');
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setError(null);
      setIsRegistering(false);
      setPassword('');
      // Auto login after registration
      handleLogin();
    },
    onError: (error) => {
      setError(error.message || 'Registration failed');
    },
  });

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (isRegistering) {
      registerMutation.mutate({
        username: username.trim(),
        password,
        name: username.trim(),
      });
    } else {
      loginMutation.mutate({
        username: username.trim(),
        password,
      });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const bgImage = isDark ? DARK_IMAGE : LIGHT_IMAGE;

  return (
    <ImageBackground 
      source={{ uri: bgImage }}
      style={styles.backgroundImage}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)' }]} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.spacer} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
              {isRegistering ? 'Create Account' : 'Welcome'}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
              {isRegistering ? 'Register to get started' : 'Sign in to continue'}
            </Text>
          </View>

          <View style={[
            styles.formCard,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)' }
          ]}>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#d32f2f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#333' }]}>
                Username
              </Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
              ]}>
                <Ionicons name="person" size={18} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder="Enter username"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  value={username}
                  onChangeText={setUsername}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#333' }]}>
                Password
              </Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
              ]}>
                <Ionicons name="lock-closed" size={18} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder="Enter password"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                  autoCapitalize="none"
                />
              </View>
              {isRegistering && (
                <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
                  Minimum 6 characters
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={isRegistering ? "person-add" : "log-in"} size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>
                    {isRegistering ? 'Create Account' : 'Sign In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Toggle Register/Login */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsRegistering(!isRegistering);
                setPassword('');
                setError(null);
              }}
              disabled={isLoading}
            >
              <Text style={[styles.toggleText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                {isRegistering
                  ? 'Already have an account? '
                  : "Don't have an account? "}
              </Text>
              <Text style={[styles.toggleTextBold, { color: isDark ? '#fff' : '#000' }]}>
                {isRegistering ? 'Sign in' : 'Register'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sessionNote}>
            <Ionicons name="time" size={14} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
            <Text style={[{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 12, marginLeft: 6 }]}>
              Session active for {isRegistering ? '1 year' : '7 days'}
            </Text>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  spacer: {
    height: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211,47,47,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleTextBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
