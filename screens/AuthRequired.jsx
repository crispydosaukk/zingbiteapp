import React, { useEffect, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const scale = width / 400;

export function AuthRequiredModal({ visible, onClose, onSignIn }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconRing}>
              <Ionicons name="shield-checkmark" size={40 * scale} color="#FE724C" />
            </View>
          </View>
          
          <Text style={styles.title}>Welcome to ZingBite!</Text>
          <Text style={styles.subtitle}>
            Please sign in or create an account to access your orders, credits, and personalized experience.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.secondaryText}>Maybe Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryBtnWrap} onPress={onSignIn} activeOpacity={0.8}>
              <LinearGradient 
                colors={["#FE724C", "#FF9272"]} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}} 
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryTextWhite}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function AuthRequiredInline({ onSignIn }) {
  const navigation = useNavigation();

  return (
    <View style={styles.inlineContainer}>
      <View style={styles.inlineCard}>
        <View style={styles.iconContainer}>
          <View style={styles.iconRingInline}>
            <Ionicons name="lock-closed" size={48 * scale} color="#FE724C" />
          </View>
          <View style={styles.decorativeDot1} />
          <View style={styles.decorativeDot2} />
        </View>

        <Text style={styles.titleInline}>Sign In Required</Text>
        <Text style={styles.subtitleInline}>
          Unlock your full ZingBite experience. Access exclusive offers, order history, and wallet credits securely!
        </Text>

        <View style={styles.actionsColumn}>
          <TouchableOpacity style={styles.primaryBtnWrapInline} onPress={onSignIn} activeOpacity={0.8}>
            <LinearGradient 
              colors={["#FE724C", "#FF9272"]} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
              style={styles.primaryBtnGradientInline}
            >
              <Text style={styles.primaryTextWhiteInline}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtnInline} onPress={() => navigation.navigate("Home")} activeOpacity={0.6}>
            <Text style={styles.secondaryTextInline}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconRing: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    backgroundColor: "#FFF3F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFE0D6",
  },
  title: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#475569",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22 * scale,
    paddingHorizontal: 10,
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  secondaryText: {
    color: "#64748B",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15 * scale,
  },
  primaryBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#FE724C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryBtnGradient: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  primaryTextWhite: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15 * scale,
  },

  // Inline Styles
  inlineContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  inlineCard: {
    width: "100%",
    maxWidth: 400,
    padding: 10,
    alignItems: "center",
  },
  iconRingInline: {
    width: 100 * scale,
    height: 100 * scale,
    borderRadius: 50 * scale,
    backgroundColor: "#FFF3F0",
    justifyContent: "center",
    alignItems: "center",
  },
  decorativeDot1: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FBBF24",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  decorativeDot2: {
    position: "absolute",
    bottom: 10,
    left: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  titleInline: {
    fontSize: 24 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitleInline: {
    fontSize: 15 * scale,
    fontFamily: "PoppinsMedium",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 35,
    lineHeight: 24 * scale,
    paddingHorizontal: 5,
  },
  actionsColumn: {
    width: "100%",
    alignItems: "stretch",
    paddingHorizontal: 10,
  },
  primaryBtnWrapInline: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnGradientInline: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTextWhiteInline: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 18,
  },
  secondaryBtnInline: {
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  secondaryTextInline: {
    color: "#475569",
    fontFamily: "PoppinsBold",
    fontSize: 16 * scale,
  },
});
