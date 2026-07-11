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
} from 'react-native';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setToken, setUser } = useAuthStore();

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>
          {isRegistering ? 'Create Account' : 'Welcome'}
        </Text>
        <Text style={styles.subtitle}>
          {isRegistering ? 'Register to get started' : 'Sign in to continue'}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          editable={!isLoading}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
          autoCapitalize="none"
        />

        {isRegistering && (
          <Text style={styles.minLengthNote}>Minimum 6 characters</Text>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegistering ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsRegistering(!isRegistering);
            setPassword('');
            setError(null);
          }}
          disabled={isLoading}
        >
          <Text style={styles.toggleText}>
            {isRegistering
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sessionNote}>
          Session remains active for {isRegistering ? '1 year' : '7 days'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  minLengthNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  sessionNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
