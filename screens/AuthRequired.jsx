import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export function AuthRequiredModal({ visible, onClose, onSignIn }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color="#0288D1" />
          </View>
          <Text style={styles.title}>Please sign in to view details</Text>
          <Text style={styles.subtitle} numberOfLines={3}>
            Sign in to access your orders, wallet and credits. Enjoy a secure, personalized and premium experience.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryText}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onSignIn}>
              <Text style={styles.primaryText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AuthRequiredInline({ onSignIn, description }) {
  return (
    <View style={{ alignItems: "center", padding: 20 }}>
      <View style={styles.inlineCard}>
        <View style={styles.iconWrapInline}>
          <Ionicons name="person-circle-outline" size={44} color="#0288D1" />
        </View>
        <Text style={styles.inlineTitle}>Please sign in to continue</Text>
        <Text style={styles.inlineSubtitle} numberOfLines={3}>
          {description || "Sign in to access your orders, wallet and credits."}
        </Text>
        <TouchableOpacity style={styles.primaryBtnInline} onPress={onSignIn}>
          <Text style={styles.primaryText}>Sign in</Text>
        </TouchableOpacity>
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

  inlineCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 4,
  },
  iconWrapInline: {
    marginBottom: 12,
  },
  inlineTitle: {
    fontSize: 18,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
  },
  inlineSubtitle: {
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    color: "#475569",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 20,
  },
  primaryBtnInline: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1E293B",
    marginTop: 5,
  },
});
