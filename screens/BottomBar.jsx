import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function BottomBar({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.bottomBarContainer}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Home")}
        activeOpacity={0.6}
      >
        <Ionicons name="home-outline" size={24 * scale} color="#334155" />
        <Text style={styles.tabLabel}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Orders")}
        activeOpacity={0.6}
      >
        <Ionicons name="receipt-outline" size={24 * scale} color="#334155" />
        <Text style={styles.tabLabel}>Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Credits")}
        activeOpacity={0.6}
      >
        <Ionicons name="wallet-outline" size={24 * scale} color="#334155" />
        <Text style={styles.tabLabel}>Credits</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Profile")}
        activeOpacity={0.6}
      >
        <Ionicons name="person-outline" size={24 * scale} color="#334155" />
        <Text style={styles.tabLabel}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBarContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    height: 65 * scale,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 0, // Keep it flat like image 1
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 10 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#1E293B",
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
