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
  const shimmerAnim = useRef(new Animated.Value(0)).current;
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
    { colors: ["#FF2B5C", "#FF6B8B"], textColor: "#FFFFFF" },
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

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();

  }, []);

  const swing = swingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-6deg", "6deg"],
  });

  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ["#FF3B00", "#FF6B00", "#FFD700", "#FF6B00", "#FF3B00"],
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
    if (!settings || !text) {
      return (
        <Text
          style={[styles.offerText, { color: "#FFFFFF", marginLeft: 0 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {text}
        </Text>
      );
    }
    const regex = new RegExp(`(£\\s?${Number(settings.signup_bonus_amount).toFixed(2)}|£${Number(settings.signup_bonus_amount).toFixed(2)}|£\\s?${Number(settings.referral_bonus_amount).toFixed(2)}|£${Number(settings.referral_bonus_amount).toFixed(2)}|£\\s?${Number(settings.earn_per_order_amount).toFixed(2)}|£${Number(settings.earn_per_order_amount).toFixed(2)})`, 'i');
    const parts = text.split(regex);

    return (
      <Text
        style={[styles.offerText, { color: "#FFFFFF", marginLeft: 0 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
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
      <StatusBar backgroundColor="#0a0a1a" barStyle="light-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#0a0a1a" }}
        edges={["top"]}
      >
        <View style={[styles.container, { backgroundColor: "#0a0a1a" }]}>
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
                <Animated.Text style={[styles.mainTitleOrange, { color: shimmerColor }]}>Takeaway food</Animated.Text>
                <Text style={[styles.mainTitleBlack, { fontSize: 18, marginTop: 4 }]}>From Local Restaurants</Text>
              </View>

              {settings && messages.length > 0 && (
                <View style={{ width: "100%", alignItems: "center", height: imageCircleSize, justifyContent: 'center' }}>
                  <Animated.View style={[styles.premiumOfferCard, { width: width * 0.85, alignSelf: "center", transform: [{ scale: pulseAnim }] }]}>
                    <Animated.View
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          opacity: fadeAnim,
                          paddingLeft: 12,
                          transform: [{ translateY: slideAnim }],
                        },
                      ]}
                    >
                      <View style={styles.offerIconCircle}>
                        <Ionicons name={messages[msgIndex]?.icon || "gift"} size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.offerTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Ionicons name="sparkles" size={12} color="#FF3B00" style={{ marginRight: 4 }} />
                          <Text style={styles.offerLabel}>Limited offer</Text>
                        </View>
                        {highlightOffer(messages[msgIndex]?.text)}
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
                  style={styles.primaryBtnWrapper}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#FF3B00", "#FF6B00"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color="#FFFFFF"
                      style={styles.btnIcon}
                    />
                    <Text style={styles.primaryBtnText}>Explore Restaurants</Text>
                  </LinearGradient>
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
                    color="#fdf5f5ff"
                    style={styles.btnIcon}
                  />
                  <Text style={styles.secondaryBtnText}>
                    {isLoggedIn ? "Sign out" : "Sign in"}
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
        </View>
      </SafeAreaView>

      {/* PREMIUM LOGOUT MODAL */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <Animated.View style={[styles.logoutCard, { transform: [{ scale: logoutScaleAnim }] }]}>
            <View style={styles.logoutContent}>
              <View style={styles.logoutIconRing}>
                <Ionicons name="log-out-outline" size={60 * scale} color="#E63946" />
              </View>
              <Text style={styles.logoutTitle}>Sign Out?</Text>
              <Text style={styles.logoutMsg}>Are you sure you want to sign out from your account?</Text>

              <View style={styles.logoutActionRow}>
                <TouchableOpacity style={styles.cancelLogoutBtn} onPress={cancelLogout}>
                  <Text style={styles.logoutBtnText}>Stay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                  <LinearGradient colors={["#FF2B5C", "#FF6B8B"]} style={styles.logoutBtnGradient}>
                    <Text style={[styles.logoutBtnText, { color: "#FFFFFF" }]}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
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
    color: "#f1f2f5ff",
  },
  mainTitleOrange: {
    fontSize: 32,
    fontFamily: "PoppinsSemiBold",
    color: "#d62802",
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
    color: "#f9f9f9ff",
    fontFamily: "PoppinsSemiBold",
  },
  premiumOfferCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: '#3F1C14',
    borderLeftWidth: 6,
    borderLeftColor: '#FF3B00',
    elevation: 8,
    shadowColor: "#3F1C14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  offerIconCircle: {
    width: 50,
    height: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  offerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  offerLabel: {
    fontSize: 12,
    fontFamily: "PoppinsSemiBold",
    color: "#FF3B00",
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
    fontSize: 15 * scale,
    fontFamily: "PoppinsSemiBold",
    marginLeft: 0,
    color: '#F8FAFC',
  },
  buttonArea: {
    width: "100%",
    alignItems: "center",
  },
  primaryBtnWrapper: {
    width: width * 0.75,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#FF3B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    color: "#FFFFFF",
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: "row",
    width: width * 0.75,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
    color: "#FFFFFF",
    fontWeight: '600',
  },
  btnIcon: {
    marginRight: 8,
  },
  bottomLine: {
    fontSize: 14,
    color: "#f6f7f8ff",
    marginTop: 2,
    fontFamily: "PoppinsSemiBold",
  },
  linkText: {
    fontFamily: "PoppinsSemiBold",
    textDecorationLine: "underline",
    color: "#d62802",
  },
  rope: {
    width: 2,
    height: 28,
    backgroundColor: "#FF2B5C",
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
    backgroundColor: "#FFFFFF",
  },
  logoutIconRing: {
    width: 100 * scale,
    height: 100 * scale,
    borderRadius: 50 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutTitle: {
    fontSize: 28 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    fontWeight: "900",
    marginBottom: 5,
    textAlign: "center",
  },
  logoutMsg: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#475569",
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 25,
    lineHeight: 24 * scale,
  },
  logoutActionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelLogoutBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLogoutBtn: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
  },
  logoutBtnGradient: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    color: "#1E293B",
  },
});
