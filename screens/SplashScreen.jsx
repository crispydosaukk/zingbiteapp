
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Easing,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { initAndSaveFcmToken } from "../utils/fcm";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function SplashScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loaderWidth = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.timing(loaderWidth, {
      toValue: 1,
      duration: 2600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timeout = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const user = await AsyncStorage.getItem("user");
        if (token && user) {
          initAndSaveFcmToken();
          navigation.replace("Resturent");
        } else {
          navigation.replace("Home");
        }
      } catch {
        navigation.replace("Login");
      }
    }, 3200);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      {/* 🎨 CLEAN BOLD DUAL-TONE: LOGO BLUE + ZING YELLOW */}
      <LinearGradient
        colors={["#B3E5FC", "#F7CB45"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar backgroundColor="#B3E5FC" barStyle="dark-content" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center} pointerEvents="none">
          <Animated.View
            style={{
              opacity: opacityAnim,
              alignItems: "center",
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) }
              ],
            }}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>

            <Animated.View style={[styles.taglineContainer, { 
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }] 
            }]}>
              <Text style={styles.taglineText}>Order. Bite. Enjoy. 🍔</Text>
              <View style={styles.accentLine} />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={{ flex: 1 }} />

        <Animated.View style={[styles.bottomInfo, { opacity: textOpacity }]}>
            <Text style={styles.eternal}>WHERE TRADITION MEETS TASTE</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.loaderTrack}>
            <Animated.View
              style={[
                styles.loaderFill,
                {
                  width: loaderWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 0,
  },
  logoImg: {
    width: width * 0.85,
    height: 160 * scale,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: -15,
  },
  taglineText: {
    fontFamily: "PoppinsBold",
    fontSize: 20 * scale,
    color: "#1E293B",
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  accentLine: {
    width: 45 * scale,
    height: 4,
    backgroundColor: '#C62828',
    borderRadius: 2,
    marginTop: 8,
  },
  bottomInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  eternal: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 11 * scale,
    color: "#1C1C1C",
    letterSpacing: 4,
    fontWeight: '700',
    opacity: 0.9,
  },
  footer: {
    paddingBottom: 110,
    alignItems: "center",
  },
  loaderTrack: {
    width: 60,
    height: 5,
    backgroundColor: "rgba(30,41,59,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  loaderFill: {
    height: "100%",
    backgroundColor: "#C62828",
  },
});
