import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Switch, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';

function getTokenTimeRemaining(): string | null {
  try {
    // Note: In React Native, we'd get token from AsyncStorage, not localStorage
    // For now, return null as AsyncStorage is async
    return null;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const setThemeMutation = trpc.preferences.setTheme.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  useEffect(() => {
    setIsDarkMode(theme === 'dark');
  }, [theme]);

  const handleThemeToggle = (value: boolean) => {
    const newTheme = value ? 'dark' : 'light';
    setIsDarkMode(value);
    setTheme?.(newTheme);
    setThemeMutation.mutate(newTheme);
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const dynamicStyles = {
    textColor: isDarkMode ? '#fff' : '#000',
    backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
    borderColor: isDarkMode ? '#333' : '#f0f0f0',
    secondaryBg: isDarkMode ? '#2a2a2a' : '#f9f9f9',
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: dynamicStyles.backgroundColor }]}>
      {/* Theme Section */}
      <View style={[styles.section, { borderBottomColor: dynamicStyles.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: dynamicStyles.textColor }]}>Theme</Text>
        <View style={styles.themeToggleRow}>
          <View style={styles.themeInfo}>
            <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={20} color={isDarkMode ? '#ffd700' : '#ffb700'} />
            <Text style={[styles.label, { color: dynamicStyles.textColor }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={handleThemeToggle}
            disabled={setThemeMutation.isPending}
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={[styles.section, { borderBottomColor: dynamicStyles.borderColor }]}>
        <Text style={[styles.sectionTitle, { color: dynamicStyles.textColor }]}>Account</Text>
        <View style={[styles.infoItem, { borderBottomColor: dynamicStyles.borderColor }]}>
          <Text style={styles.label}>Username</Text>
          <Text style={[styles.value, { color: dynamicStyles.textColor }]}>{user?.username}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Name</Text>
          <Text style={[styles.value, { color: dynamicStyles.textColor }]}>{user?.name}</Text>
        </View>
      </View>

      {/* Change Password Section */}
      <TouchableOpacity
        style={[styles.optionButton, { backgroundColor: dynamicStyles.secondaryBg, borderColor: dynamicStyles.borderColor }]}
        onPress={() => setShowChangePassword(true)}
      >
        <Ionicons name="lock-closed-outline" size={20} color={dynamicStyles.textColor} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.optionTitle, { color: dynamicStyles.textColor }]}>Change Password</Text>
          <Text style={styles.optionDesc}>Update your password</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={dynamicStyles.textColor} />
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.button, { marginTop: 24 }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        transparent={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: dynamicStyles.backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicStyles.textColor }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color={dynamicStyles.textColor} />
              </TouchableOpacity>
            </View>

            {changePasswordMutation.isPending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}

            {!changePasswordMutation.isPending && (
              <View style={styles.modalFormContainer}>
                <TextInput
                  style={[styles.input, { color: dynamicStyles.textColor, borderColor: dynamicStyles.borderColor }]}
                  placeholder="Current Password"
                  placeholderTextColor={isDarkMode ? '#999' : '#ccc'}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />

                <TextInput
                  style={[styles.input, { color: dynamicStyles.textColor, borderColor: dynamicStyles.borderColor }]}
                  placeholder="New Password"
                  placeholderTextColor={isDarkMode ? '#999' : '#ccc'}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                <TextInput
                  style={[styles.input, { color: dynamicStyles.textColor, borderColor: dynamicStyles.borderColor }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={isDarkMode ? '#999' : '#ccc'}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                  style={[styles.submitButton, changePasswordMutation.isPending && styles.submitButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                >
                  <Text style={styles.submitButtonText}>Change Password</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  optionButton: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalFormContainer: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
