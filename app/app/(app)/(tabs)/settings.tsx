import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { authStore } from '../../../src/store/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);

  const handleLogout = async () => {
    try {
      await authStore.getState().logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Account Information</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={styles.label}>
              Username
            </Text>
            <Text variant="bodyMedium">{user?.username}</Text>
          </View>

          {user?.name && (
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.label}>
                Name
              </Text>
              <Text variant="bodyMedium">{user.name}</Text>
            </View>
          )}

          {user?.email && (
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.label}>
                Email
              </Text>
              <Text variant="bodyMedium">{user.email}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={styles.label}>
              Role
            </Text>
            <Text variant="bodyMedium">{user?.role}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Actions</Text>
          <Divider style={styles.divider} />

          <Button
            mode="contained-tonal"
            onPress={handleLogout}
            style={styles.button}
            textColor="#d32f2f"
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.appInfo}>
        <Text variant="labelSmall" style={styles.versionText}>
          AS v1.0.0
        </Text>
        <Text variant="labelSmall" style={styles.versionText}>
          Content Organizer
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#666',
  },
  button: {
    marginTop: 8,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  versionText: {
    color: '#999',
  },
});
