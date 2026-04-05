import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
const { width } = Dimensions.get("window");
const scale = width / 400;

export default function BottomBar({ navigation, activeTab }) {

  return (
    <View style={styles.bottomBarContainer}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Resturent")}
        activeOpacity={0.6}
      >
        <Ionicons 
          name={activeTab === "Home" ? "home" : "home-outline"} 
          size={24 * scale} 
          color={activeTab === "Home" ? "#FE724C" : "#334155"} 
        />
        <Text style={[styles.tabLabel, activeTab === "Home" && { color: "#FE724C" }]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Orders")}
        activeOpacity={0.6}
      >
        <Ionicons 
          name={activeTab === "Orders" ? "receipt" : "receipt-outline"} 
          size={24 * scale} 
          color={activeTab === "Orders" ? "#FE724C" : "#334155"} 
        />
        <Text style={[styles.tabLabel, activeTab === "Orders" && { color: "#FE724C" }]}>Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Credits")}
        activeOpacity={0.6}
      >
        <Ionicons 
          name={activeTab === "Credits" ? "wallet" : "wallet-outline"} 
          size={24 * scale} 
          color={activeTab === "Credits" ? "#FE724C" : "#334155"} 
        />
        <Text style={[styles.tabLabel, activeTab === "Credits" && { color: "#FE724C" }]}>Credits</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Profile")}
        activeOpacity={0.6}
      >
        <Ionicons 
          name={activeTab === "Profile" ? "person" : "person-outline"} 
          size={24 * scale} 
          color={activeTab === "Profile" ? "#FE724C" : "#334155"} 
        />
        <Text style={[styles.tabLabel, activeTab === "Profile" && { color: "#FE724C" }]}>Profile</Text>
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
