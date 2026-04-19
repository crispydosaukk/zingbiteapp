import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import messaging from "@react-native-firebase/messaging";
import LinearGradient from "react-native-linear-gradient";
import {
  getNotifications,
  markNotificationRead,
} from "../services/notificationService";
import { getCart } from "../services/cartService";

import AppHeader from "./AppHeader";
import BottomBar from "./BottomBar";
import MenuModal from "./MenuModal";
import { AuthRequiredInline } from "./AuthRequired";

const { width } = Dimensions.get("window");
const scale = width / 375;

export default function Notifications({ navigation }) {
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [cartItems, setCartItems] = useState({});

  const isFocused = useIsFocused();

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      else setLoading(false); // if no user, stop loading
    };
    loadUser();
  }, []);

  // Fetch cart for header badge
  useEffect(() => {
    const fetchCart = async () => {
      if (!user) return;
      const customerId = user.id ?? user.customer_id;
      if (!customerId) return;

      try {
        const res = await getCart(customerId);
        if (res && res.status === 1 && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((item) => {
            const qty = item.product_quantity || 0;
            if (qty > 0) {
              map[item.product_id] = (map[item.product_id] || 0) + qty;
            }
          });
          setCartItems(map);
        } else {
          setCartItems({});
        }
      } catch (err) {
        console.log("Cart fetch error (Notifications):", err);
      }
    };

    if (isFocused && user) fetchCart();
  }, [isFocused, user]);

  // =========================
  // LOAD NOTIFICATIONS
  // =========================
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const userId = user.id || user.customer_id;
      const response = await getNotifications("customer", userId);
      // Axios returns the full response object, so we access .data for the payload
      const res = response.data;

      if (res?.status === 1) {
        const unique = [];
        const seen = new Set();
        (res.data || []).forEach(item => {
          // Deduplicate by content to catch backend double-inserts (different IDs, same content)
          // Key: OrderNumber + Title + Body (or just ID if content missing)
          const key = [
            item.order_number || 'NO_ORDER',
            item.title || 'NO_TITLE',
            item.body || 'NO_BODY'
          ].join('|');

          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });
        setList(unique);
      }
    } catch (e) {
      console.log("Notification fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================
  // MARK ALL AS READ
  // =========================
  const markAllRead = async () => {
    if (!user) return;
    try {
      const userId = user.id || user.customer_id;
      // Pass null for ID, userId, and true for markAll
      await markNotificationRead(null, userId, true);

      // Update local state to reflect changes instantly (optional but good for UI)
      setList(prev => prev.map(item => ({ ...item, is_read: 1 })));
    } catch (e) {
      console.log("Mark read error", e);
    }
  };

  // =========================
  // ON SCREEN FOCUS
  // =========================
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadNotifications();
        markAllRead();
      }
    }, [user])
  );

  // =========================
  // LISTEN FOR LIVE NOTIFICATIONS
  // =========================
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("🔔 Notifications Screen received FG msg:", remoteMessage);
      if (user) loadNotifications();
    });

    return unsubscribe;
  }, [user]);

  // =========================
  // REFRESH
  // =========================
  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // =========================
  // RENDER ITEM
  // =========================
  const renderItem = ({ item, index }) => {
    const isUnread = Number(item.is_read) === 0;
    // Premium alternate colors like category cards
    // Even: White/Pink-tint, Odd: White/Green-tint (or similar to Restaurant.jsx)
    const isEven = index % 2 === 0;
    const gradientColors = isEven ? ["#FFF", "#FDF2F8"] : ["#FFF", "#F0FDF4"];

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          // if (item.order_number) { ... }
        }}
        style={styles.cardContainer} // moved style
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.card,
            isUnread && styles.unreadCard,
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="notifications"
              size={20}
              color={isUnread ? "#FE724C" : "#999"}
            />
          </View>

          <View style={styles.content}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.title}>{(item.title || "").replace(/Delivered/g, "Collected").replace(/delivered/g, "collected")}</Text>
              {isUnread && <View style={styles.dot} />}
            </View>
            <Text style={styles.body}>
              {(() => {
                let body = (item.body || "").replace(/Delivered/g, "Collected").replace(/delivered/g, "collected");
                
                // Try parsing item.data if it's a string
                let parsedData = {};
                try {
                  if (typeof item.data === 'string') parsedData = JSON.parse(item.data);
                  else if (item.data) parsedData = item.data;
                } catch (e) {}

                // Robust extraction of reservation details from many possible fields/paths
                const resDate = item.reservation_date || item.booking_date || item.date || 
                               item.reservation?.reservation_date || item.data?.reservation_date || 
                               parsedData?.reservation_date || parsedData?.booking_date;
                               
                const resTime = item.reservation_time || item.booking_time || item.time || item.time_slot || item.slot ||
                               item.reservation?.reservation_time || item.data?.reservation_time ||
                               parsedData?.reservation_time || parsedData?.time_slot;
                               
                // If it's a reservation confirmation and we have date/time, append it to the body text
                if (((item.title || "").includes("Confirmed") || body.toLowerCase().includes("reservation")) && (resDate || resTime)) {
                   body = body.replace(/[!.]+$/, ""); // remove trailing exclamation/dot
                   body += ` for ${resDate || ''}${resDate && resTime ? ' at ' : ''}${(resTime || "").slice(0, 5)}`;
                }
                return body;
              })()}
            </Text>

            {/* DYNAMIC RESERVATION DETAILS DISPLAY */}
            {((item.title || "").includes("Confirmed") || (item.body || "").includes("reservation")) && (
              (() => {
                let parsedData = {};
                try {
                  if (typeof item.data === 'string') parsedData = JSON.parse(item.data);
                  else if (item.data) parsedData = item.data;
                } catch (e) {}

                let resDate = item.reservation_date || item.booking_date || item.date || 
                               item.reservation?.reservation_date || item.data?.reservation_date ||
                               parsedData?.reservation_date || parsedData?.booking_date;
                               
                let resTime = item.reservation_time || item.booking_time || item.time || item.time_slot || item.slot ||
                               item.reservation?.reservation_time || item.data?.reservation_time ||
                               parsedData?.reservation_time || parsedData?.time_slot;
                
                // Fallback: extract directly from the notification body (e.g. "... on 4/6/2026 at 18:00 is confirmed!")
                if (!resDate && !resTime) {
                    const match = (item.body || "").match(/on\s+(.*?)\s+at\s+([0-9:]+)/i);
                    if (match) {
                        resDate = match[1];
                        resTime = match[2];
                    }
                }
                
                if (!resDate && !resTime) return null;

                return (
                  <View style={styles.reservationBox}>
                    {resDate ? (
                      <View style={styles.resItem}>
                        <Ionicons name="calendar-outline" size={14 * scale} color="#FE724C" />
                        <Text style={styles.resLabel}>{resDate}</Text>
                      </View>
                    ) : null}
                    {resTime ? (
                      <View style={[styles.resItem, { marginLeft: resDate ? 16 : 0 }]}>
                        <Ionicons name="time-outline" size={14 * scale} color="#FE724C" />
                        <Text style={styles.resLabel}>{(resTime || "").slice(0, 5)}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })()
            )}

            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // =========================
  // MAIN RENDER
  // =========================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <AppHeader
        user={user}
        navigation={navigation}
        cartItems={cartItems}
        onMenuPress={() => setMenuVisible(true)}
      />

      {/* CONTENT */}
      {!user ? (
        <View style={styles.centerAuth}>
          <AuthRequiredInline
            onSignIn={() => navigation.replace("Login")}
            description="Sign in to view your notifications."
          />
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E23744" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#E23744"]}
            />
          }
          contentContainerStyle={[
            { paddingVertical: 10, paddingBottom: 80, flexGrow: 1 },
            list.length === 0 && { justifyContent: "center" }
          ]}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
              <Ionicons name="notifications-off-outline" size={48 * scale} color="#bbb" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}

      {/* FOOTER */}
      <BottomBar navigation={navigation} />

      {/* MENU MODAL */}
      <MenuModal
        visible={menuVisible}
        setVisible={setMenuVisible}
        user={user}
        navigation={navigation}
      />
    </View>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerAuth: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  emptyText: {
    marginTop: 10,
    color: "#777",
    fontSize: 14 * scale,
  },
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: '#FFF', // fallback
  },
  card: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16, // Ensure gradient respects this
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)"
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FE724C",
  },
  iconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14 * scale,
    fontWeight: "700",
    color: "#1C1C1C",
    marginBottom: 4,
    flex: 1
  },
  body: {
    fontSize: 13 * scale,
    color: "#444",
    marginBottom: 8,
    lineHeight: 18
  },
  time: {
    fontSize: 11 * scale,
    color: "#888",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FE724C",
    marginLeft: 6,
    marginTop: 4
  },
  // Reservation details styles
  reservationBox: {
    backgroundColor: 'rgba(254, 114, 76, 0.05)',
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 114, 76, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resLabel: {
    fontSize: 12 * scale,
    fontWeight: "600",
    color: "#444",
    marginLeft: 6,
  }
});
