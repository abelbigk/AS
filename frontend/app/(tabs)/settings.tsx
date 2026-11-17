import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  User,
  Moon,
  Sun,
  Lock,
  ChevronRight,
  LogOut,
  Monitor,
  MapPin,
  Calendar,
  Clock,
  Shield,
  X,
  Users,
} from "lucide-react-native";
import { trpc } from "../../src/lib/trpc";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { SETTINGS_DARK_IMAGE, SETTINGS_LIGHT_IMAGE } from "../../src/lib/constants";
import { ContentCard, type ContentItem } from "../../src/components/ContentCard";
import { CategorizeContentModal } from "../../src/components/CategorizeContentModal";
import { ContentDetailModal } from "../../src/components/ContentDetailModal";
import { DropdownMenu } from "../../src/components/DropdownMenu";
import { AppDialogRenderer, useAppDialog } from "../../src/components/AppDialog";
import { AppToastRenderer, useAppToast } from "../../src/components/AppToast";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, colors } = useTheme();
  const { user, logout } = useAuth();
  const { dialogState, hide, showAlert, showConfirm } = useAppDialog();
  const { toastState, showToast } = useAppToast();

  const [pwExpanded, setPwExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Categorize content modal state
  const [contentToCategorize, setContentToCategorize] = useState<ContentItem | null>(null);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

  // User detail modal state (Admin)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<{
    id: number;
    username: string;
    name?: string | null;
    role: string;
    createdAt?: string | Date | null;
    lastSignedIn?: string | Date | null;
  } | null>(null);

  const isAdmin = user?.role === "admin";

  // Queries
  const { data: uncategorizedContent = [], isLoading: uncategorizedLoading } =
    trpc.content.listUncategorized.useQuery();

  const { data: allUsers = [], isLoading: usersLoading } = trpc.users.list.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const notify = (title: string, msg: string) => {
    if (title === "Success") {
      showToast(msg, "success");
    } else if (title === "Error") {
      showToast(msg, "error");
    } else {
      showAlert(title, msg);
    }
  };

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      notify("Success", "Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwExpanded(false);
    },
    onError: (err) => {
      notify("Error", err.message || "Failed to change password.");
    },
  });

  const handleChangePassword = () => {
    if (!currentPw || !newPw || !confirmPw) {
      notify("Validation", "Please fill in all password fields.");
      return;
    }
    if (newPw !== confirmPw) {
      notify("Validation", "New passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      notify("Validation", "New password must be at least 6 characters.");
      return;
    }
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const handleLogout = async () => {
    showConfirm({
      title: "Log Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Log Out",
      destructive: true,
      onConfirm: async () => {
        await logout();
        router.replace("/login");
      },
    });
  };

  const formatUserDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "Never";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateVal);
    }
  };

  const bgImage = theme === "dark" ? SETTINGS_DARK_IMAGE : SETTINGS_LIGHT_IMAGE;
  const overlayColor =
    theme === "dark" ? "rgba(10,10,10,0.55)" : "rgba(255,255,255,0.65)";

  const glassCard = {
    backgroundColor: colors.glassBg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  } as const;

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  } as const;

  return (
    <View style={styles.container}>
      {/* Background with blur */}
      <Image
        source={{ uri: bgImage }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={Platform.OS !== "web" ? 25 : undefined}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropOverlay,
          { backgroundColor: overlayColor },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 24 : 12),
            paddingBottom: insets.bottom + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {/* Page title */}
          <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

          {/* User profile card */}
          <View style={glassCard}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <User size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {user?.username ?? "Guest User"}
                </Text>
              </View>
            </View>
          </View>

          {/* Theme card */}
          <Text style={[styles.sectionHeader, { color: colors.textSubtle }]}>APPEARANCE</Text>
          <View style={glassCard}>
            <View style={styles.themeRow}>
              <Pressable
                style={[
                  styles.themeBtn,
                  theme === "dark" && styles.themeBtnActive,
                ]}
                onPress={() => setTheme("dark")}
              >
                <Moon
                  size={18}
                  color={theme === "dark" ? "#000000" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: theme === "dark" ? "#000000" : colors.textMuted },
                  ]}
                >
                  Dark Mode
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.themeBtn,
                  theme === "light" && styles.themeBtnActive,
                ]}
                onPress={() => setTheme("light")}
              >
                <Sun
                  size={18}
                  color={theme === "light" ? "#000000" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: theme === "light" ? "#000000" : colors.textMuted },
                  ]}
                >
                  Light Mode
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Uncategorized Content Section */}
          <Text style={[styles.sectionHeader, { color: colors.textSubtle }]}>
            CONTENTS NOT CATEGORIZED
          </Text>
          <View style={glassCard}>
            <Text style={[styles.uncategorizedSub, { color: colors.textMuted }]}>
              These items were removed from their categories but not deleted. Tap them to assign them to new categories.
            </Text>

            {uncategorizedLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : uncategorizedContent.length > 0 ? (
              <View style={styles.twoColumnGrid}>
                {/* Left column */}
                <View style={styles.gridColumn}>
                  {uncategorizedContent
                    .filter((_, i) => i % 2 === 0)
                    .map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item as any}
                        onPress={() => setContentToCategorize(item as any)}
                      />
                    ))}
                </View>
                {/* Right column */}
                <View style={styles.gridColumn}>
                  {uncategorizedContent
                    .filter((_, i) => i % 2 === 1)
                    .map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item as any}
                        onPress={() => setContentToCategorize(item as any)}
                      />
                    ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyUncategorized}>
                <Monitor size={28} color={colors.textSubtle} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyUncategorizedText, { color: colors.textMuted }]}>
                  All your contents are neatly categorized
                </Text>
              </View>
            )}
          </View>

          {/* Admin Users Section */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSubtle }]}>
                USERS
              </Text>
              <View style={glassCard}>
                {usersLoading ? (
                  <View style={{ paddingVertical: 18, alignItems: "center" }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : allUsers.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {allUsers.map((u: any) => (
                      <DropdownMenu
                        key={u.id}
                        align="right"
                        items={[
                          {
                            label: "Location",
                            icon: MapPin,
                            onPress: () => {
                              router.push(
                                `/loc?userId=${u.id}&username=${encodeURIComponent(
                                  u.username
                                )}`
                              );
                            },
                          },
                        ]}
                        trigger={(open) => (
                          <Pressable
                            style={({ pressed }) => [
                              styles.userListItem,
                              {
                                backgroundColor:
                                  theme === "dark"
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(0,0,0,0.03)",
                                borderColor:
                                  theme === "dark"
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.08)",
                                opacity: pressed ? 0.75 : 1,
                              },
                            ]}
                            onPress={() => setSelectedUserForDetail(u)}
                            onLongPress={open}
                            delayLongPress={350}
                            {...Platform.select({
                              web: {
                                onContextMenu: (e: any) => {
                                  e.preventDefault();
                                  open();
                                },
                              } as any,
                            })}
                          >
                            <View
                              style={[
                                styles.userListAvatar,
                                {
                                  backgroundColor:
                                    theme === "dark"
                                      ? "rgba(255,255,255,0.12)"
                                      : "rgba(0,0,0,0.08)",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.userListAvatarText,
                                  { color: colors.text },
                                ]}
                              >
                                {(u.name || u.username || "U")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.userListName, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {u.name || u.username}
                              </Text>
                              <Text
                                style={[
                                  styles.userListUsername,
                                  { color: colors.textMuted },
                                ]}
                                numberOfLines={1}
                              >
                                @{u.username}
                              </Text>
                            </View>
                            <ChevronRight size={18} color={colors.textSubtle} />
                          </Pressable>
                        )}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={{ paddingVertical: 14, alignItems: "center" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                      No users found
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Account card */}
          <Text style={[styles.sectionHeader, { color: colors.textSubtle }]}>ACCOUNT</Text>
          <View style={glassCard}>
            <Pressable
              style={styles.settingsRow}
              onPress={() => setPwExpanded(!pwExpanded)}
            >
              <Lock size={18} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                Change Password
              </Text>
              <ChevronRight
                size={18}
                color={colors.textMuted}
                style={{
                  transform: [{ rotate: pwExpanded ? "90deg" : "0deg" }],
                }}
              />
            </Pressable>

            {/* Inline change-password form */}
            {pwExpanded && (
              <View style={{ marginTop: 16 }}>
                <TextInput
                  style={inputStyle}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Current password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <TextInput
                  style={inputStyle}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="New password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <TextInput
                  style={inputStyle}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    { opacity: pressed || changePassword.isPending ? 0.75 : 1 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={changePassword.isPending}
                >
                  <Text style={styles.submitButtonText}>
                    {changePassword.isPending
                      ? "Changing..."
                      : "Change Password"}
                  </Text>
                </Pressable>
              </View>
            )}

            <View
              style={[
                styles.divider,
                { backgroundColor: colors.border, marginVertical: 16 },
              ]}
            />

            {/* Logout row */}
            <Pressable style={styles.settingsRow} onPress={handleLogout}>
              <LogOut size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: "#EF4444" }]}>
                  Log Out
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                  Sign out of your account
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Categorize Content Modal */}
      <CategorizeContentModal
        content={contentToCategorize}
        visible={!!contentToCategorize}
        onClose={() => setContentToCategorize(null)}
      />

      {/* Content Detail Viewer */}
      <ContentDetailModal
        item={activeItem}
        visible={!!activeItem}
        onClose={() => setActiveItem(null)}
      />

      {/* User Detail Modal */}
      <Modal
        visible={!!selectedUserForDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUserForDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedUserForDetail(null)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme === "dark" ? "#161618" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                User Details
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedUserForDetail(null)}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {selectedUserForDetail && (
              <View style={styles.modalBody}>
                <View style={styles.modalAvatarRow}>
                  <View
                    style={[
                      styles.modalAvatarBig,
                      {
                        backgroundColor:
                          theme === "dark"
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalAvatarBigText,
                        { color: colors.text },
                      ]}
                    >
                      {(
                        selectedUserForDetail.name ||
                        selectedUserForDetail.username ||
                        "U"
                      )
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.modalUserName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedUserForDetail.name ||
                        selectedUserForDetail.username}
                    </Text>
                    <Text
                      style={[
                        styles.modalUserHandle,
                        { color: colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      @{selectedUserForDetail.username}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.modalInfoList,
                    {
                      borderColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoLabelGroup}>
                      <Shield size={16} color={colors.textMuted} />
                      <Text
                        style={[
                          styles.modalInfoLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Role
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.modalInfoValue,
                        { color: colors.text, textTransform: "capitalize" },
                      ]}
                    >
                      {selectedUserForDetail.role}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoLabelGroup}>
                      <Calendar size={16} color={colors.textMuted} />
                      <Text
                        style={[
                          styles.modalInfoLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Created
                      </Text>
                    </View>
                    <Text
                      style={[styles.modalInfoValue, { color: colors.text }]}
                    >
                      {formatUserDate(selectedUserForDetail.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoLabelGroup}>
                      <Clock size={16} color={colors.textMuted} />
                      <Text
                        style={[
                          styles.modalInfoLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Last Active
                      </Text>
                    </View>
                    <Text
                      style={[styles.modalInfoValue, { color: colors.text }]}
                    >
                      {formatUserDate(selectedUserForDetail.lastSignedIn)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.locationActionBtn,
                    {
                      backgroundColor: colors.accent || "#3B82F6",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => {
                    const u = selectedUserForDetail;
                    setSelectedUserForDetail(null);
                    router.push(
                      `/loc?userId=${u.id}&username=${encodeURIComponent(
                        u.username
                      )}`
                    );
                  }}
                >
                  <MapPin size={18} color="#FFFFFF" />
                  <Text style={styles.locationActionBtnText}>
                    View Location History
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AppDialogRenderer {...dialogState} onHide={hide} />
      <AppToastRenderer {...toastState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  backdropOverlay: {
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      } as any,
    }),
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  wrapper: {
    maxWidth: 672,
    width: "100%",
    alignSelf: "center",
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
    paddingLeft: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "transparent",
  },
  themeBtnActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  themeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uncategorizedSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  gridColumn: {
    flex: 1,
  },
  emptyUncategorized: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyUncategorizedText: {
    fontSize: 13,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  submitButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  userListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  userListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  userListAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  userListName: {
    fontSize: 15,
    fontWeight: "600",
  },
  userListUsername: {
    fontSize: 13,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      } as any,
      default: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 18,
  },
  modalAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  modalAvatarBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarBigText: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalUserName: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalUserHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  modalInfoList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalInfoLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalInfoLabel: {
    fontSize: 14,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  locationActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  locationActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
