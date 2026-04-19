// OffersScreen.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from "react-native-geolocation-service";
import { PermissionsAndroid } from "react-native";

import AppHeader from "./AppHeader";
import BottomBar from "./BottomBar";
import MenuModal from "./MenuModal";
import { fetchRestaurants } from "../services/restaurantService";
import { fetchActiveOffers } from "../services/offerService";
import { addToCart, getCart, removeFromCart } from "../services/cartService";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [allOffers, setAllOffers] = useState([]);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState({});
  const [locationName, setLocationName] = useState("Locating...");
  const [updating, setUpdating] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [instructionPopupVisible, setInstructionPopupVisible] = useState(false);
  const [instructionNote, setInstructionNote] = useState("");
  const [instructionPopupTarget, setInstructionPopupTarget] = useState(null);
  const [selectedRestoForAdd, setSelectedRestoForAdd] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [expandedOfferIds, setExpandedOfferIds] = useState({});

  const toggleOfferExpansion = (id) => {
    setExpandedOfferIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [loading]);

  const loadUserAndCart = async () => {
    const storedUser = await AsyncStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const customerId = parsedUser.id ?? parsedUser.customer_id;
      if (customerId) {
        const cartRes = await getCart(customerId);
        if (cartRes?.status === 1 && Array.isArray(cartRes.data)) {
          const map = {};
          cartRes.data.forEach(item => {
            if (item.product_quantity > 0) {
              map[item.product_id] = (map[item.product_id] || 0) + item.product_quantity;
            }
          });
          setCartItems(map);
        }
      }
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; 
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestLocationPermission();
      let lat = null, lng = null;

      if (hasPermission) {
        const pos = await new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            (p) => resolve(p.coords),
            (e) => {
              console.log("Location error", e);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });
        if (pos) {
          lat = pos.latitude;
          lng = pos.longitude;
        }
      }

      const nearbyRestos = await fetchRestaurants(lat, lng);
      setRestaurants(nearbyRestos);

      const offerPromises = nearbyRestos.slice(0, 5).map(async (r) => {
        try {
          const offers = await fetchActiveOffers(r.userId);
          return offers.map(o => ({ ...o, restaurant: r }));
        } catch (err) {
          console.log(`Error fetching offers for resto ${r.userId}:`, err);
          return [];
        }
      });

      const results = await Promise.all(offerPromises);
      const flattenedOffers = results.flat();
      setAllOffers(flattenedOffers);
    } catch (err) {
      console.log("loadData global error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndCart();
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserAndCart();
    await loadData();
    setRefreshing(false);
  };

  const handleAddItem = async (product, restaurant) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }

    const customerId = user.id ?? user.customer_id;
    const prodId = product.id;

    // Check for conflict before showing instructions
    const currentCartRes = await getCart(customerId);
    const cartData = currentCartRes?.data || [];
    const hasConflict = cartData.some(item => item.user_id != restaurant.userId);

    if (hasConflict) {
      Alert.alert(
        "Replace cart items?",
        "Your cart contains items from another restaurant. Do you want to clear your cart and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            onPress: async () => {
              try {
                await Promise.all(cartData.map(item => removeFromCart(item.cart_id || item.id)));
                setCartItems({});
                // Show instructions after clearing
                setInstructionPopupTarget(product);
                setSelectedRestoForAdd(restaurant);
                setInstructionNote("");
                setInstructionPopupVisible(true);
              } catch (e) {
                console.log("Replace cart error", e);
              }
            }
          }
        ]
      );
      return;
    }

    setInstructionPopupTarget(product);
    setSelectedRestoForAdd(restaurant);
    setInstructionNote("");
    setInstructionPopupVisible(true);
  };

  const handleSubmitInstructionPopup = async () => {
    const item = instructionPopupTarget;
    const restaurant = selectedRestoForAdd;
    if (!item || !user || !restaurant) return;

    setUpdating(prev => ({ ...prev, [item.id]: true }));
    try {
      const customerId = user.id ?? user.customer_id;
      const currentQty = cartItems[item.id] || 0;
      
      const res = await addToCart({
        customer_id: customerId,
        user_id: restaurant.userId,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        product_tax: 0,
        product_quantity: currentQty + 1,
        textfield: instructionNote || "",
      });

      if (res.status === 1) {
        setCartItems(prev => ({ ...prev, [item.id]: currentQty + 1 }));
        setInstructionPopupVisible(false);
        setInstructionPopupTarget(null);
        setSelectedRestoForAdd(null);

        // Saved Amount Calculation
        const discountValue = item.discount_price || item.product_discount_price || 0;
        let saved = 0;
        if (discountValue && Number(discountValue) > Number(item.price)) {
          saved = Number(discountValue) - Number(item.price);
        }

        setSavedAmount(saved);
        setSuccessModalVisible(true);
      } else {
        Alert.alert("Error", res.message || "Could not add to cart");
      }
    } catch (err) {
      console.log("Add to cart error:", err);
    } finally {
      if (item && item.id) {
        setUpdating(prev => ({ ...prev, [item.id]: false }));
      }
    }
  };

  const renderOffer = (offer, index) => {
    const { restaurant, targets } = offer;
    const isExpanded = expandedOfferIds[offer.id];

    return (
      <View key={offer.id} style={styles.offerContainer}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => toggleOfferExpansion(offer.id)}
          style={styles.offerCardHeader}
        >
          <View style={styles.restaurantHeader}>
            <View style={styles.restoTitleCol}>
              <View style={styles.restoNameRow}>
                <Ionicons name="restaurant" size={14 * scale} color="#FE724C" />
                <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
              </View>
              {restaurant.distance !== undefined && (
                <Text style={styles.distanceText}>
                  • {(restaurant.distance * 0.621371).toFixed(1)} mi away
                </Text>
              )}
            </View>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20 * scale} 
              color="#94A3B8" 
            />
          </View>

          <View style={styles.offerBanner}>
            <Image
              source={offer.banner_image ? { uri: offer.banner_image } : require("../assets/restaurant.png")}
              style={styles.bannerImg}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={styles.bannerOverlay}
            >
              <Text style={styles.offerTitle}>{offer.title}</Text>
              {!!offer.description && (
                <Text style={styles.offerDesc} numberOfLines={1}>
                  {offer.description}
                </Text>
              )}
            </LinearGradient>
          </View>
        </TouchableOpacity>

        {isExpanded && targets && targets.length > 0 && (
          <View style={styles.productsList}>
            {targets.filter(t => t.type === 'product').map((prod) => (
              <View key={prod.id} style={styles.productCard}>
                <Image
                  source={prod.image ? { uri: prod.image } : require("../assets/restaurant.png")}
                  style={styles.prodImg}
                />
                <View style={styles.prodInfo}>
                  <Text style={styles.prodName} numberOfLines={2}>{prod.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>£{prod.price}</Text>
                    {prod.discount_price > prod.price && (
                      <Text style={styles.oldPrice}>£{prod.discount_price}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.rightActionCol}>
                  {prod.discount_price > prod.price && (
                    <LinearGradient
                      colors={["#FFB800", "#FF8A00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.flashBadge}
                    >
                      <Ionicons name="flash" size={8 * scale} color="#FFF" />
                      <Text style={styles.flashBadgeText}>
                        {Math.round(((prod.discount_price - prod.price) / prod.discount_price) * 100)}% OFF
                      </Text>
                    </LinearGradient>
                  )}
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddItem(prod, restaurant)}
                    disabled={!!updating[prod.id]}
                  >
                    {updating[prod.id] ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.addBtnText}>ADD</Text>
                        <Ionicons name="add" size={12 * scale} color="#FFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {targets.filter(t => t.type === 'product').length === 0 && (
              <Text style={styles.noProductsText}>No items available for this offer.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE724C" />
          }
        >
          <View style={styles.headerBox}>
            <AppHeader
              user={user}
              navigation={navigation}
              cartItems={cartItems}
              statusColor="#FFFFFF"
              textColor="#1C1C1B"
              onMenuPress={() => setMenuVisible(true)}
              transparent={false}
            />
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Hot Deals Near You</Text>
            <View style={styles.headerLine} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#FE724C" />
              <Text style={styles.loadingText}>Finding best deals...</Text>
            </View>
          ) : (
            <>
              {allOffers.length > 0 ? (
                <Animated.View style={{ opacity: fadeAnim, paddingTop: 10, paddingHorizontal: 16 }}>
                  {allOffers.map((offer, idx) => renderOffer(offer, idx))}
                </Animated.View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="gift-outline" size={80 * scale} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No active offers found near you at the moment.</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                    <Text style={styles.retryBtnText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomBar navigation={navigation} activeTab="Offers" />
      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />

      {/* Instruction Modal */}
      <Modal visible={instructionPopupVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.instructionBox}>
            <LinearGradient colors={["#FE724C", "#FF9272"]} style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalHeaderTitle}>SPECIAL INSTRUCTIONS</Text>
            </LinearGradient>

            <View style={{ padding: 24 }}>
              <View style={modalStyles.itemInfoRow}>
                <View style={{ flex: 1 }}>
                  {instructionPopupTarget && (
                    <Text style={modalStyles.itemName} numberOfLines={1}>{instructionPopupTarget.name}</Text>
                  )}
                </View>
                {instructionPopupTarget && (
                  <Text style={modalStyles.itemPrice}>£{Number(instructionPopupTarget.price || 0).toFixed(2)}</Text>
                )}
                <TouchableOpacity onPress={() => setInstructionPopupVisible(false)} style={{ marginLeft: 15 }}>
                  <Ionicons name="close-circle" size={30 * scale} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              <Text style={modalStyles.hintText}>Any specific requests for this item?</Text>

              <TextInput
                style={modalStyles.noteInput}
                placeholder="e.g. Extra spicy, no onions, etc."
                value={instructionNote}
                onChangeText={setInstructionNote}
                multiline
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity onPress={handleSubmitInstructionPopup} style={modalStyles.primaryBtn}>
                <LinearGradient colors={["#FE724C", "#FF9272"]} style={modalStyles.primaryBtnInner}>
                  <Text style={modalStyles.primaryBtnText}>ADD TO CART</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.successBox}>
            <View style={modalStyles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={50 * scale} color="#FE724C" />
            </View>

            <Text style={modalStyles.successTitle}>Added to Cart!</Text>
            <Text style={modalStyles.successSubtitle}>Your item is now in the cart.</Text>

            {savedAmount > 0 && (
              <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} style={modalStyles.savingsBadge}>
                <Ionicons name="gift" size={20} color="#D97706" style={{ marginRight: 10 }} />
                <View>
                  <Text style={modalStyles.savingsLabel}>YOU JUST SAVED</Text>
                  <Text style={modalStyles.savingsAmount}>£{savedAmount.toFixed(2)}</Text>
                </View>
              </LinearGradient>
            )}

            <View style={modalStyles.actionButtons}>
              <TouchableOpacity onPress={() => setSuccessModalVisible(false)} style={modalStyles.secondaryBtn}>
                <Text style={modalStyles.secondaryBtnText}>Add More Items</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setSuccessModalVisible(false); navigation.navigate("CartSummary"); }}>
                <LinearGradient colors={["#FE724C", "#FF9272"]} style={modalStyles.checkoutBtn}>
                  <Ionicons name="basket" size={18} color="#FFF" />
                  <Text style={modalStyles.checkoutBtnText}>View My Cart</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBox: {
    backgroundColor: '#FFFFFF',
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitleRow: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsBold",
    color: "#1C1C1C",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14 * scale,
    color: "#6B7280",
    fontFamily: "PoppinsMedium",
  },
  offerContainer: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  offerCardHeader: {
    width: '100%',
  },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  restoTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  restoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
  },
  restaurantName: {
    fontSize: 13 * scale,
    fontFamily: "PoppinsBold",
    color: "#374151",
    marginLeft: 6,
    fontWeight: "700",
  },
  distanceText: {
    fontSize: 11 * scale,
    color: "#9CA3AF",
    marginLeft: 0,
  },
  offerBanner: {
    height: 160 * scale,
    width: "100%",
    position: "relative",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 30,
  },
  offerTitle: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
    fontWeight: "900",
  },
  offerDesc: {
    fontSize: 12 * scale,
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  productsList: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  prodImg: {
    width: 65 * scale,
    height: 65 * scale,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  prodInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  prodName: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#1E293B",
    flex: 1,
    marginRight: 6,
    lineHeight: 18 * scale,
  },
  flashBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  flashBadgeText: {
    fontSize: 9 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
    fontWeight: "900",
  },
  rightActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  price: {
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    color: "#FE724C",
    fontWeight: "800",
  },
  oldPrice: {
    fontSize: 12 * scale,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    fontFamily: "PoppinsMedium",
  },
  addBtn: {
    backgroundColor: "#FE724C",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
    elevation: 4,
    shadowColor: "#FE724C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addBtnText: {
    fontSize: 12 * scale,
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontWeight: "900",
  },
  noProductsText: {
    fontSize: 12 * scale,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 15 * scale,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#FE724C",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionBox: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  modalHeader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  modalHeaderTitle: {
    color: '#FFF',
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  itemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 20 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1E293B',
    fontWeight: '900',
  },
  itemPrice: {
    fontSize: 18 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1E293B',
    fontWeight: '900',
  },
  hintText: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#64748B',
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 120,
    width: '100%',
    borderRadius: 18,
    padding: 16,
    textAlignVertical: "top",
    fontSize: 15 * scale,
    color: "#1E293B",
    marginBottom: 24,
    fontFamily: 'PoppinsMedium',
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  successBox: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  successIconCircle: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD1DC',
  },
  successTitle: {
    fontSize: 22 * scale,
    fontFamily: 'PoppinsBold',
    color: '#0F172A',
    fontWeight: '900',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  savingsBadge: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  savingsLabel: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsBold',
    color: '#B45309',
    letterSpacing: 1,
  },
  savingsAmount: {
    fontSize: 18 * scale,
    fontFamily: 'PoppinsBold',
    color: '#92400E',
    fontWeight: '900',
  },
  actionButtons: {
    width: '100%',
    marginTop: 30,
    gap: 12,
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15 * scale,
    fontFamily: 'PoppinsBold',
    color: '#475569',
    fontWeight: '800',
  },
  checkoutBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    fontSize: 15 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFF',
    fontWeight: '800',
  },
});

