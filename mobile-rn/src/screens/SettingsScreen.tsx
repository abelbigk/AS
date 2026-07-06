import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Appbar,
  List,
  Button,
  Divider,
  Text,
} from 'react-native-paper';
import { authStore } from '../store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SettingsScreen() {
  const { user, logout } = authStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account
        </Text>
        <List.Section style={styles.section}>
          <List.Item
            title="Username"
            description={user?.username}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
          {user?.email && (
            <List.Item
              title="Email"
              description={user.email}
              left={(props) => <List.Icon {...props} icon="email" />}
            />
          )}
          {user?.name && (
            <List.Item
              title="Name"
              description={user.name}
              left={(props) => <List.Icon {...props} icon="person" />}
            />
          )}
          <List.Item
            title="Role"
            description={user?.role}
            left={(props) => <List.Icon {...props} icon="shield" />}
          />
        </List.Section>

        <Divider style={styles.divider} />

        {/* App Section */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          App
        </Text>
        <List.Section style={styles.section}>
          <List.Item
            title="Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Feedback"
            description="Send us your feedback"
            left={(props) => <List.Icon {...props} icon="message" />}
            onPress={() => {
              // TODO: Implement feedback
            }}
          />
        </List.Section>

        <Divider style={styles.divider} />

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Button
            mode="contained"
            buttonColor="#dc3545"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  dangerZone: {
    marginTop: 32,
    gap: 12,
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
});
