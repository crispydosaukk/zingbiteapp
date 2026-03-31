import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";

export function AuthRequiredModal({ visible, onClose, onSignIn }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color="#0288D1" />
          </View>
          <Text style={styles.title}>Please sign in to view details</Text>
          <Text style={styles.subtitle}>
            Sign in to access your orders, wallet and credits. Enjoy a secure, personalized and premium experience.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryText}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryWrapModal} onPress={onSignIn}>
              <LinearGradient colors={["#FF2B5C", "#FF6B8B"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.primaryBtnGradient}>
                <Text style={styles.primaryTextWhite}>Sign in</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AuthRequiredInline({ onSignIn }) {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={36} color="#0288D1" />
        </View>
        <Text style={styles.title}>Please sign in to view details</Text>
        <Text style={styles.subtitle}>
          Sign in to access your orders, wallet and credits. Enjoy a secure, personalized and premium experience.
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryWrapModal} onPress={onSignIn}>
            <LinearGradient colors={["#FF2B5C", "#FF6B8B"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.primaryBtnGradient}>
              <Text style={styles.primaryTextWhite}>Sign in</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 6,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
  },
  primaryBtn: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1E293B",
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  primaryText: {
    color: "#1E293B",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#64748B",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
  },
  primaryWrapModal: {
    borderRadius: 14,
    marginLeft: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#FF2B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryWrapInline: {
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#FF2B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  primaryTextWhite: {
    color: "#FFFFFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
  },
});
