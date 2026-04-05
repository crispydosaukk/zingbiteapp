import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import useRefresh from "../../hooks/useRefresh";
import { fetchProducts } from "../../services/productService";
import { addToCart, getCart, removeFromCart } from "../../services/cartService";
import AppHeader from "../AppHeader";
import BottomBar from "../BottomBar";
import MenuModal from "../MenuModal";
import LinearGradient from "react-native-linear-gradient";
import { fetchAppSettings } from "../../services/settingsService";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function Products({ route, navigation }) {
  const { userId, categoryId } = route.params;
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchText, setSearchText] = useState("");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cartItems, setCartItems] = useState({});
  const [notes, setNotes] = useState({});
  const [popupIndex, setPopupIndex] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTargetIds, setPopupTargetIds] = useState(null);
  const [updating, setUpdating] = useState({});
  const [pending, setPending] = useState({});
  const [noteInput, setNoteInput] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [replaceAction, setReplaceAction] = useState(null);

  const bannerHeight = useRef(new Animated.Value(40 * scale)).current;
  const [bannerVisible, setBannerVisible] = useState(true);
  const CONTAINS_ICONS = {
    Dairy: require("../../assets/contains/Dairy.png"),
    Gluten: require("../../assets/contains/Gluten.png"),
    Mild: require("../../assets/contains/Mild.png"),
    Nuts: require("../../assets/contains/Nuts.png"),
    Sesame: require("../../assets/contains/Sesame.png"),
    Vegan: require("../../assets/contains/Vegan.png"),
    Vegetarian: require("../../assets/contains/Vegetarian.png"),
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [textIndex, setTextIndex] = useState(0);
  const offers = [
    { colors: ["#FF416C", "#FF4B2B"], textColor: "#FFFFFF", icon: "flash" },
    { colors: ["#FF2B5C", "#FF6B8B"], textColor: "#FFFFFF", icon: "leaf" },
    { colors: ["#F2994A", "#F2C94C"], textColor: "#5D4037", icon: "wallet" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
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
  const animatedTexts = settings ? [
    `EARN £${Number(settings.earn_per_order_amount).toFixed(2)} ON EVERY ORDER`,
    `REFER & EARN £${Number(settings.referral_bonus_amount).toFixed(2)}`,
    `£${Number(settings.signup_bonus_amount).toFixed(2)} WELCOME BONUS`,
  ] : [];

  const highlightAmount = (text) => {
    if (!settings) return <Text style={styles.offerText}>{text}</Text>;
    const regex = new RegExp(`(£\\s?${Number(settings.signup_bonus_amount).toFixed(2)}|£${Number(settings.signup_bonus_amount).toFixed(2)}|£\\s?${Number(settings.referral_bonus_amount).toFixed(2)}|£${Number(settings.referral_bonus_amount).toFixed(2)}|£\\s?${Number(settings.earn_per_order_amount).toFixed(2)}|£${Number(settings.earn_per_order_amount).toFixed(2)})`, 'i');
    const parts = text.split(regex);

    return (
      <Text style={[styles.offerText, { color: "#FFFFFF" }]} numberOfLines={1}>
        {parts[0]}
        {parts[1] && <Text style={styles.amountHighlight}>{parts[1]}</Text>}
        {parts[2]}
      </Text>
    );
  };


  // animated banner text
  useEffect(() => {
    const run = () => {
      if (animatedTexts.length === 0) return;
      fadeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTextIndex((p) => {
          const next = (p + 1) % animatedTexts.length;
          setActiveIndex(next % offers.length);
          return next;
        });
        run();
      });
    };
    run();
  }, [animatedTexts.length]);

  const collapseBanner = () => {
    Animated.timing(bannerHeight, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setBannerVisible(false));
  };

  const expandBanner = () => {
    setBannerVisible(true);
    Animated.timing(bannerHeight, {
      toValue: 40 * scale,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // load user
  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    })();
  }, []);

  // load products + cart — also re-run when `user` becomes available so quantities show immediately
  useEffect(() => {
    (async () => {
      const data = await fetchProducts(userId, categoryId);
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setFilteredProducts(list);
      setLoading(false);

      try {
        const uid = user?.id ?? user?.customer_id;
        if (uid) {
          const res = await getCart(uid);
          if (res?.status === 1 && Array.isArray(res.data)) {
            const map = {};
            res.data.forEach((i) => {
              if (i.product_quantity > 0) map[i.product_id] = i.product_quantity;
            });
            setCartItems(map);
            return;
          }
        }

        const stored = await AsyncStorage.getItem("cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCartItems(parsed[userId] || {});
        }
      } catch (e) {
        console.warn("Failed to load cart on init", e);
      }
    })();
  }, [userId, categoryId, user]);

  // Reload cart from AsyncStorage whenever this screen is focused
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          // Prefer server-side cart if user is signed in (keeps behavior like Categories)
          const uid = user?.id ?? user?.customer_id;
          if (uid) {
            const res = await getCart(uid);
            if (!active) return;
            if (res?.status === 1 && Array.isArray(res.data)) {
              const map = {};
              res.data.forEach((i) => {
                if (i.product_quantity > 0) map[i.product_id] = i.product_quantity;
              });
              setCartItems(map);
              // server is authoritative; clear any pending flags
              setPending({});
              return;
            }
          }

          // Fallback to local storage
          const stored = await AsyncStorage.getItem("cart");
          if (!active) return;
          if (stored) {
            const parsed = JSON.parse(stored);
            setCartItems(parsed[userId] || {});
          } else {
            setCartItems({});
          }
        } catch (e) {
          console.warn("Failed to load cart on focus", e);
        }
      })();

      return () => {
        active = false;
      };
    }, [userId])
  );

  // Persist cart state to AsyncStorage whenever it changes
  useEffect(() => {
    (async () => {
      try {
        if (!userId) return;
        const stored = await AsyncStorage.getItem("cart");
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[userId] = cartItems || {};
        await AsyncStorage.setItem("cart", JSON.stringify(parsed));
      } catch (e) {
        console.warn("Failed to persist cart", e);
      }
    })();
  }, [cartItems, userId]);

  // search
  useEffect(() => {
    if (!searchText.trim()) setFilteredProducts(products);
    else {
      setFilteredProducts(
        products.filter((i) =>
          i.name.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
  }, [searchText, products]);

  // Cleanup on unmount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Any cleanup logic here
    };
  }, []);

  const { refreshing, onRefresh } = useRefresh(async () => {
    // Reload products
    const data = await fetchProducts(userId, categoryId);
    const list = Array.isArray(data) ? data : [];
    setProducts(list);
    setFilteredProducts(list);
    // Reload cart: prefer server cart when signed-in (keeps parity with Categories)
    try {
      const uid = user?.id ?? user?.customer_id;
      if (uid) {
        const res = await getCart(uid);
        if (res?.status === 1 && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((i) => {
            if (i.product_quantity > 0) map[i.product_id] = i.product_quantity;
          });
          setCartItems(map);
        }
      } else {
        const stored = await AsyncStorage.getItem("cart");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCartItems(parsed[userId] || {});
        }
      }
    } catch (e) {
      console.warn("Failed to reload cart on refresh", e);
    }
  });


  const increment = async (id) => {
    // optimistic update
    const prev = cartItems[id] || 0;
    setCartItems((p) => ({ ...p, [id]: prev + 1 }));
    // If this item is pending (added locally, waiting for special-instructions confirmation), don't sync yet
    if (!user || pending[id]) return;

    setUpdating((s) => ({ ...s, [id]: true }));
    try {
      const prod = products.find((p) => p.id == id);
      if (!prod) return;
      await addToCart({
        customer_id: user.id,
        user_id: prod.user_id,
        product_id: prod.id,
        product_name: prod.name,
        product_price: prod.price,
        product_tax: 0,
        product_quantity: 1,
        textfield: "",
      });
    } catch (e) {
      console.warn("Failed to increment cart item", e);
      // revert
      setCartItems((p) => ({ ...p, [id]: prev }));
    } finally {
      setUpdating((s) => {
        const n = { ...s };
        delete n[id];
        return n;
      });
    }
  };

  const decrement = async (id) => {
    const prev = cartItems[id] || 0;
    if (!prev) return;

    const nextQty = prev - 1;
    // optimistic update
    setCartItems((p) => {
      const u = { ...p };
      if (nextQty <= 0) delete u[id];
      else u[id] = nextQty;
      return u;
    });
    // If this item is pending (not yet synced to server), just update local state
    if (!user || pending[id]) return;

    setUpdating((s) => ({ ...s, [id]: true }));
    try {
      const prod = products.find((p) => p.id == id);
      if (!prod) return;
      // send delta -1
      await addToCart({
        customer_id: user.id,
        user_id: prod.user_id,
        product_id: prod.id,
        product_name: prod.name,
        product_price: prod.price,
        product_tax: 0,
        product_quantity: -1,
        textfield: "",
      });
    } catch (e) {
      console.warn("Failed to decrement cart item", e);
      // revert
      setCartItems((p) => ({ ...p, [id]: prev }));
    } finally {
      setUpdating((s) => {
        const n = { ...s };
        delete n[id];
        return n;
      });
    }
  };

  const startCheckout = () => {
    const ids = Object.keys(cartItems);
    if (ids.length === 0) return alert("Please add some items first.");
    setPopupTargetIds(null);
    setPopupIndex(0);
    setNoteInput(notes[ids[0]] || "");
    setPopupVisible(true);
  };

  // Add item locally and open popup for that single item
  const addAndOpenPopup = async (id) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    try {
      // 1. Check if ANY other restaurant has items in the cart (LocalStorage)
      const stored = await AsyncStorage.getItem("cart");
      const parsed = stored ? JSON.parse(stored) : {};

      // Filter out current restaurant and check if others have quantity > 0
      const otherRestaurants = Object.keys(parsed).filter(rid => rid != userId);
      const hasConflict = otherRestaurants.some(rid => {
        const items = parsed[rid];
        return Object.values(items).some(qty => qty > 0);
      });

      if (hasConflict) {
        setReplaceAction(() => async () => {
          // Show a small loader or just proceed
          const uid = user?.id ?? user?.customer_id;

          if (uid) {
            setLoading(true); // temporary show loader while clearing
            try {
              const res = await getCart(uid);
              if (res?.status === 1 && Array.isArray(res.data)) {
                // Remove everything from server
                await Promise.all(
                  res.data.map(item => removeFromCart(item.cart_id || item.id))
                );
              }
            } catch (err) {
              console.log("Error clearing server cart", err);
            }
          }

          // Clear everything locally
          await AsyncStorage.removeItem("cart");
          setCartItems({});
          setLoading(false);

          // Add the NEW item
          performAddItem(id);
        });
        setReplaceModalVisible(true);
        return;
      }

      // No conflict, proceed normally
      performAddItem(id);

    } catch (e) {
      console.warn("Cart validation error", e);
      performAddItem(id); // fallback
    }
  };

  const performAddItem = (id) => {
    // 1. Immediately open the popup WITHOUT updating the cart state
    // This ensures no delay and the View Cart button doesn't show prematurely
    setPopupTargetIds([id]);
    setPopupIndex(0);
    setNoteInput(notes[id] || "");
    setPopupVisible(true);

    // Mark as pending which we'll use in handleNextPopup
    setPending((s) => ({ ...s, [id]: true }));
  };

  const cartScale = useRef(new Animated.Value(1)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;

  const triggerAddAnimation = () => {
    Animated.sequence([
      Animated.timing(cartScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(cartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerFlyAnimation = (callback) => {
    flyAnim.setValue(1);
    flyY.setValue(0);
    Animated.parallel([
      Animated.timing(flyAnim, {
        toValue: 0,
        duration: 400, // Faster now as requested
        useNativeDriver: true,
      }),
      Animated.timing(flyY, {
        toValue: -400, // Fly upwards towards cart icon
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      flyAnim.setValue(0);
      flyY.setValue(0);
      if (callback) callback();
    });
  };

  const handleNextPopup = async () => {
    const ids = popupTargetIds || Object.keys(cartItems);
    const pid = ids[popupIndex];
    setNotes((p) => ({ ...p, [pid]: noteInput }));

    const prod = products.find((p) => p.id == pid);
    // If this is not the single-item add flow (popupTargetIds), persist cart items for checkout
    if (prod && user) {
      // If this product was locally added (pending), send full quantity to server now.
      if (pending[pid]) {
        await addToCart({
          customer_id: user.id,
          user_id: prod.user_id,
          product_id: prod.id,
          product_name: prod.name,
          product_price: prod.price,
          product_tax: 0,
          product_quantity: cartItems[pid],
          textfield: noteInput || "",
        });
        // clear pending flag for this item
        setPending((s) => {
          const n = { ...s };
          delete n[pid];
          return n;
        });
      }
      // If not pending, we assume increments/decrements already synced with server
    }

    if (popupIndex < ids.length - 1) {
      const next = popupIndex + 1;
      setPopupIndex(next);
      setNoteInput(notes[ids[next]] || "");
    } else {
      // 1. IF we are in the single-item ADD flow (popupTargetIds), NOW we officially add it to cart
      const currentPid = popupIds[0];
      if (popupTargetIds && pending[currentPid]) {
        setCartItems((p) => ({ ...p, [currentPid]: (p[currentPid] || 0) + 1 }));
        triggerAddAnimation();
        triggerFlyAnimation();
        // The server sync (addToCart) will happen below...
      }

      setPopupVisible(false);
      setPopupTargetIds(null);

      // Calculate Savings for success modal
      if (prod) {
        const discountValue = prod.discount_price || prod.product_discount_price || 0;
        let saved = 0;
        if (discountValue && Number(discountValue) > Number(prod.price)) {
          saved = (Number(discountValue) - Number(prod.price)) * (cartItems[pid] || 1);
        }
        setSavedAmount(saved);
        setSuccessModalVisible(true);
      }

      // if coming from single-item add flow, don't navigate away; otherwise, go to CartSummary
      if (!popupTargetIds) {
        setSuccessModalVisible(false); // don't show success modal if navigating to cart
        navigation.navigate("CartSummary", { cartItems, notes, user });
      }
    }
  };

  const handleBackPopup = () => {
    if (popupIndex === 0) return;
    const ids = popupTargetIds || Object.keys(cartItems);
    const prev = popupIndex - 1;
    setPopupIndex(prev);
    setNoteInput(notes[ids[prev]] || "");
  };

  const selectedIds = Object.keys(cartItems);
  const popupIds = popupTargetIds || selectedIds;
  const currentProduct =
    popupVisible && popupIds.length > 0
      ? products.find((p) => p.id == popupIds[popupIndex])
      : null;

  const totalItemsInCart = Object.values(cartItems || {}).reduce((a, b) => a + b, 0);

  const renderItem = ({ item, index }) => {
    const qty = cartItems[item.id] || 0;
    const isEven = index % 2 === 0;
    return (
      <View style={styles.card}>
        <LinearGradient
          colors={isEven ? ["#FFF", "#FDF2F8"] : ["#FFF", "#FFF5F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardContent}
        >
          {/* LEFT: Info */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>

            {!!item.description && (
              <Text style={styles.cardDesc} numberOfLines={3}>
                {item.description}
              </Text>
            )}

            {Array.isArray(item.contains) && item.contains.length > 0 && (
              <View style={styles.containsRow}>
                {item.contains.map((c, index) => {
                  const rawKey = String(c).trim();
                  const key = rawKey.toLowerCase();
                  const ICON_MAP = {
                    dairy: CONTAINS_ICONS.Dairy,
                    gluten: CONTAINS_ICONS.Gluten,
                    mild: CONTAINS_ICONS.Mild,
                    nuts: CONTAINS_ICONS.Nuts,
                    sesame: CONTAINS_ICONS.Sesame,
                    vegan: CONTAINS_ICONS.Vegan,
                    vegetarian: CONTAINS_ICONS.Vegetarian,
                  };
                  const iconSource = ICON_MAP[key];
                  if (iconSource) {
                    return (
                      <View key={index} style={styles.iconCircle}>
                        <Image source={iconSource} style={styles.containsIconSmall} />
                      </View>
                    );
                  }
                  return (
                    <Text key={index} style={{ fontSize: 10, color: '#555', marginRight: 4 }}>{rawKey}</Text>
                  );
                })}
              </View>
            )}

                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.price, { color: '#1C1C1C', fontSize: 18 * scale }]}>£{item.price}</Text>
                    {item.discount_price && Number(item.discount_price) > Number(item.price) && (
                      <Text style={[styles.originalPrice, { fontSize: 13 * scale }]}>£{item.discount_price}</Text>
                    )}
                    {item.discount_price && Number(item.discount_price) > Number(item.price) && (
                      <View style={styles.discountBadgeSmall}>
                        <Text style={styles.discountBadgeTextSmall}>
                          {Math.round(((Number(item.discount_price) - Number(item.price)) / Number(item.discount_price)) * 100)}% OFF
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.discount_price && Number(item.discount_price) > Number(item.price) && (
                    <Text style={{ 
                      fontSize: 11 * scale, 
                      color: '#FE724C', 
                      fontFamily: 'PoppinsBold', 
                      marginTop: 2,
                      fontWeight: '900'
                    }}>
                      Save £{(Number(item.discount_price) - Number(item.price)).toFixed(2)} on this item
                    </Text>
                  )}
                </View>
          </View>

          {/* RIGHT: Image & Action */}
          <View style={styles.imageActionContainer}>
            <View style={styles.imageWrapper}>
              <Image
                source={
                  item.image
                    ? { uri: item.image }
                    : require("../../assets/restaurant.png")
                }
                style={styles.cardImg}
              />
            </View>

            {/* ACTION BUTTONS (Zomato Style) */}
            <View style={styles.actionOverlay}>
              {qty > 0 ? (
                <View style={styles.qtyRowVertical}>
                  <TouchableOpacity
                    style={styles.qtyBtnCircular}
                    onPress={() => decrement(item.id)}
                    disabled={!!updating[item.id]}
                  >
                    {updating[item.id] ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="remove" size={20 * scale} color="#FFF" />
                    )}
                  </TouchableOpacity>

                  <Text style={styles.qtyTextPremium}>{qty}</Text>

                  <TouchableOpacity
                    style={styles.qtyBtnCircular}
                    onPress={() => increment(item.id)}
                    disabled={!!updating[item.id]}
                  >
                    {updating[item.id] ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="add" size={20 * scale} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtnPremium, { borderColor: '#FE724C' }]}
                  onPress={() => addAndOpenPopup(item.id)}
                >
                  <Text style={[styles.addTextPremium, { color: '#FE724C' }]}>ADD</Text>
                  <Ionicons name="add" size={16 * scale} color="#FE724C" style={{ position: 'absolute', right: 5, top: 2, fontWeight: '900' }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <AppHeader
            user={user}
            navigation={navigation}
            onMenuPress={() => setMenuVisible(true)}
            cartItems={cartItems}
            transparent={false}
            textColor="#1C1C1B"
            barStyle="dark-content"
            statusColor="#FFFFFF"
          />
        </View>

        {/* SEARCH BOX */}
        <View style={[styles.searchBoxPremium, { marginTop: 15, marginBottom: 10 }]}>
          <Ionicons name="search-outline" size={18 * scale} color="#777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search our delicious menu..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#aaaaaa"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 24 }} />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.listHeaderComp}>
              <Text style={styles.listHeaderTitle}>Discover Our Menu</Text>
              <View style={styles.listHeaderLine} />
            </View>
            {filteredProducts.map((item, index) => (
              <View key={item.id.toString()}>
                {renderItem({ item, index })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FLYING ANIMATION OBJECT */}
      <Animated.View style={[
        styles.flyingItem,
        {
          opacity: flyAnim,
          transform: [{ translateY: flyY }, { scale: flyAnim }]
        }
      ]}>
        <Ionicons name="fast-food" size={30} color="#FE724C" />
      </Animated.View>

      {/* Professional Glassmorphic sticky 'Go to Cart' button */}
      {selectedIds.length > 0 && (
        <View style={styles.glassStickyBottom}>
          <LinearGradient
            colors={["rgba(248,248,248,0)", "rgba(248,248,248,0.9)", "#f8f8f8"]}
            style={styles.bottomGradient}
          />
          <Animated.View
            style={[
              styles.checkoutWrap,
              { transform: [{ scale: cartScale }] },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate("CartSummary", { cartItems, notes, user })}
            >
              <LinearGradient
                colors={["#FE724C", "#FF9272"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkoutGradient}
              >
                <Ionicons name="cart-outline" size={20 * scale} color="#ffffff" />
                <Text style={styles.checkoutText}>{`View Cart (${totalItemsInCart})`}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <MenuModal
        visible={menuVisible}
        setVisible={setMenuVisible}
        user={user}
        navigation={navigation}
      />

      {/* Premium Notes/Instructions Popup */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            {/* Header Gradient */}
            <LinearGradient
              colors={["#FE724C", "#FF9272"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{
                color: '#FFF',
                fontSize: 16 * scale,
                fontFamily: 'PoppinsBold',
                fontWeight: '900',
                letterSpacing: 1,
              }}>SPECIAL INSTRUCTIONS</Text>
            </LinearGradient>

            <View style={{ padding: 24, backgroundColor: '#FFF' }}>
              <View style={[styles.popupHeaderRow, { alignItems: 'center' }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 }}>
                  <View style={{ flex: 1 }}>
                    {currentProduct && (
                      <Text style={styles.popupTitle} numberOfLines={1}>{currentProduct.name}</Text>
                    )}
                  </View>
                  <View style={{ marginLeft: 15 }}>
                    {currentProduct && (
                      <Text style={[styles.popupPrice, { color: '#1C1C1C' }]}>£{currentProduct.price}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setPopupVisible(false);
                    setPopupTargetIds(null);
                  }}
                  style={styles.popupCloseBtn}
                >
                  <Ionicons name="close-circle" size={28 * scale} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              {/* Savings Badge */}
              {currentProduct && (currentProduct.discount_price || currentProduct.product_discount_price) &&
                Number(currentProduct.discount_price || currentProduct.product_discount_price) > Number(currentProduct.price) && (
                  <View style={{
                    backgroundColor: '#F0FDF4',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#DCFCE7',
                  }}>
                    <Ionicons name="sparkles" size={14} color="#16a34a" style={{ marginRight: 6 }} />
                    <Text style={{
                      fontSize: 12 * scale,
                      fontFamily: 'PoppinsBold',
                      color: '#16a34a',
                      fontWeight: '900',
                    }}>
                      YOU SAVE £{(Number(currentProduct.discount_price || currentProduct.product_discount_price) - Number(currentProduct.price)).toFixed(2)}
                    </Text>
                  </View>
                )}

              <Text style={{
                fontSize: 14 * scale,
                fontFamily: 'PoppinsSemiBold',
                color: '#475569',
                marginTop: 10,
                marginBottom: 8,
              }}>
                Any specific requests for this item?
              </Text>

              <TextInput
                style={[styles.popupInput, { marginBottom: 20 }]}
                placeholder="e.g. Extra sauce, no onions, etc."
                value={noteInput}
                onChangeText={setNoteInput}
                multiline
                placeholderTextColor="#94A3B8"
              />

              {/* BUTTONS */}
              <View style={styles.popupRow}>
                {popupIndex > 0 && (
                  <TouchableOpacity
                    style={styles.popupSecondaryBtn}
                    onPress={handleBackPopup}
                  >
                    <Text style={styles.popupSecondaryText}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.popupPrimaryWrap}
                  onPress={handleNextPopup}
                >
                  <LinearGradient
                    colors={["#FE724C", "#FF9272"]}
                    style={styles.popupPrimaryBtn}
                  >
                    <Text style={styles.popupPrimaryText}>
                      {popupIndex === popupIds.length - 1 ? "ADD TO CART" : "CONTINUE"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* PREMIUM SUCCESS MODAL */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <Animated.View style={{
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
          }}>
              <View style={{
                width: 80 * scale,
                height: 80 * scale,
                borderRadius: 40 * scale,
                backgroundColor: '#FFF7ED',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#FFEDD5',
              }}>
              <Ionicons name="checkmark-circle" size={50 * scale} color="#FE724C" />
            </View>

            <Text style={{
              fontSize: 22 * scale,
              fontFamily: 'PoppinsBold',
              color: '#0F172A',
              fontWeight: '900',
              textAlign: 'center',
            }}>Added to Cart!</Text>

            <Text style={{
              fontSize: 14 * scale,
              fontFamily: 'PoppinsMedium',
              color: '#64748B',
              textAlign: 'center',
              marginTop: 8,
            }}>
              Your item is now in the cart.
            </Text>

            {savedAmount > 0 && (
              <LinearGradient
                colors={["#FFFBEB", "#FEF3C7"]}
                style={{
                  marginTop: 20,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                }}
              >
                <Ionicons name="gift" size={20} color="#D97706" style={{ marginRight: 10 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 12 * scale,
                    fontFamily: 'PoppinsBold',
                    color: '#B45309',
                    letterSpacing: 0.5,
                  }}>YOU JUST SAVED </Text>
                  <Text style={{
                    fontSize: 16 * scale,
                    fontFamily: 'PoppinsBold',
                    color: '#92400E',
                    fontWeight: '900',
                  }}>£{savedAmount.toFixed(2)}</Text>
                </View>
              </LinearGradient>
            )}

            <View style={{ width: '100%', marginTop: 30, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setSuccessModalVisible(false)}
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 15,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#FE724C',
                }}
              >
                <Text style={{
                  fontSize: 15 * scale,
                  fontFamily: 'PoppinsBold',
                  color: '#FE724C',
                  fontWeight: '800',
                }}>Add More Items</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate("CartSummary");
                }}
              >
                <LinearGradient
                  colors={["#FE724C", "#FF9272"]}
                  style={{
                    paddingVertical: 15,
                    borderRadius: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="basket" size={18} color="#FFF" />
                  <Text style={{
                    fontSize: 15 * scale,
                    fontFamily: 'PoppinsBold',
                    color: '#FFF',
                    fontWeight: '800',
                  }}>View My Cart</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Replace Cart Modal */}
      <Modal visible={replaceModalVisible} transparent animationType="fade" onRequestClose={() => setReplaceModalVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.replaceBox}>
            <LinearGradient
              colors={["#FFF0F1", "#FFE4E6"]}
              style={styles.popupContent}
            >
              <View style={styles.replaceIconCircle}>
                <Ionicons name="warning-outline" size={36 * scale} color="#EF4444" />
              </View>

              <Text style={styles.replaceTitle}>Replace Cart Items?</Text>
              <Text style={styles.replaceMessage}>
                Your cart contains items from another restaurant. Do you want to discard them and start a new order with this restaurant?
              </Text>
              <View style={styles.popupRow}>
                <TouchableOpacity
                  style={styles.popupSecondaryBtn}
                  onPress={() => setReplaceModalVisible(false)}
                >
                  <Text style={styles.popupSecondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.replaceConfirmWrap}
                  onPress={() => { setReplaceModalVisible(false); if (replaceAction) replaceAction(); }}
                >
                  <LinearGradient
                    colors={["#FE724C", "#FF9272"]}
                    style={styles.popupPrimaryBtn}
                  >
                    <Text style={styles.popupPrimaryText}>Replace</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <BottomBar navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // IMMERSIVE BRAND SECTION
  brandSection: {
    paddingBottom: 20,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    zIndex: 10,
  },
  premiumOfferWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  premiumOfferInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  offerIconBadge: {
    width: 32 * scale,
    height: 32 * scale,
    borderRadius: 16 * scale,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  offerText: {
    fontSize: 16 * scale,      // ⬆️ slightly bigger
    fontFamily: "PoppinsBold",
    fontWeight: "900",         // ⬅️ force bold (Android safe)
    letterSpacing: 0.6,
    color: "#000000",          // ⬅️ HARD BLACK
  },

  glowingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E23744",
    marginLeft: 10,
  },
  searchBoxPremium: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  safe: { flex: 1, backgroundColor: "#f8f8f8" },

  amountHighlight: {
    color: "#FBFF00",
    fontWeight: "900",
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  containsRow: {
    flexDirection: "row",
    marginTop: 6,
    flexWrap: "wrap",
  },

  containsIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    marginRight: 6,
    marginBottom: 4,
  },

  banner: {
    width: "100%",
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center" },
  bannerText: {
    color: "#ffffff",
    fontSize: 13 * scale,
    fontWeight: "700",
    marginLeft: 8,
    maxWidth: width * 0.7,
  },
  bannerChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 5,
    marginTop: 10,
  },
  bannerChipText: {
    color: "#ffffff",
    fontSize: 13 * scale,
    fontWeight: "600",
    marginLeft: 6,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: "#ffffff",
    borderRadius: 5,
    elevation: 3,
    marginHorizontal: 16,
    marginTop: 14,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14 * scale,
    color: "#222222",
  },

  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F8F8F8',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 22,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardImg: {
    width: 120 * scale,
    height: 120 * scale,
    borderRadius: 20,
    resizeMode: "cover",
  },
  imageActionContainer: {
    width: 130 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: '#fff',
  },
  actionOverlay: {
    position: 'absolute',
    bottom: -12,
    width: '100%',
    alignItems: 'center',
  },
  addBtnPremium: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FE724C',
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 90 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextPremium: {
    color: "#FE724C",
    fontFamily: "PoppinsBold",
    fontSize: 14 * scale,
    fontWeight: "900",
  },
  qtyRowVertical: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FE724C",
    borderRadius: 10,
    padding: 6,
    elevation: 4,
    minWidth: 90 * scale,
    justifyContent: 'space-between',
  },
  qtyBtnCircular: {
    width: 24 * scale,
    height: 24 * scale,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyTextPremium: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
    fontWeight: '900',
  },
  iconCircle: {
    width: 24 * scale,
    height: 24 * scale,
    borderRadius: 12 * scale,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  containsIconSmall: {
    width: 14 * scale,
    height: 14 * scale,
    resizeMode: "contain",
  },
  cardBody: {
    flex: 1,
    marginRight: 15,
    paddingVertical: 4,
  },
  cardTitle: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "800",
    color: "#1C1C1C",
    lineHeight: 22 * scale,
  },

  cardDesc: {
    fontSize: 11 * scale,
    fontFamily: "PoppinsMedium",
    color: "#777",
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    color: "#1C1C1C",
  },
  originalPrice: {
    fontSize: 12 * scale,
    fontFamily: "PoppinsMedium",
    color: "#94A3B8",
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountBadgeSmall: {
    backgroundColor: 'rgba(254, 114, 76, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 0,
    alignSelf: 'center',
  },
  discountBadgeTextSmall: {
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FE724C',
    fontWeight: '900',
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 4,
  },
  qtyBtn: {
    width: 32 * scale,
    height: 32 * scale,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyText: {
    paddingHorizontal: 15,
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#1C1C1C",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FE724C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 4,
  },
  addText: {
    color: "#ffffff",
    fontSize: 14.5 * scale,    // ⬆️ clearer CTA
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  checkoutWrap: {
    width: width - 32,
    alignSelf: 'center',
    zIndex: 100,
  },
  checkoutBtn: {
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: '#FE724C',
  },
  checkoutText: {
    color: "#ffffff",
    fontSize: 17.5 * scale,   // ⬆️ premium CTA size
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    marginLeft: 10,
    letterSpacing: 0.6,
  },

  glassStickyBottom: {
    position: 'absolute',
    bottom: 60, // Sits above bottom bar
    left: 0,
    right: 0,
    paddingBottom: 15,
    zIndex: 1000,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 100,
    top: -40,
  },
  listHeaderComp: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 20 * scale,
    fontFamily: "PoppinsBold",
    color: "#1C1C1C",
    letterSpacing: -0.5,
    fontWeight: '900',
    marginRight: 15,
  },
  listHeaderLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    borderRadius: 1,
  },

  /* POPUP PREMIUM (MATCHING SIGN OUT STYLE) */
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupBox: {
    width: "85%",
    borderRadius: 25,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    backgroundColor: '#fff' // required for shadow on iOS
  },
  replaceBox: {
    width: "80%",
    borderRadius: 25,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    backgroundColor: '#fff'
  },
  popupContent: {
    padding: 24,
    alignItems: "center",
  },

  /* ICONS */
  replaceIconCircle: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 35 * scale,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  addIconCircle: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 35 * scale,
    backgroundColor: "rgba(255, 43, 92, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 43, 92, 0.2)",
  },

  /* HEADERS */
  replaceTitle: {
    fontSize: 22 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: "center",
  },
  replaceMessage: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#4B5563',
    lineHeight: 20 * scale,
    marginBottom: 24,
    textAlign: "center",
  },

  popupHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  popupTitle: {
    fontSize: 20 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    color: "#0F172A",
  },
  popupPrice: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    color: "#1C1C1C",
  },
  popupCloseBtn: {
    padding: 4,
  },

  popupHint: {
    fontSize: 13 * scale,
    fontFamily: "PoppinsMedium",
    color: "#64748B",
    marginBottom: 12,
    textAlign: 'center'
  },

  popupInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 100,
    width: '100%',
    borderRadius: 16,
    padding: 16,
    textAlignVertical: "top",
    fontSize: 14 * scale,
    color: "#0F172A",
    marginBottom: 24,
    fontFamily: 'PoppinsMedium',
  },

  /* BUTTONS (MATCHING SIGN OUT STYLE) */
  popupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: '100%'
  },
  popupSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6", // Grey background like cancelLogoutStyle
    borderWidth: 0,
  },
  popupSecondaryText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#4B5563",
  },

  popupPrimaryWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  replaceConfirmWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  popupPrimaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: 'center',
    width: '100%'
  },
  popupPrimaryText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "800",
    color: "#ffffff",
  },
  popupTopRow: { display: 'none' }, // hidden now
  popupBackIconWrap: { display: 'none' }, // hidden
  popupTopTitle: { display: 'none' }, // hidden
  replaceCancelText: { display: 'none' },
  replaceConfirmText: { display: 'none' },
  popupTitleRow: { display: 'none' },
  flyingItem: {
    position: 'absolute',
    top: 300,
    left: width / 2 - 15,
    zIndex: 9999,
  },
});
