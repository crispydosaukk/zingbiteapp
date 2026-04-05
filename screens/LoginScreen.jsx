import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser } from "../services/authService";
import messaging from "@react-native-firebase/messaging";
import { saveFcmToken } from "../services/notificationService";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  // Premium Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("info");
  const alertScale = React.useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    if (!email || !password) {
      showPremiumAlert("Error", "Please enter Email / Mobile Number and Password", "error");
      return;
    }

    // 🔥 Detect if input is valid email or mobile number
    const trimmed = email.trim();
    const isMobile = /^[0-9]{8,15}$/.test(trimmed);
    const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!isMobile && !isEmailFormat) {
      showPremiumAlert("Invalid Input", "Please enter a valid Email or Mobile Number", "error");
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await loginUser(trimmed, password);

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      /* =======================
        🔔 STEP 6.3 – FCM TOKEN
      ======================= */
      const fcmToken = await messaging().getToken();
      // console.log("🔥 CUSTOMER FCM TOKEN:", fcmToken);

      if (fcmToken && user?.id) {
        await saveFcmToken({
          userType: "customer",
          userId: user.id,
          token: fcmToken
        });
      }
      /* ======================= */


      setFullName(user.full_name);
      setSuccessVisible(true);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setSuccessVisible(false);
        navigation.replace("Resturent");
      }, 2500);

    } catch (e) {
      showPremiumAlert("Login Failed", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF7ED" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <LinearGradient colors={["#FFF7ED", "#FFFFFF"]} style={styles.container}>

          {/* LOGO */}
          <View style={styles.logoWrap}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
            />
          </View>

          {/* MAIN CARD AREA */}
          <View style={styles.card}>
            <Text style={styles.title}>Hello 👋</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {/* Email / Mobile */}
            <View style={styles.box}>
              <Text style={styles.label}>Email or Mobile Number</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color="#1E293B" />
                <TextInput
                  placeholder="Enter email or mobile number"
                  placeholderTextColor="#88a796"
                  autoCapitalize="none"
                  keyboardType="default"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </View>

              <Text style={styles.helperText}>
                You can login using your Email or Mobile Number.
              </Text>
            </View>

            {/* Password */}
            <View style={styles.box}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#1E293B"
                />
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor="#88a796"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* LOGIN BUTTON */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <LinearGradient colors={["#FE724C", "#FF9272"]} style={styles.loginGradient}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Signup Link */}
            <Text style={styles.bottomText}>
              Don’t have an account?{" "}
              <Text
                style={styles.signup}
                onPress={() => navigation.navigate("Signup")}
              >
                Register Now
              </Text>
            </Text>
          </View>

        </LinearGradient>
      </KeyboardAvoidingView>

      {/* PREMIUM SUCCESS MODAL */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.successCard,
            { transform: [{ scale: scaleAnim }] }
          ]}>
            <View style={styles.successGradient}>
              <View style={styles.checkRing}>
                <Ionicons name="checkmark-circle" size={80 * scale} color="#E63946" />
              </View>

              <Text style={styles.successTitle}>Logged In!</Text>
              <Text style={styles.successMsg}>
                Welcome back, {fullName}!
              </Text>

              <Text style={styles.enjoyText}>
                Enjoy ordering your favorite meals 😋
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* PREMIUM ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: alertScale }] }]}>
            <LinearGradient
              colors={alertType === 'error' ? ["#FFF5F5", "#FFFFFF"] : ["#F0FDF4", "#FFFFFF"]}
              style={styles.alertContent}
            >
              <View style={[styles.alertIconRing, { backgroundColor: alertType === 'error' ? '#FEE2E2' : '#E0F2FE' }]}>
                <Ionicons
                  name={alertType === 'error' ? "close-circle" : "information-circle"}
                  size={40}
                  color={alertType === 'error' ? "#EF4444" : "#0288D1"}
                />
              </View>
              <Text style={styles.alertTitleText}>{alertTitle}</Text>
              <Text style={styles.alertMsgText}>{alertMsg}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={hidePremiumAlert}>
                <LinearGradient colors={["#FE724C", "#FF9272"]} style={styles.alertBtnGradient}>
                  <Text style={styles.alertBtnText}>Ok</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ====================== STYLES ====================== */

const styles = StyleSheet.create({
  container: { flex: 1 },

  topWave: {
    height: "32%",
    width: "140%",
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    position: "absolute",
    top: -100,
    alignSelf: "center",
  },

  bottomWave: {
    height: "28%",
    width: "140%",
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    position: "absolute",
    bottom: -100,
    alignSelf: "center",
  },

  logoWrap: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 180,
    height: 90,
    resizeMode: "contain",
  },

  card: {
    flex: 1,
    paddingHorizontal: 28,
    marginTop: 20,
  },

  title: {
    fontSize: 32,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    color: "#475569",
    marginBottom: 30,
  },
  box: { marginBottom: 20 },
  label: {
    color: "#0F172A",
    marginBottom: 6,
    fontFamily: "PoppinsSemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: "#FE724C",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "PoppinsMedium",
    color: "#000",
    marginLeft: 8,
  },
  helperText: {
    color: "#475569",
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    marginTop: 5,
  },
  forgotBtn: { alignSelf: "flex-end", marginTop: 4 },
  forgotText: { color: "#FE724C", fontFamily: "PoppinsSemiBold" },

  loginBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  loginGradient: {
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PoppinsBold",
  },
  bottomText: {
    textAlign: "center",
    marginTop: 25,
    color: "#1E293B",
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
  },
  signup: {
    color: "#FE724C",
    fontFamily: "PoppinsBold",
    textDecorationLine: "underline",
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    width: "85%",
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successGradient: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkRing: {
    width: 100 * scale,
    height: 100 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    fontWeight: "900",
    marginBottom: 5,
  },
  successMsg: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#475569",
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 15,
  },
  successBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
  },
  successBadgeText: {
    fontSize: 10 * (Dimensions.get("window").width / 400),
    fontFamily: "PoppinsBold",
    color: "#15803d",
    letterSpacing: 1,
  },
  enjoyText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#64748B",
    opacity: 0.8,
    textAlign: "center",
  },

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
    marginTop: 30,
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  alertBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBtnText: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
  },
});
