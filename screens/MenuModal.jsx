// MenuModal.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { logoutUser } from "../utils/authHelpers";
import LinearGradient from "react-native-linear-gradient";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75; // 75% screen width for a premium look
const scale = width / 400;

export default function MenuModal({ visible, setVisible, user, navigation }) {
  const slideAnim = React.useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const [logoutModalVisible, setLogoutModalVisible] = React.useState(false);
  const logoutScaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigation = (screen) => {
    setVisible(false);
    setTimeout(() => {
      navigation.navigate(screen);
    }, 200);
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
    Animated.spring(logoutScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    setVisible(false);
    setTimeout(() => {
      logoutUser(navigation);
    }, 200);
  };

  const cancelLogout = () => {
    Animated.timing(logoutScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setLogoutModalVisible(false));
  };

  const menuItems = [
    { id: "home", label: "Home", icon: "grid-outline", screen: "Home", color: "#FF2B5C" },
    { id: "faq", label: "FAQ Support", icon: "help-buoy-outline", screen: "FAQ", color: "#FF2B5C" },
    { id: "invite", label: "Refer & Earn", icon: "gift-outline", screen: "InviteFriends", color: "#FF2B5C" },
    { id: "personal", label: "My Profile", icon: "person-outline", screen: "Profile", color: "#FF2B5C" },
  ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onShow={() => { }} // Optional: trigger extra things on open
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Cinematic Backdrop Overlay */}
          <Pressable
            style={styles.overlay}
            onPress={() => setVisible(false)}
          />

          {/* Premium Sidebar */}
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* IMMERSIVE BRAND HEADER */}
            <LinearGradient
              colors={["#FF2B5C", "#FF6B8B"]}
              style={styles.sidebarHeader}
            >
              <View style={styles.headerTop}>
                <View style={styles.userIconCircle}>
                  <Ionicons name="person" size={28} color="#FF2B5C" />
                </View>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeIconBtn}>
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.headerInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.greetingText}>Hello,</Text>
                    <Text style={styles.userNameText} numberOfLines={1}>
                      {user?.full_name ? user.full_name.split(" ")[0] : "Guest"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.supportIconBtn}
                    onPress={() => handleNavigation("HelpCenter")}
                  >
                    <Ionicons name="headset" size={26} color="#000000" />
                    <Text style={styles.supportBadgeText}>SUPPORT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            {/* REFINED MENU LIST */}
            <View style={styles.menuList}>
              <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Main Navigation</Text>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => handleNavigation(item.screen)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: item.color + "15" }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <View style={styles.chevronBox}>
                      <Ionicons name="chevron-forward" size={16} color="#DDD" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              {/* AUTH SECTION */}
              <View style={styles.listSection}>
                {user ? (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.logoutItem]}
                    onPress={handleLogout}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#EF444415" }]}>
                      <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    </View>
                    <Text style={[styles.menuLabel, { color: "#EF4444" }]}>Sign Out</Text>
                    <View style={styles.chevronBox}>
                      <Ionicons name="chevron-forward" size={16} color="#FFDADA" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setVisible(false);
                      setTimeout(() => navigation.replace("Login"), 200);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: "#FF2B5C15" }]}>
                      <Ionicons name="log-in-outline" size={22} color="#FF2B5C" />
                    </View>
                    <Text style={styles.menuLabel}>Sign In</Text>
                    <View style={styles.chevronBox}>
                      <Ionicons name="chevron-forward" size={16} color="#DDD" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* SIDEBAR FOOTER */}
            <View style={styles.sidebarFooter}>
              <Text style={styles.footerBrand}>ZingBite</Text>
              <Text style={styles.footerVersion}>v 1.0.4 Premium</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* PREMIUM LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.logoutOverlay}>
          <Animated.View style={[
            styles.logoutCard,
            { transform: [{ scale: logoutScaleAnim }] }
          ]}>
            <LinearGradient
              colors={["#FFFFFF", "#FFF5F5"]}
              style={styles.logoutContent}
            >
              <View style={[styles.logoutIconCircle, { backgroundColor: 'rgba(255, 43, 92, 0.1)', borderColor: 'rgba(255, 43, 92, 0.2)' }]}>
                <Ionicons name="log-out" size={36 * scale} color="#FF2B5C" />
              </View>

              <Text style={styles.logoutTitle}>Sign Out?</Text>
              <Text style={styles.logoutMsg}>
                Are you sure you want to sign out? You'll need to sign back in to place new orders.
              </Text>

              <View style={styles.logoutActionRow}>
                <TouchableOpacity
                  style={styles.cancelLogoutBtn}
                  onPress={cancelLogout}
                >
                  <Text style={styles.cancelLogoutText}>Stay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmLogoutBtn}
                  onPress={confirmLogout}
                >
                  <LinearGradient
                    colors={["#FF2B5C", "#FF6B8B"]}
                    style={styles.confirmLogoutGrad}
                  >
                    <Text style={styles.confirmLogoutText}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  sidebarHeader: {
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingHorizontal: 25,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  closeIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerInfo: {
    marginTop: 20,
  },
  supportIconBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  supportBadgeText: {
    fontSize: 9,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    color: '#000',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 16,
    fontFamily: "PoppinsMedium",
    color: "rgba(255,255,255,0.9)",
  },
  userNameText: {
    fontSize: 22,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
    marginTop: 2,
  },
  menuList: {
    flex: 1,
    paddingTop: 20,
  },
  listSection: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "PoppinsBold",
    color: "#AAA",
    marginLeft: 10,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    color: "#333",
  },
  chevronBox: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 15,
    marginHorizontal: 25,
  },
  logoutItem: {
    marginTop: 5,
  },
  sidebarFooter: {
    paddingVertical: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F8F8F8",
  },
  footerBrand: {
    fontSize: 14,
    fontFamily: "PoppinsBold",
    color: "#DDD",
    letterSpacing: 2,
  },
  footerVersion: {
    fontSize: 10,
    fontFamily: "PoppinsMedium",
    color: "#EEE",
    marginTop: 4,
  },

  /* LOGOUT MODAL STYLES */
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutCard: {
    width: "80%",
    borderRadius: 25,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  logoutContent: {
    padding: 25,
    alignItems: "center",
  },
  logoutIconCircle: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 35 * scale,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  logoutTitle: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsBold",
    color: "#1F2937",
    marginBottom: 10,
  },
  logoutMsg: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20 * scale,
  },
  logoutActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  cancelLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelLogoutText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#4B5563",
  },
  confirmLogoutBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmLogoutGrad: {
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmLogoutText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFF",
  },
});
