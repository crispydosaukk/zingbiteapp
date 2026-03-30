// HomeScreen.js
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Modal } from "react-native";
import { fetchAppSettings } from "../services/settingsService";

const { width, height } = Dimensions.get("window");
const isVerySmallScreen = height <= 640;
const isSmallScreen = height > 640 && height <= 720;
const FONT_FAMILY = Platform.select({ ios: "System", android: "System" });
const scale = width / 400; // Add scale definition since styles use it implicitly or we will add it

export default function HomeScreen({ navigation }) {
  const swingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Animation values for smooth cross-fade
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [msgIndex, setMsgIndex] = useState(0);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchAppSettings();
      if (data) {
        setSettings(data);
      }
    };
    loadSettings();
  }, []);

  const messages = settings ? [
    { text: `Earn £${Number(settings.earn_per_order_amount).toFixed(2)} on every order`, icon: "fast-food-outline" },
    { text: `Loyalty credits earn £${Number(settings.earn_per_order_amount).toFixed(2)}`, icon: "star-outline" },
    { text: `Earn £${Number(settings.signup_bonus_amount).toFixed(2)} welcome gift`, icon: "gift-outline" },
  ] : [];

  const offers = [
    { colors: ["#FF416C", "#FF4B2B"], textColor: "#FFFFFF" },
    { colors: ["#1D976C", "#93F9B9"], textColor: "#004D40" },
    { colors: ["#F2994A", "#F2C94C"], textColor: "#5D4037" },
  ];

  useFocusEffect(
    React.useCallback(() => {
      const checkAuth = async () => {
        const token = await AsyncStorage.getItem("token");
        setIsLoggedIn(!!token);
      };
      checkAuth();
    }, [])
  );

  // Premium Logout Modal State
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const logoutScaleAnim = useRef(new Animated.Value(0)).current;

  const handleLogoutPress = () => {
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
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "profile_cache",
      "wallet_summary_cache",
    ]);
    setIsLoggedIn(false);
    // Optional: show a small toast or success alert if needed
  };

  const cancelLogout = () => {
    Animated.timing(logoutScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setLogoutModalVisible(false));
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue: -1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  const swing = swingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-6deg", "6deg"],
  });

  // Smooth Cross-Fade Animation logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (messages.length === 0) return;
      // 1. Fade OUT
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. Change Text
        setMsgIndex((p) => (p + 1) % messages.length);
        slideAnim.setValue(10); // Prepare from bottom

        // 3. Fade IN
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [messages.length]);

  const logoWidth = isVerySmallScreen
    ? width * 0.5
    : isSmallScreen
      ? width * 0.55
      : width * 0.6;
  const logoHeight = logoWidth * 0.66;
  const imageCircleSize = isVerySmallScreen
    ? width * 0.5
    : isSmallScreen
      ? width * 0.56
      : width * 0.62;
  const verticalPadding = isVerySmallScreen ? 4 : isSmallScreen ? 8 : 12;

  const highlightOffer = (text) => {
    if (!settings || !text) return <Text style={styles.offerText}>{text}</Text>;
    const regex = new RegExp(`(£\\s?${Number(settings.signup_bonus_amount).toFixed(2)}|£${Number(settings.signup_bonus_amount).toFixed(2)}|£\\s?${Number(settings.referral_bonus_amount).toFixed(2)}|£${Number(settings.referral_bonus_amount).toFixed(2)}|£\\s?${Number(settings.earn_per_order_amount).toFixed(2)}|£${Number(settings.earn_per_order_amount).toFixed(2)})`, 'i');
    const parts = text.split(regex);

    return (
      <Text style={[styles.offerText, { color: "#FFFFFF" }]}>
        {parts[0]?.toUpperCase()}
        {parts[1] && (
          <Text style={[styles.offerAmount, { color: "#FFDF00" }]}>
            {parts[1]}
          </Text>
        )}
        {parts[2]?.toUpperCase()}
      </Text>
    );
  };


  return (
    <>
      <StatusBar backgroundColor="#B3E5FC" barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#B3E5FC" }}
        edges={["top"]}
      >
        <LinearGradient
          colors={["#B3E5FC", "#F7CB45"]}
          style={styles.container}
        >
          <View style={[styles.mainContent, { paddingVertical: verticalPadding }]}>
            <View style={styles.topSection}>
              <View style={styles.rope} />
              <Animated.Image
                source={require("../assets/logo.png")}
                style={[
                  styles.brandLogoImage,
                  {
                    width: logoWidth,
                    height: logoHeight,
                    transform: [{ rotate: swing }],
                  },
                ]}
              />

              <View style={styles.mainTitleWrap}>
                <Text style={styles.mainTitleBlack}>Order UK's Finest Quality</Text>
                <Text style={styles.mainTitleOrange}>TAKEAWAY FOOD</Text>
                <Text style={[styles.mainTitleBlack, { fontSize: 18, marginTop: 4 }]}>From Local Restaurants</Text>
              </View>

              {settings && messages.length > 0 && (
                <View style={{ width: "100%", alignItems: "center", height: imageCircleSize, justifyContent: 'center' }}>
                  <Animated.View style={[styles.premiumOfferCard, { width: width * 0.88, transform: [{ scale: pulseAnim }] }]}>
                    <LinearGradient
                      colors={["#E63946", "#0288D1"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ ...StyleSheet.absoluteFillObject, borderRadius: 24 }}
                    />
                    <Animated.View
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        },
                      ]}
                    >
                      <View style={styles.offerIconCircle}>
                        <Ionicons name={messages[msgIndex]?.icon || "gift"} size={32} color="#FFFFFF" />
                      </View>
                      <View style={styles.offerTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Ionicons name="sparkles" size={12} color="#FFDF00" style={{ marginRight: 4 }} />
                          <Text style={styles.offerLabel}>LIMITED OFFER</Text>
                        </View>
                        <Text style={[styles.offerText, { color: '#FFFFFF', marginLeft: 0 }]} numberOfLines={2}>
                          {highlightOffer(messages[msgIndex]?.text)}
                        </Text>
                      </View>
                    </Animated.View>
                  </Animated.View>
                </View>
              )}

              <Text style={styles.subtitle}>Fresh • Authentic • Veg & Non-Veg</Text>
            </View>



            {/* 🔻 Buttons brought closer under subtitle */}
            <View style={styles.bottomSection}>
              <View style={styles.buttonArea}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Resturent")}
                  style={styles.primaryBtn}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={20}
                    color="#000000"
                    style={styles.btnIcon}
                  />
                  <Text style={styles.primaryBtnText}>Explore</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    if (isLoggedIn) handleLogoutPress();
                    else navigation.navigate("Login");
                  }}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name={isLoggedIn ? "log-out-outline" : "log-in-outline"}
                    size={20}
                    color="#000000"
                    style={styles.btnIcon}
                  />
                  <Text style={styles.secondaryBtnText}>
                    {isLoggedIn ? "Sign Out" : "Sign In"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.bottomLine}>
                  New here?{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("Signup")}
                  >
                    Create an account
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* PREMIUM LOGOUT MODAL */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <Animated.View style={[styles.logoutCard, { transform: [{ scale: logoutScaleAnim }] }]}>
            <LinearGradient colors={["#FFFFFF", "#FFF5F5"]} style={styles.logoutContent}>
              <View style={[styles.logoutIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="log-out" size={40} color="#EF4444" />
              </View>
              <Text style={styles.logoutTitle}>Sign Out?</Text>
              <Text style={styles.logoutMsg}>Are you sure you want to sign out from your account?</Text>

              <View style={styles.logoutActionRow}>
                <TouchableOpacity style={styles.cancelLogoutBtn} onPress={cancelLogout}>
                  <Text style={styles.cancelLogoutText}>Stay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                  <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.alertBtnGrad}>
                    <Text style={styles.alertBtnText}>Sign Out</Text>
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
  container: { flex: 1 },
  offerAmount: {
    fontFamily: "PoppinsSemiBold",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topSection: {
    alignItems: "center",
    marginTop: -40,
  },
  bottomSection: {
    width: "100%",
    paddingTop: 6,
    paddingBottom: 10,
    marginTop: 12,
  },
  brandLogoImage: {
    resizeMode: "contain",
  },
  mainTitleWrap: {
    marginTop: 4,
    alignItems: "center",
  },
  mainTitleBlack: {
    fontSize: 22,
    fontFamily: "PoppinsSemiBold",
    color: "#0F172A",
  },
  mainTitleOrange: {
    fontSize: 32,
    fontFamily: "PoppinsSemiBold",
    color: "#C62828",
    marginTop: -2,
    marginBottom: -2,
  },
  imageWrapper: {
    marginTop: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "PoppinsSemiBold",
  },
  premiumOfferCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  offerIconCircle: {
    width: 60,
    height: 60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  offerLabel: {
    fontSize: 12,
    fontFamily: "PoppinsSemiBold",
    color: "#FFDF00",
    letterSpacing: 2.5,
  },
  offerPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  offerText: {
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    marginLeft: 0,
    color: '#F8FAFC',
  },
  buttonArea: {
    width: "100%",
    alignItems: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    width: width * 0.75,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1E293B",
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    color: "#1E293B",
  },
  secondaryBtn: {
    flexDirection: "row",
    width: width * 0.75,
    borderWidth: 2,
    borderColor: "rgba(30, 41, 59, 0.6)",
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    color: "#1E293B",
  },
  btnIcon: {
    marginRight: 8,
  },
  bottomLine: {
    fontSize: 14,
    color: "#1E293B",
    marginTop: 2,
    fontFamily: "PoppinsSemiBold",
  },
  linkText: {
    fontFamily: "PoppinsSemiBold",
    textDecorationLine: "underline",
    color: "#C62828",
  },
  rope: {
    width: 2,
    height: 28,
    backgroundColor: "#1D976C",
    marginBottom: 6,
  },

  /* LOGOUT MODAL STYLES */
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutCard: {
    width: "85%",
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  logoutContent: {
    padding: 30,
    alignItems: "center",
  },
  logoutIconRing: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutTitle: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center",
  },
  logoutMsg: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#475569",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22 * scale,
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
    fontSize: 16 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#4B5563",
  },
  confirmLogoutBtn: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
  },
  alertBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#FFF",
  },
});
