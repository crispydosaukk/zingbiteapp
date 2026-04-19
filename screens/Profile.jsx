import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Clipboard from "@react-native-clipboard/clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import BottomBar from "./BottomBar.jsx";
import AppHeader from "./AppHeader";
import { AuthRequiredInline, AuthRequiredModal } from "./AuthRequired";
import { fetchProfile } from "../services/profileService";
import { getWalletSummary } from "../services/walletService";
import { getCart } from "../services/cartService";
import { getOrders } from "../services/orderService";
import { deleteAccount as apiDeleteAccount } from "../services/profileService";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function Profile({ navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItemsMap, setCartItemsMap] = useState({});

  const [userLocal, setUserLocal] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  // Premium Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("info");
  const alertScale = useRef(new Animated.Value(0)).current;

  // Premium Logout Modal State
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const logoutScaleAnim = useRef(new Animated.Value(0)).current;

  // Premium Delete Account Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const deleteScaleAnim = useRef(new Animated.Value(0)).current;
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        const parsed = stored ? JSON.parse(stored) : null;
        setUserLocal(parsed);

        if (!parsed) {
          setLoading(false);
          return;
        }

        // Cache first
        const [cachedProfile, cachedWallet] = await Promise.all([
          AsyncStorage.getItem("profile_cache"),
          AsyncStorage.getItem("wallet_summary_cache"),
        ]);

        if (cachedProfile && cachedWallet) {
          setProfile(JSON.parse(cachedProfile));
          setWallet(JSON.parse(cachedWallet));
          setLoading(false);
        }

        // Fetch fresh
        const [profileData, walletData, ordersData] = await Promise.all([
          fetchProfile(),
          getWalletSummary(),
          getOrders(parsed.id || parsed.customer_id)
        ]);

        if (profileData) {
          setProfile(profileData);
          AsyncStorage.setItem("profile_cache", JSON.stringify(profileData));
        }
        if (walletData) {
          setWallet(walletData);
          AsyncStorage.setItem("wallet_summary_cache", JSON.stringify(walletData));
        }
        if (ordersData && ordersData.status === 1) {
          const list = ordersData.data || [];
          setOrderCount(list.length);
        }
        setLoading(false);
      } catch (err) {
        console.log("Profile error", err);
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!userLocal || !isFocused) return;
    (async () => {
      const cid = userLocal.id ?? userLocal.customer_id;
      const res = await getCart(cid);
      if (res?.status === 1 && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach(item => {
          if (item.product_quantity > 0) map[item.product_id] = item.product_quantity;
        });
        setCartItemsMap(map);
      }
    })();
  }, [userLocal, isFocused]);

  const showPremiumAlert = (title, msg, type = "info") => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertType(type);
    setAlertVisible(true);
    Animated.spring(alertScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const hidePremiumAlert = () => {
    Animated.timing(alertScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setAlertVisible(false));
  };

  const copyReferralCode = () => {
    if (!profile?.referral_code) {
      showPremiumAlert("No referral code", "Please sign in to access your referral code.", "error");
      return;
    }
    Clipboard.setString(profile.referral_code);
    showPremiumAlert("Copied", "Referral code copied to clipboard ✨", "success");
  };

  const shareReferral = async () => {
    if (!profile?.referral_code) {
      showPremiumAlert("No referral code", "Please sign in to share your code.", "error");
      return;
    }
    try {
      await Share.share({
        message: `Join ZingBite using my code *${profile.referral_code}* and enjoy premium rewards! 🍛🔥`,
      });
    } catch (err) {
      console.log("Share error", err);
    }
  };

  const onRefresh = async () => {
    if (!userLocal) return;
    try {
      setRefreshing(true);
      const [profileData, walletData] = await Promise.all([fetchProfile(), getWalletSummary()]);
      setProfile(profileData);
      setWallet(walletData);

      const cid = userLocal.id ?? userLocal.customer_id;
      const res = await getCart(cid);
      if (res?.status === 1 && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach(item => {
          if (item.product_quantity > 0) map[item.product_id] = item.product_quantity;
        });
        setCartItemsMap(map);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const logout = () => {
    setLogoutModalVisible(true);
    Animated.spring(logoutScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await AsyncStorage.multiRemove(["token", "user", "profile_cache", "wallet_summary_cache"]);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const cancelLogout = () => {
    Animated.timing(logoutScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setLogoutModalVisible(false));
  };

  const showDeleteModal = () => {
    setDeleteModalVisible(true);
    Animated.spring(deleteScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const cancelDelete = () => {
    Animated.timing(deleteScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDeleteModalVisible(false));
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeleting(true);
      await apiDeleteAccount();
      setDeleteModalVisible(false);
      await AsyncStorage.multiRemove(["token", "user", "profile_cache", "wallet_summary_cache"]);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (err) {
      setDeleteModalVisible(false);
      showPremiumAlert("Error", "We couldn't process your request right now. Please try again later.", "error");
    } finally {
      setDeleting(false);
    }
  };



  const totalWallet = wallet
    ? (Number(wallet.wallet_balance || 0) + (wallet.loyalty_expiry_list || []).reduce((sum, i) => sum + Number(i.credit_value || 0), 0)).toFixed(2)
    : "0.00";

  return (
    <View style={styles.root}>
      {!userLocal ? (
        <>
          <AppHeader user={null} navigation={navigation} cartItems={{}} onMenuPress={() => setAuthModalVisible(true)} />
          <View style={styles.authContainer}>
            <AuthRequiredInline onSignIn={() => navigation.replace("Login")} description={"Sign in to access your business profile and rewards."} />
          </View>
          <BottomBar navigation={navigation} />
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: insets.top }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        >
          <View>
            {/* PREMIUM HEADER CARD */}
            <LinearGradient colors={["#FE724C", "#FF9272"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileHeader}>
              <View style={styles.headerContent}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarInner}>
                    <Ionicons name="person" size={40} color="#FE724C" />
                  </View>
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={12} color="#FFF" />
                  </View>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{profile?.full_name || "ZingBite User"}</Text>
                  <Text style={styles.userPhone}>{profile?.country_code} {profile?.mobile_number}</Text>
                  <View style={styles.businessBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                    <Text style={styles.badgeText}>Verified User Account</Text>
                  </View>
                </View>
              </View>

              {/* QUICK STATS OVERLAY */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>£{totalWallet}</Text>
                  <Text style={styles.statLabel}>Total Balance</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{wallet?.loyalty_expiry_list?.length || 0}</Text>
                  <Text style={styles.statLabel}>Points Items</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{orderCount}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
              </View>
            </LinearGradient>

            {/* REFERRAL BUSINESS CARD */}
            <View style={styles.section}>
              <LinearGradient colors={["#FFF", "#F8FAFC"]} style={styles.referralCard}>
                <View style={styles.refLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Ionicons name="people-circle" size={26} color="#FE724C" />
                    <Text style={[styles.refTitle, { marginLeft: 8 }]}>Refer a Friend</Text>
                  </View>
                  <Text style={styles.refDesc}>(Invite friends and earn instantly)</Text>
                  <View style={styles.codeRow}>
                    <Text style={styles.refCodeLabel}>Referral code:</Text>
                    <Text style={styles.refCodeText}>{profile?.referral_code || "ALPHA"}</Text>
                  </View>
                </View>
                <View style={styles.refActions}>
                  <TouchableOpacity style={[styles.iconBtn, { marginBottom: 10 }]} onPress={copyReferralCode}>
                    <Ionicons name="copy" size={20} color="#FE724C" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FE724C' }]} onPress={shareReferral}>
                    <Ionicons name="share-social" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* MAIN MENU SECTIONS */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Account management</Text>
              <View style={styles.menuGroup}>
                <MenuItem icon="receipt" label="My Orders" sub="View history & tracking" color="#FE724C" onPress={() => navigation.navigate("Orders")} />
                <MenuItem icon="wallet" label="Credits & Wallet" sub="Balance & statement" color="#FE724C" onPress={() => navigation.navigate("Credits")} />
                <MenuItem icon="person-circle" label="Edit Profile" sub="Update personal info" color="#FE724C" onPress={() => navigation.navigate("EditProfile")} />
                <MenuItem icon="trash-outline" label="Delete Account" sub="Permanently remove your data" color="#ef4444" onPress={showDeleteModal} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Resources & legal</Text>
              <View style={styles.menuGroup}>
                <MenuItem icon="help-buoy" label="Support Center" sub="FAQs & live chat" color="#FE724C" onPress={() => navigation.navigate("HelpCenter")} />
                <MenuItem icon="shield-checkmark" label="Privacy Policy" sub="How we use your data" color="#64748B" onPress={() => navigation.navigate("PrivacyPolicy")} />
                <MenuItem icon="document-text" label="Terms of Service" sub="App usage guidelines" color="#64748B" onPress={() => navigation.navigate("TermsConditions")} />
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <LinearGradient colors={["#FE724C", "#FF9272"]} style={styles.logoutInner}>
                <Ionicons name="log-out" size={22} color="#FFFFFF" />
                <Text style={[styles.logoutText, { color: "#FFFFFF" }]}>Sign Out Account</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.versionText}>ZingBite Business v2.0.1</Text>

          </View>
        </ScrollView>
      )}

      {userLocal && <BottomBar navigation={navigation} activeTab="Profile" />}

      <AuthRequiredModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} onSignIn={() => { setAuthModalVisible(false); navigation.replace("Login"); }} />

      {/* PREMIUM ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: alertScale }] }]}>
            <LinearGradient
              colors={alertType === 'error' ? ["#FFF7ED", "#FFFFFF"] : ["#FFF7ED", "#FFFFFF"]}
              style={styles.alertContent}
            >
              <View style={[
                styles.alertIconRing,
                { backgroundColor: alertType === 'error' ? '#FEE2E2' : '#FFD1B3' }
              ]}>
                <Ionicons
                  name={
                    alertType === 'error' ? "close-circle"
                      : alertType === 'success' ? "checkmark-circle"
                        : "information-circle"
                  }
                  size={40}
                  color={alertType === 'error' ? "#EF4444" : "#FE724C"}
                />
              </View>
              <Text style={styles.alertTitleText}>{alertTitle}</Text>
              <Text style={styles.alertMsgText}>{alertMsg}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={hidePremiumAlert}>
                <LinearGradient
                  colors={["#FE724C", "#FF9272"]}
                  style={styles.alertBtnGrad}
                >
                  <Text style={styles.alertBtnText}>Ok</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* PREMIUM LOGOUT MODAL */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: logoutScaleAnim }] }]}>
            <LinearGradient colors={["#FFFFFF", "#FFF7ED"]} style={styles.alertContent}>
              <View style={[styles.alertIconRing, { backgroundColor: 'rgba(254, 114, 76, 0.1)' }]}>
                <Ionicons name="log-out" size={40} color="#FE724C" />
              </View>
              <Text style={styles.alertTitleText}>Sign Out?</Text>
              <Text style={styles.alertMsgText}>Are you sure you want to sign out from your account?</Text>

              <View style={styles.logoutActionRow}>
                <TouchableOpacity style={styles.cancelLogoutBtn} onPress={cancelLogout}>
                  <Text style={styles.cancelLogoutText}>Stay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                  <LinearGradient colors={["#FE724C", "#FF9272"]} style={styles.alertBtnGrad}>
                    <Text style={styles.alertBtnText}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* PREMIUM DELETE ACCOUNT MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: deleteScaleAnim }] }]}>
            <LinearGradient colors={["#FFFFFF", "#FEF2F2"]} style={styles.alertContent}>
              <View style={[styles.alertIconRing, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={40} color="#EF4444" />
              </View>
              <Text style={[styles.alertTitleText, { color: '#EF4444' }]}>Delete Account?</Text>
              <Text style={styles.alertMsgText}>
                Are you sure you want to delete your account? Once you delete, you <Text style={{ fontFamily: 'PoppinsBold', color: '#111' }}>cannot restore</Text> and you <Text style={{ fontFamily: 'PoppinsBold', color: '#111' }}>cannot register again</Text> with the same number.
                {"\n\n"}
                Contact <Text style={{ color: '#FE724C' }}>support@zingbit.co.uk</Text> in the future if needed.
              </Text>

              <View style={styles.logoutActionRow}>
                <TouchableOpacity style={styles.cancelLogoutBtn} onPress={cancelDelete} disabled={deleting}>
                  <Text style={styles.cancelLogoutText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmDeleteAccount} disabled={deleting}>
                  <LinearGradient colors={["#EF4444", "#CC1F1F"]} style={styles.alertBtnGrad}>
                    {deleting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.alertBtnText}>Delete Me</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

const MenuItem = ({ icon, label, sub, color, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconBg, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.menuTextContent}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuSub}>{sub}</Text>
    </View>
    <View style={styles.chevron}>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loaderText: { marginTop: 15, fontFamily: 'PoppinsMedium', color: '#FE724C' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  profileHeader: {
    padding: 25,
    paddingTop: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 20,
    shadowColor: '#FE724C',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarInner: { width: 85, height: 85, borderRadius: 45, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FE724C', padding: 6, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' },

  userInfo: { marginLeft: 20, flex: 1 },
  userName: { fontSize: 24 * scale, fontFamily: "PoppinsBold", color: "#FFF", fontWeight: '900' },
  userPhone: { fontSize: 14 * scale, fontFamily: "PoppinsMedium", color: "rgba(255,255,255,0.8)", marginTop: -2 },
  businessBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10 * scale, fontFamily: "PoppinsSemiBold", color: "#FFF", marginLeft: 5, letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 35, backgroundColor: 'rgba(0,0,0,0.15)', padding: 18, borderRadius: 25 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20 * scale, fontFamily: "PoppinsBold", color: "#FFF", fontWeight: '900' },
  statLabel: { fontSize: 10 * scale, fontFamily: "PoppinsBold", fontWeight: '900', color: "#FFFFFF", textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1.5, height: '50%', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center' },

  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionLabel: { fontSize: 12 * scale, fontFamily: "PoppinsBold", color: "#64748B", letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },

  referralCard: { padding: 20, borderRadius: 22, flexDirection: 'row', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.05, borderWidth: 1, borderColor: '#FFF' },
  refLeft: { flex: 1 },
  refTitle: { fontSize: 18 * scale, fontFamily: "PoppinsSemiBold", color: "#1C1C1C" },
  refDesc: { fontSize: 12 * scale, fontFamily: "PoppinsMedium", color: "#64748B", marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  refCodeLabel: { fontSize: 10 * scale, fontFamily: "PoppinsBold", color: "#94A3B8" },
  refCodeText: { fontSize: 16 * scale, fontFamily: "PoppinsSemiBold", color: "#FE724C", marginLeft: 8, letterSpacing: 2, fontWeight: '700' },

  refActions: {},
  iconBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFD1B3' },

  menuGroup: { backgroundColor: '#FFF', borderRadius: 22, padding: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, borderWidth: 1, borderColor: '#F1F5F9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  menuIconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuTextContent: { flex: 1, marginLeft: 15 },
  menuLabel: { fontSize: 15 * scale, fontFamily: "PoppinsSemiBold", color: "#1E293B" },
  menuSub: { fontSize: 12 * scale, fontFamily: "PoppinsMedium", color: "#94A3B8", marginTop: 1 },
  chevron: { opacity: 0.5 },

  logoutBtn: { marginHorizontal: 20, marginTop: 30, borderRadius: 20, overflow: 'hidden', elevation: 2 },
  logoutInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderDash: [5, 5], borderWidth: 1, borderColor: '#FFD1B3' },
  logoutText: { fontSize: 16 * scale, fontFamily: "PoppinsSemiBold", color: "#FFFFFF", marginLeft: 10 },

  versionText: { textAlign: 'center', marginTop: 30, fontSize: 12 * scale, fontFamily: "PoppinsMedium", color: "#CBD5E1" },

  /* ALERT STYLES */
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertCard: {
    width: "85%",
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  alertContent: {
    padding: 30,
    alignItems: "center",
  },
  alertIconRing: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitleText: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMsgText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#475569",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22 * scale,
  },
  alertBtn: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
  },
  alertBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFF",
    fontWeight: "800",
  },
  logoutActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  cancelLogoutBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 10,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },
  cancelLogoutText: {
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    color: "#4B5563",
  },
  confirmLogoutBtn: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
  },
});
