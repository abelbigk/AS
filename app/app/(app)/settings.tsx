import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login' as any);
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{user?.username || 'N/A'}</Text>
            </View>

            {user?.name && (
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{user.name}</Text>
              </View>
            )}

            {user?.email && (
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            )}

            {user?.role && (
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.label}>Role</Text>
                <Text style={styles.value}>{user.role}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>App Name</Text>
              <Text style={styles.value}>AS</Text>
            </View>

            <View style={[styles.cardRow, styles.cardRowBorder]}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>1.0.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
