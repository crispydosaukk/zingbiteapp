import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { PermissionsAndroid, Platform } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import AppHeader from "../AppHeader";
import BottomBar from "../BottomBar";
import MenuModal from "../MenuModal";
import LinearGradient from "react-native-linear-gradient";
import { fetchCategories } from "../../services/categoryService";
import {
  fetchRestaurantDetails,
  fetchRestaurantTimings,
} from "../../services/restaurantService";
import { getCart, addToCart } from "../../services/cartService";
import { RefreshControl } from "react-native";
import useRefresh from "../../hooks/useRefresh";
import { fetchAppSettings } from "../../services/settingsService";
import { fetchActiveOffers } from "../../services/offerService";
// import { IMAGE_BASE_URL } from "../../config/baseURL";
import DateTimePicker from "@react-native-community/datetimepicker";
import { submitTableReservation } from "../../services/reservationService";


const { width } = Dimensions.get("window");
const scale = width / 400;

export default function Categories({ route, navigation }) {
  const { userId } = route?.params || {};
  const isFocused = useIsFocused();

  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [timings, setTimings] = useState([]);
  const [timingsLoading, setTimingsLoading] = useState(false);
  const [todayTiming, setTodayTiming] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [promoOffers, setPromoOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [updating, setUpdating] = useState({});
  const [instructionPopupVisible, setInstructionPopupVisible] = useState(false);
  const [instructionNote, setInstructionNote] = useState("");
  const [instructionPopupTarget, setInstructionPopupTarget] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [isOffersOpen, setIsOffersOpen] = useState(false);
  const [reservationModalVisible, setReservationModalVisible] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    party_size: "2",
    table_number: "",
    duration_minutes: "60",
    reservation_date: new Date(),
    reservation_time: new Date(),
    special_requests: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationSuccessVisible, setReservationSuccessVisible] = useState(false);
  const reservationScaleAnim = useRef(new Animated.Value(0)).current;

  const offersAnim = useRef(new Animated.Value(0)).current;

  const toggleOffers = () => {
    const toValue = isOffersOpen ? 0 : 1;
    Animated.timing(offersAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsOffersOpen(!isOffersOpen);
  };

  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const offerScrollX = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [textIndex, setTextIndex] = useState(0);
  const offers = [
    { colors: ["#FF2B5C", "#FF6B8B"], textColor: "#FFFFFF", icon: "flash" },
    { colors: ["#FF416C", "#FF4B2B"], textColor: "#FFFFFF", icon: "leaf" },
    { colors: ["#F2994A", "#F2C94C"], textColor: "#5D4037", icon: "wallet" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchAppSettings();
      if (data) setSettings(data);
      const offersData = await fetchActiveOffers();
      setPromoOffers(offersData || []);
    };
    loadSettings();
  }, []);
  const animatedTexts = settings ? [
    `EARN £${Number(settings.earn_per_order_amount).toFixed(2)} ON EVERY ORDER`,
    `REFER & EARN £${Number(settings.referral_bonus_amount).toFixed(2)}`,
    `£${Number(settings.signup_bonus_amount).toFixed(2)} WELCOME BONUS`,
  ] : [];
  const formatTime = (t) => (!t ? "" : t.slice(0, 5));

  const FOOD_TYPE_MAP = { 0: '🥦 Veg', 1: '🍗 Non-Veg', 2: '🌿 Jain' };
  const CUISINE_MAP = {
    0: { label: 'Indian', emoji: '🍛' },
    1: { label: 'Afghan', emoji: '🫕' },
    2: { label: 'Pakistani', emoji: '🍲' },
    3: { label: 'Chinese', emoji: '🥡' },
    4: { label: 'Italian', emoji: '🍕' },
    5: { label: 'Thai', emoji: '🍜' },
    6: { label: 'Mexican', emoji: '🌮' },
    7: { label: 'Fried Chicken', emoji: '🍗' },
  };

  const formatFoodType = (val) => {
    if (!val && val !== 0) return 'Not specified';
    const arr = Array.isArray(val)
      ? val
      : String(val).split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
    const labels = arr.map(v => FOOD_TYPE_MAP[v]).filter(Boolean);
    return labels.length > 0 ? labels.join(', ') : 'Not specified';
  };

  const formatCuisineType = (val) => {
    if (!val && val !== 0) return 'Not specified';
    const arr = Array.isArray(val)
      ? val
      : String(val).split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
    const labels = arr.map(v => CUISINE_MAP[v]).filter(Boolean).map(c => `${c.emoji} ${c.label}`);
    return labels.length > 0 ? labels.join('  ·  ') : 'Not specified';
  };

  const openInMaps = (address, lat, lng) => {
    const query = lat && lng
      ? `geo:${lat},${lng}?q=${encodeURIComponent(address)}`
      : `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(query).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)
    );
  };

  // offer text animation
  useEffect(() => {
    const animate = () => {
      if (animatedTexts.length === 0) return;
      fadeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTextIndex((p) => {
          const next = (p + 1) % animatedTexts.length;
          setActiveIndex(next % offers.length);
          return next;
        });
        animate();
      });
    };
    animate();
  }, [animatedTexts.length]);

  // load user
  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem("user");
      if (s) {
        const u = JSON.parse(s);
        setUser(u);
        setReservationForm(prev => ({
          ...prev,
          customer_name: u.full_name || u.name || "",
          customer_email: u.email || "",
          customer_phone: u.mobile_number || "",
        }));
      }
    })();
  }, []);

  // restaurant details
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const d = await fetchRestaurantDetails(userId);
      setRestaurant(d);
    })();
  }, [userId]);

  // categories
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const d = await fetchCategories(userId);
      if (mounted) setCategories(Array.isArray(d) ? d : []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // today timing
  useEffect(() => {
    if (!restaurant?.id) return;
    (async () => {
      const d = await fetchRestaurantTimings(restaurant.id);
      if (!d?.length) return;
      const today = new Date().toLocaleString("en-US", { weekday: "long" });
      const t = d.find((i) => i.day === today);
      setTodayTiming(t || null);
    })();
  }, [restaurant]);

  // cart
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const id = user.id ?? user.customer_id;
      if (!id) return;
      const res = await getCart(id);
      if (res?.status === 1 && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach((i) => {
          if (i.product_quantity > 0) map[i.product_id] = i.product_quantity;
        });
        setCartItems(map);
      }
    };
    if (isFocused) load();
  }, [isFocused, user]);

  const openTimingsModal = async () => {
    if (!restaurant?.id) return;
    setModalVisible(true);
    setTimingsLoading(true);
    const data = await fetchRestaurantTimings(restaurant.id);
    setTimings(data || []);
    setTimingsLoading(false);
  };

  const filteredCategories = categories.filter((c) =>
    (c?.name || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const { refreshing, onRefresh } = useRefresh(async () => {
    // Reload settings
    const sData = await fetchAppSettings();
    if (sData) setSettings(sData);

    // Reload offers
    const offersData = await fetchActiveOffers();
    setPromoOffers(offersData || []);

    // Reload restaurant
    const d = await fetchRestaurantDetails(userId);
    setRestaurant(d);

    // Reload categories
    const c = await fetchCategories(userId);
    setCategories(Array.isArray(c) ? c : []);

    // Reload timings
    if (d?.id) {
      const t = await fetchRestaurantTimings(d.id);
      const today = new Date().toLocaleString("en-US", { weekday: "long" });
      setTodayTiming(t.find((i) => i.day === today) || null);
    }

    // Reload cart
    if (user) {
      const id = user.id ?? user.customer_id;
      const res = await getCart(id);
      if (res?.status === 1 && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach((i) => {
          if (i.product_quantity > 0) map[i.product_id] = i.product_quantity;
        });
        setCartItems(map);
      }
    }
  });

  const handleAddItem = (item) => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to add items to your cart.", [
        { text: "Cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }
    setInstructionPopupTarget(item);
    setInstructionNote("");
    setInstructionPopupVisible(true);
  };

  const handleSubmitInstructionPopup = async () => {
    const item = instructionPopupTarget;
    if (!item || !user) return;
    setUpdating(prev => ({ ...prev, [item.id]: true }));
    try {
      const currentQty = cartItems[item.id] || 0;
      const res = await addToCart({
        customer_id: user.id ?? user.customer_id,
        user_id: item.user_id || userId,
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

        // Saved Amount Calculation
        const discountValue = item.discount_price || item.product_discount_price || 0;
        let saved = 0;
        if (discountValue && Number(discountValue) > Number(item.price)) {
          saved = Number(discountValue) - Number(item.price);
        }

        setSavedAmount(saved);
        setInstructionPopupVisible(false);
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

  const handleReserveTable = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to reserve a table.", [
        { text: "Cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }

    if (!reservationForm.customer_name) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }

    setReservationSubmitting(true);
    try {
      const res = await submitTableReservation({
        user_id: userId, // restaurant owner id
        customer_id: user.id, // customer id for notifications
        customer_name: reservationForm.customer_name,
        customer_phone: reservationForm.customer_phone,
        customer_email: reservationForm.customer_email,
        table_number: reservationForm.table_number,
        party_size: parseInt(reservationForm.party_size) || 1,
        reservation_date: reservationForm.reservation_date.toISOString().split('T')[0],
        reservation_time: reservationForm.reservation_time.toTimeString().split(' ')[0],
        duration_minutes: parseInt(reservationForm.duration_minutes) || 60,
        special_requests: reservationForm.special_requests,
      });

      if (res.status === 1) {
        setReservationModalVisible(false);
        // Show custom success modal
        setReservationSuccessVisible(true);
        Animated.spring(reservationScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();

        // Reset form partially
        setReservationForm(prev => ({
          ...prev,
          party_size: "2",
          table_number: "",
          duration_minutes: "60",
          special_requests: "",
        }));
      } else {
        Alert.alert("Error", res.message || "Could not submit reservation.");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setReservationSubmitting(false);
    }
  };

  const renderCategory = ({ item, index }) => {
    const isEven = index % 2 === 0;

    // Check if this category has an active offer
    const hasOffer = (promoOffers || []).some(o =>
      o.targets?.some(t => t.type === 'category' && t.id === item.id)
    );

    return (
      <TouchableOpacity
        style={cardStyles.wideCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("Products", { userId, categoryId: item.id })
        }
      >
        <LinearGradient
          colors={isEven ? ["#FFF", "#FDF2F8"] : ["#FFF", "#FFF5F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.cardGradient}
        >
          {hasOffer && (
            <View style={cardStyles.offerBadgeWrapper}>
              <LinearGradient
                colors={["#FFB800", "#FF8A00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cardStyles.offerBadgeRibbon}
              >
                <Ionicons name="flash" size={10} color="#FFF" />
                <Text style={cardStyles.offerBadgeText}>Offer</Text>
              </LinearGradient>
            </View>
          )}

          <View style={cardStyles.cardInfo}>
            <Text style={cardStyles.categoryName}>{item?.name}</Text>
            <View style={cardStyles.exploreRow}>
              <LinearGradient
                colors={["#FFF5F5", "#FFE4E6"]}
                style={cardStyles.exploreBadge}
              >
                <View style={cardStyles.exploreContent}>
                  <Ionicons name="restaurant-outline" size={13 * scale} color="#FF2B5C" style={{ marginRight: 6 }} />
                  <Text style={[cardStyles.exploreText, { color: '#FF2B5C' }]}>
                    Explore menu
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={cardStyles.floatingImageContainer}>
            <View style={[cardStyles.imageShadow, { shadowColor: '#FF2B5C' }]}>
              <Image
                source={
                  item?.image
                    ? { uri: item.image }
                    : require("../../assets/restaurant.png")
                }
                style={cardStyles.roundImage}
              />
            </View>
            <View style={cardStyles.arrowCirc}>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const timeLabel = todayTiming
    ? todayTiming.is_active
      ? `${formatTime(todayTiming.opening_time)} - ${formatTime(
        todayTiming.closing_time
      )}`
      : "Closed Today"
    : "Loading...";

  const highlightAmount = (text) => {
    if (!settings) return <Text style={styles.offerText}>{text}</Text>;
    const regex = new RegExp(`(£\\s?${Number(settings.signup_bonus_amount).toFixed(2)}|£${Number(settings.signup_bonus_amount).toFixed(2)}|£\\s?${Number(settings.referral_bonus_amount).toFixed(2)}|£${Number(settings.referral_bonus_amount).toFixed(2)}|£\\s?${Number(settings.earn_per_order_amount).toFixed(2)}|£${Number(settings.earn_per_order_amount).toFixed(2)})`, 'i');
    const parts = text.split(regex);

    return (
      <Text style={[styles.offerText, { color: "#FFFFFF" }]} numberOfLines={1}>
        {parts[0]}
        {parts[1] && (
          <Text style={styles.offerAmount}>{parts[1]}</Text>
        )}
        {parts[2]}
      </Text>
    );
  };



  return (
    // 🔧 only left/right safe insets so we don't double-pad   return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={styles.mainScroll}
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

        <View style={styles.brandSectionScrolling}>
          {/* DYNAMIC COLOR OFFER PILL */}
          {settings && animatedTexts.length > 0 && (
            <Animated.View style={[styles.premiumOfferWrap, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={offers[activeIndex]?.colors || ["#FF2B5C", "#FF6B8B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumOfferInner}
              >
                <View style={styles.offerIconBadge}>
                  <Ionicons name={offers[activeIndex]?.icon || "gift"} size={18 * scale} color="#FFFFFF" />
                </View>
                <View style={styles.offerTextContainer}>
                  {highlightAmount(animatedTexts[textIndex])}
                </View>
                <View style={[styles.glowingDot, { backgroundColor: '#FFFFFF' }]} />
              </LinearGradient>
            </Animated.View>
          )}

          {/* FULL-WIDTH RESTAURANT INFO SECTION */}
          {restaurant && (
            <View style={styles.fullWidthInfoContainer}>
              <View style={styles.infoContent}>
                <View style={styles.imageColumn}>
                  <Image
                    source={
                      restaurant?.restaurant_photo
                        ? { uri: restaurant.restaurant_photo }
                        : require("../../assets/restaurant.png")
                    }
                    style={styles.fullBoutiqueImage}
                  />
                </View>

                <View style={styles.textColumn}>
                  <View style={styles.nameHeaderRowWide}>
                    <Text style={styles.fullBoutiqueName}>{restaurant.restaurant_name}</Text>
                    <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoIconBtnCorner}>
                      <Ionicons name="information-circle-outline" size={28} color="#FF2B5C" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoRowCompact}>
                    <Ionicons name="location" size={14} color="#FF2B5C" />
                    <Text style={styles.locTextCompact} numberOfLines={1}>
                      {restaurant.restaurant_address}
                    </Text>
                  </View>

                  <View style={styles.serviceRowSingleLine}>
                    {restaurant.instore && (
                      <View style={styles.serviceChipMinimal}>
                        <Ionicons name="storefront" size={14 * scale} color="#FF2B5C" />
                        <Text style={[styles.serviceChipTextMinimal, { color: '#FF2B5C' }]}>In-store</Text>
                      </View>
                    )}
                    {restaurant.kerbside && (
                      <View style={styles.serviceChipMinimal}>
                        <Ionicons name="car-sport" size={16 * scale} color="#FF2B5C" />
                        <Text style={[styles.serviceChipTextMinimal, { color: '#FF2B5C' }]}>Kerbside</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.fullCardFooterCompact}>
                <View style={styles.footerRowItem}>
                  <Ionicons name="call" size={16 * scale} color="#FF2B5C" />
                  <Text style={styles.footerTextSmall}>{restaurant.restaurant_phonenumber}</Text>
                </View>

                <View style={styles.vDividerSmall} />

                <View style={styles.footerRowItem}>
                  <Ionicons name="time" size={16 * scale} color="#FF2B5C" />
                  <Text style={styles.footerTextSmall}>{timeLabel}</Text>
                </View>

                <TouchableOpacity style={styles.detailsChevron} onPress={openTimingsModal}>
                  <Ionicons name="chevron-forward" size={18} color="#FF2B5C" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {restaurant && (
            <TouchableOpacity
              style={styles.reserveTableBtn}
              onPress={() => setReservationModalVisible(true)}
            >
              <LinearGradient
                colors={["#FF2B5C", "#FF6B8B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reserveTableGradient}
              >
                <Ionicons name="calendar-outline" size={20 * scale} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.reserveTableBtnText}>Reserve A Table</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* DROPDOWN OFFERS SECTION - Inline with ScrollView */}
        {promoOffers.length > 0 && (
          <View style={styles.inlineOfferSection}>
            <TouchableOpacity
              style={offerStyles.offerToggleHeaderInline}
              activeOpacity={0.8}
              onPress={toggleOffers}
            >
              <View style={offerStyles.offerHeaderRow}>
                <View style={[offerStyles.offerTitleBadge, { backgroundColor: '#FFF5F5', borderColor: '#FFD1DC', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }]}>
                  <Ionicons name="pricetag" size={16 * scale} color="#FF2B5C" />
                  <Text style={offerStyles.offerSectionTitle}>Current Special Offers</Text>
                </View>
                <View style={offerStyles.headerRight}>
                  <Text style={offerStyles.offerCount}>{promoOffers.length} available</Text>
                  <Ionicons
                    name={isOffersOpen ? "chevron-down" : "chevron-up"}
                    size={22 * scale}
                    color="#FF2B5C"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
            </TouchableOpacity>

            <Animated.View
              style={{
                height: offersAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 260 * scale] // Content height
                }),
                overflow: 'hidden'
              }}
            >
              <Animated.ScrollView
                horizontal
                snapToInterval={width - 28}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
                  { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={offerStyles.offerScrollContent}
              >
                {promoOffers.map((offer, idx) => (
                  <TouchableOpacity
                    key={offer.id}
                    style={offerStyles.offerCardInline}
                    activeOpacity={0.9}
                    onPress={() => setSelectedOffer(selectedOffer?.id === offer.id ? null : offer)}
                  >
                    <View style={offerStyles.offerCardGrad}>
                      {offer.banner_image ? (
                        <Image source={{ uri: offer.banner_image }} style={offerStyles.offerBannerImgSmall} resizeMode="cover" />
                      ) : (
                        <LinearGradient colors={idx % 3 === 0 ? ['#FF2B5C', '#FF6B8B'] : idx % 3 === 1 ? ['#7C3AED', '#A855F7'] : ['#0F766E', '#14B8A6']} style={offerStyles.offerBannerImgSmall}>
                          <Ionicons name="gift" size={32 * scale} color="rgba(255,255,255,0.9)" />
                        </LinearGradient>
                      )}
                      <View style={offerStyles.offerCardContent}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View style={offerStyles.offerBadgePill}>
                            <Text style={offerStyles.offerBadgeText}>EXCLUSIVE</Text>
                          </View>
                          <Text style={offerStyles.offerCardTitle} numberOfLines={1}>{offer.title}</Text>
                          <Text style={offerStyles.offerCardDesc} numberOfLines={1}>{offer.description || 'Tap for details'}</Text>
                        </View>
                        <View style={offerStyles.offerActionContainer}>
                          <View style={offerStyles.offerClickCirc}><Ionicons name="chevron-forward" size={16 * scale} color="#FFF" /></View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>

              {/* Pagination Dots */}
              {promoOffers.length > 1 && (
                <View style={offerStyles.dotContainer}>
                  {promoOffers.map((_, i) => {
                    const step = width - 28;
                    const inputRange = [(i - 1) * step, i * step, (i + 1) * step];
                    const dotWidth = bannerScrollX.interpolate({
                      inputRange,
                      outputRange: [6, 18, 6],
                      extrapolate: 'clamp',
                    });
                    const bgColor = bannerScrollX.interpolate({
                      inputRange,
                      outputRange: ['#E2E8F0', '#FF2B5C', '#E2E8F0'],
                      extrapolate: 'clamp',
                    });
                    return (
                      <Animated.View
                        key={`dot-${i}`}
                        style={[
                          offerStyles.dot,
                          { width: dotWidth, backgroundColor: bgColor, marginHorizontal: 3 }
                        ]}
                      />
                    );
                  })}
                </View>
              )}
            </Animated.View>
          </View>
        )}

        {/* SEARCH BOX */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#aaaaaa"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* CATEGORY GRID */}
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredCategories}
            numColumns={1}
            renderItem={renderCategory}
            scrollEnabled={false}
            keyExtractor={(i) => i.id.toString()}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>

      {/* Reservation Modal */}
      <Modal visible={reservationModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Reserve a Table</Text>
              <TouchableOpacity onPress={() => setReservationModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={modalStyles.formScroll}>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Full Name</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="Enter your name"
                  value={reservationForm.customer_name}
                  onChangeText={(val) => setReservationForm({ ...reservationForm, customer_name: val })}
                />
              </View>

              <View style={modalStyles.row}>
                <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={modalStyles.label}>Phone Number</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                    value={reservationForm.customer_phone}
                    onChangeText={(val) => setReservationForm({ ...reservationForm, customer_phone: val })}
                  />
                </View>
                <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Party Size</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="No. of people"
                    keyboardType="numeric"
                    value={reservationForm.party_size}
                    onChangeText={(val) => setReservationForm({ ...reservationForm, party_size: val })}
                  />
                </View>
              </View>

              <View style={modalStyles.row}>
                <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={modalStyles.label}>Table Number (Optional)</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="e.g. T1"
                    value={reservationForm.table_number}
                    onChangeText={(val) => setReservationForm({ ...reservationForm, table_number: val })}
                  />
                </View>
                <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Duration (Min)</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="e.g. 60"
                    keyboardType="numeric"
                    value={reservationForm.duration_minutes}
                    onChangeText={(val) => setReservationForm({ ...reservationForm, duration_minutes: val })}
                  />
                </View>
              </View>

              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Email Address</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  value={reservationForm.customer_email}
                  onChangeText={(val) => setReservationForm({ ...reservationForm, customer_email: val })}
                />
              </View>

              <View style={modalStyles.row}>
                <View style={[modalStyles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={modalStyles.label}>Date</Text>
                  <TouchableOpacity style={modalStyles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={18} color="#FF2B5C" />
                    <Text style={modalStyles.pickerText}>{reservationForm.reservation_date.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[modalStyles.inputGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Time</Text>
                  <TouchableOpacity style={modalStyles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                    <Ionicons name="time-outline" size={18} color="#FF2B5C" />
                    <Text style={modalStyles.pickerText}>{reservationForm.reservation_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Special Requests</Text>
                <TextInput
                  style={[modalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Any special requests or instructions?"
                  multiline
                  numberOfLines={4}
                  value={reservationForm.special_requests}
                  onChangeText={(val) => setReservationForm({ ...reservationForm, special_requests: val })}
                />
              </View>

              <TouchableOpacity
                style={[modalStyles.submitBtn, reservationSubmitting && { opacity: 0.7 }]}
                onPress={handleReserveTable}
                disabled={reservationSubmitting}
              >
                {reservationSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={modalStyles.submitBtnText}>Confirm Reservation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>

            {showDatePicker && (
              <DateTimePicker
                value={reservationForm.reservation_date}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setReservationForm({ ...reservationForm, reservation_date: date });
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={reservationForm.reservation_time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setReservationForm({ ...reservationForm, reservation_time: date });
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Voice Overlay - Modal for absolute visibility */}

      <MenuModal
        visible={menuVisible}
        setVisible={setMenuVisible}
        user={user}
        navigation={navigation}
      />

      {/* PREMIUM SELECTED OFFER MODAL */}
      {selectedOffer && (
        <Modal transparent animationType="fade" visible={!!selectedOffer}>
          <View style={styles.modalWrapper}>
            <Animated.View style={[styles.modalBox, { maxHeight: '85%', padding: 0, overflow: 'hidden', backgroundColor: '#F8FAFC' }]}>
              {/* Premium Header */}
              <LinearGradient
                colors={['#FF2B5C', '#FF6B8B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={offerStyles.premiumModalHeader}
              >
                <View style={{ flex: 1 }}>
                  <View style={offerStyles.modalBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={offerStyles.modalBadgeText}>EXCLUSIVE ITEMS</Text>
                  </View>
                  <Text style={offerStyles.premiumModalTitle} numberOfLines={1}>{selectedOffer.title}</Text>
                  <Text style={offerStyles.premiumModalSub} numberOfLines={1}>{selectedOffer.description || "Unlock these special deals!"}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOffer(null)} style={offerStyles.modalCloseCirc}>
                  <Ionicons name="close" size={24} color="#FF2B5C" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1, flexGrow: 0, width: '100%' }}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
              >
                {selectedOffer.targets?.filter(t => t.type === 'product').map((item, idx) => {
                  const discountValue = item.discount_price || item.product_discount_price;
                  const hasDiscount = discountValue && Number(discountValue) > Number(item.price);
                  const discountPercent = hasDiscount ? Math.round(((Number(discountValue) - Number(item.price)) / Number(discountValue)) * 100) : 0;

                  return (
                    <View
                      key={idx}
                      style={offerStyles.premiumItemCard}
                    >
                      <View style={offerStyles.premiumImageWrap}>
                        <Image
                          source={item.image ? { uri: item.image } : require("../../assets/restaurant.png")}
                          style={offerStyles.premiumItemImage}
                        />
                        {hasDiscount && (
                          <LinearGradient colors={['#FFB800', '#FF8A00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={offerStyles.premiumDiscountBadge}>
                            <Text style={offerStyles.premiumDiscountText}>{discountPercent}% OFF</Text>
                          </LinearGradient>
                        )}
                      </View>

                      <View style={offerStyles.premiumItemInfo}>
                        <Text style={offerStyles.premiumItemName} numberOfLines={2}>{item.name}</Text>

                        <View style={offerStyles.premiumPriceActionRow}>
                          <View style={{ flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                              <Text style={offerStyles.premiumActualPrice}>£{Number(item.price || 0).toFixed(2)}</Text>
                              {hasDiscount && (
                                <Text style={[offerStyles.premiumOriginalPrice, { marginLeft: 8 }]}>£{Number(discountValue).toFixed(2)}</Text>
                              )}
                            </View>
                            {hasDiscount && (
                              <View style={offerStyles.discountBadgeSmall}>
                                <Text style={offerStyles.discountBadgeTextSmall}>
                                  SAVE {discountPercent}%
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[offerStyles.addCircleBtn, { marginTop: 12, justifyContent: 'center' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAddItem(item);
                          }}
                          disabled={!!updating[item.id]}
                        >
                          {updating[item.id] ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="add" size={16 * scale} color="#FFF" />
                              <Text style={offerStyles.addBtnText}>ADD TO CART</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Premium Notes/Instructions Popup */}
      <Modal visible={instructionPopupVisible} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '90%',
            backgroundColor: '#FFF',
            borderRadius: 32,
            overflow: 'hidden',
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
          }}>
            {/* Header Gradient */}
            <LinearGradient
              colors={["#FF2B5C", "#FF6B8B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{
                color: '#FFF',
                fontSize: 16 * scale,
                fontFamily: 'PoppinsBold',
                fontWeight: '900',
                letterSpacing: 1.2,
              }}>SPECIAL INSTRUCTIONS</Text>
            </LinearGradient>

            <View style={{ padding: 24 }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  {instructionPopupTarget && (
                    <Text style={{ fontSize: 20 * scale, fontFamily: 'PoppinsBold', color: '#1E293B', fontWeight: '900' }}>
                      {instructionPopupTarget.name}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                    {instructionPopupTarget && (
                      <Text style={{ fontSize: 18 * scale, fontFamily: 'PoppinsBold', color: '#FF2B5C', fontWeight: '900' }}>
                        £{Number(instructionPopupTarget.price || 0).toFixed(2)}
                      </Text>
                    )}
                    {instructionPopupTarget && (instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price) &&
                      Number(instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price) > Number(instructionPopupTarget.price) && (
                        <Text style={{
                          fontSize: 14 * scale,
                          fontFamily: 'PoppinsMedium',
                          color: '#94A3B8',
                          textDecorationLine: 'line-through',
                        }}>£{Number(instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price).toFixed(2)}</Text>
                      )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setInstructionPopupVisible(false)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={30 * scale} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              {/* Savings Badge */}
              {instructionPopupTarget && (instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price) &&
                Number(instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price) > Number(instructionPopupTarget.price) && (
                  <View style={{
                    backgroundColor: '#FFF5F5',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#FFD1DC',
                  }}>
                    <Ionicons name="sparkles" size={14} color="#FF2B5C" style={{ marginRight: 6 }} />
                    <Text style={{
                      fontSize: 12 * scale,
                      fontFamily: 'PoppinsBold',
                      color: '#FF2B5C',
                      fontWeight: '900',
                    }}>
                      YOU SAVE £{(Number(instructionPopupTarget.discount_price || instructionPopupTarget.product_discount_price) - Number(instructionPopupTarget.price)).toFixed(2)}
                    </Text>
                  </View>
                )}

              <Text style={{
                fontSize: 14 * scale,
                fontFamily: 'PoppinsSemiBold',
                color: '#64748B',
                marginBottom: 10,
              }}>
                Any specific requests for this item?
              </Text>

              <TextInput
                style={{
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
                }}
                placeholder="e.g. Extra spicy, no onions, etc."
                value={instructionNote}
                onChangeText={setInstructionNote}
                multiline
                placeholderTextColor="#94A3B8"
              />

              {/* BUTTONS */}
              <TouchableOpacity
                onPress={handleSubmitInstructionPopup}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={["#FF2B5C", "#FF6B8B"]}
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 16 * scale, fontFamily: 'PoppinsBold', color: '#FFF', fontWeight: '900', letterSpacing: 1 }}>
                    ADD TO CART
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PREMIUM SUCCESS MODAL */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
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
              backgroundColor: '#FFF5F5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
              borderWidth: 2,
              borderColor: '#FFD1DC',
            }}>
              <Ionicons name="checkmark-circle" size={50 * scale} color="#FF2B5C" />
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
                <View>
                  <Text style={{
                    fontSize: 11 * scale,
                    fontFamily: 'PoppinsBold',
                    color: '#B45309',
                    letterSpacing: 1,
                  }}>YOU JUST SAVED</Text>
                  <Text style={{
                    fontSize: 18 * scale,
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
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 15,
                  borderRadius: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 15 * scale,
                  fontFamily: 'PoppinsBold',
                  color: '#475569',
                  fontWeight: '800',
                }}>Continue Shopping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate("CartSummary");
                }}
              >
                <LinearGradient
                  colors={["#FF2B5C", "#FF6B8B"]}
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
          </View>
        </View>
      </Modal>

      {/* TIMINGS MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Restaurant Timings</Text>
            {timingsLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                data={timings}
                keyExtractor={(i) => i.day}
                renderItem={({ item }) => (
                  <View style={styles.modalRow}>
                    <Text style={styles.dayText}>{item.day}</Text>
                    <Text style={styles.timeText}>
                      {item.is_active
                        ? `${formatTime(item.opening_time)} - ${formatTime(
                          item.closing_time
                        )}`
                        : "Closed"}
                    </Text>
                  </View>
                )}
              />
            )}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PREMIUM RESTAURANT INFO MODAL */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '90%',
            backgroundColor: '#FFF',
            borderRadius: 32,
            overflow: 'hidden',
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            maxHeight: '85%'
          }}>
            {/* Header Gradient */}
            <LinearGradient
              colors={["#FF2B5C", "#FF6B8B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 20, alignItems: 'center', paddingHorizontal: 20 }}
            >
              <Text style={{
                color: '#FFF',
                fontSize: 18 * scale,
                fontFamily: 'PoppinsBold',
                fontWeight: '900',
                letterSpacing: 0.5,
              }}>Restaurant Information</Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>

              {/* Contact Information Section */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16 * scale, fontFamily: 'PoppinsBold', color: '#1E293B', marginBottom: 16 }}>Contact</Text>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}
                  onPress={() => openInMaps(restaurant?.restaurant_address, restaurant?.latitude, restaurant?.longitude)}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                    <Ionicons name="location" size={22} color="#FF2B5C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsMedium', color: '#64748B', marginBottom: 2 }}>Address</Text>
                    <Text style={{ fontSize: 15 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B' }}>{restaurant?.restaurant_address || 'Not available'}</Text>
                    <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#FF2B5C', marginTop: 2 }}>📍 Tap to open in Maps</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginTop: 10 }} />
                </TouchableOpacity>

                {restaurant?.restaurant_phonenumber && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }} onPress={() => Linking.openURL(`tel:${restaurant.restaurant_phonenumber}`)}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="call" size={20} color="#FF2B5C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsMedium', color: '#64748B', marginBottom: 2 }}>Phone</Text>
                      <Text style={{ fontSize: 15 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B' }}>{restaurant.restaurant_phonenumber}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}

                {restaurant?.restaurant_email && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }} onPress={() => Linking.openURL(`mailto:${restaurant.restaurant_email}`)}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="mail" size={20} color="#FF2B5C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsMedium', color: '#64748B', marginBottom: 2 }}>Email</Text>
                      <Text style={{ fontSize: 15 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B' }}>{restaurant.restaurant_email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}

                {restaurant?.website_url && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }} onPress={() => Linking.openURL(restaurant.website_url)}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="globe" size={20} color="#FF2B5C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsMedium', color: '#64748B', marginBottom: 2 }}>Website</Text>
                      <Text style={{ fontSize: 15 * scale, fontFamily: 'PoppinsSemiBold', color: '#FF2B5C' }}>Visit Website</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}

                {restaurant?.google_review_link && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }} onPress={() => Linking.openURL(restaurant.google_review_link)}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="star" size={20} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsMedium', color: '#64748B', marginBottom: 2 }}>Google Reviews</Text>
                      <Text style={{ fontSize: 15 * scale, fontFamily: 'PoppinsSemiBold', color: '#F59E0B' }}>Leave a Review ⭐</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />

              {/* Service Details Section */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16 * scale, fontFamily: 'PoppinsBold', color: '#1E293B', marginBottom: 16 }}>Services & Preferences</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {restaurant?.food_type != null && (
                    <View style={{ width: '48%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Ionicons name="restaurant" size={20} color="#FF2B5C" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>Food Type</Text>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 2 }}>{formatFoodType(restaurant?.food_type)}</Text>
                    </View>
                  )}

                  {restaurant?.cuisine_type != null && (
                    <View style={{ width: '100%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Ionicons name="pizza" size={20} color="#FF2B5C" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>Cuisine</Text>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 4, lineHeight: 22 }}>{formatCuisineType(restaurant?.cuisine_type)}</Text>
                    </View>
                  )}

                  <View style={{ width: '48%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <Ionicons name="leaf" size={20} color="#16a34a" style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>Halal</Text>
                    <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 2 }}>{restaurant?.is_halal == 1 ? 'Yes' : 'No'}</Text>
                  </View>

                  {(restaurant?.instore == 1) && (
                    <View style={{ width: '48%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Ionicons name="storefront" size={20} color="#FF2B5C" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>In-store Dining</Text>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 2 }}>Available</Text>
                    </View>
                  )}

                  {(restaurant?.kerbside == 1) && (
                    <View style={{ width: '48%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Ionicons name="car-sport" size={20} color="#0284C7" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>Kerbside Pickup</Text>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 2 }}>Available</Text>
                    </View>
                  )}

                  {restaurant?.parking_info && (
                    <View style={{ width: '100%', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                      <Ionicons name="car" size={20} color="#0284C7" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 12 * scale, fontFamily: 'PoppinsMedium', color: '#64748B' }}>Parking</Text>
                      <Text style={{ fontSize: 13 * scale, fontFamily: 'PoppinsSemiBold', color: '#1E293B', marginTop: 2 }}>{restaurant.parking_info}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Social Channels */}
              {(restaurant?.restaurant_facebook || restaurant?.restaurant_twitter || restaurant?.restaurant_instagram || restaurant?.restaurant_tiktok) && (
                <>
                  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 16 * scale, fontFamily: 'PoppinsBold', color: '#1E293B', marginBottom: 16 }}>Follow Us</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      {restaurant?.restaurant_facebook && (
                        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }} onPress={() => Linking.openURL(restaurant.restaurant_facebook)}>
                          <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_instagram && (
                        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }} onPress={() => Linking.openURL(restaurant.restaurant_instagram)}>
                          <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_twitter && (
                        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }} onPress={() => Linking.openURL(restaurant.restaurant_twitter)}>
                          <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_tiktok && (
                        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }} onPress={() => Linking.openURL(restaurant.restaurant_tiktok)}>
                          <Ionicons name="logo-tiktok" size={22} color="#000000" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={{ padding: 20, paddingTop: 10 }}>
              <TouchableOpacity
                onPress={() => setInfoModalVisible(false)}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={["#FF2B5C", "#FF6B8B"]}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 16 * scale,
                    fontFamily: 'PoppinsBold',
                    color: '#FFF',
                    fontWeight: '900',
                  }}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RESERVATION SUCCESS MODAL */}
      <Modal
        visible={reservationSuccessVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.successCard,
            { transform: [{ scale: reservationScaleAnim }] }
          ]}>
            <View style={styles.successGradient}>
              <View style={styles.checkRing}>
                <Ionicons name="checkmark-circle" size={80 * scale} color="#FF2B5C" />
              </View>

              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMsg}>
                Table reservation request submitted successfully!
              </Text>

              <Text style={styles.enjoyText}>
                We will confirm your reservation soon.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Animated.timing(reservationScaleAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }).start(() => setReservationSuccessVisible(false));
                }}
                style={styles.successCloseBtn}
              >
                <LinearGradient colors={["#FF2B5C", "#FF6B8B"]} style={styles.successCloseBtnGradient}>
                  <Text style={styles.successCloseText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <BottomBar navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainScroll: {
    backgroundColor: "#FFFFFF",
  },
  brandSectionScrolling: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 0, // Removed padding to close gap
  },
  offerAmount: {
    color: "#FBFF00",
    fontWeight: "900",
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // IMMERSIVE BRAND SECTION
  brandSection: {
    paddingBottom: 0,
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
    marginTop: 2,
    marginBottom: 0, // No extra space at bottom
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
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  glowingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E23744",
    marginLeft: 10,
  },

  // FULL WIDTH INFO SECTION - REFINED
  fullWidthInfoContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: -56, // Pull tight to header
  },
  infoContent: {
    flexDirection: 'row',
  },
  imageColumn: {
    width: 90 * scale,
    marginRight: 15,
  },
  fullBoutiqueImage: {
    width: 90 * scale,
    height: 90 * scale,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameHeaderRowWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullBoutiqueName: {
    fontSize: 20 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1C1C1C',
    fontWeight: '900',
    flex: 1,
  },
  infoIconBtnCorner: {
    padding: 2,
  },
  infoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locTextCompact: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  serviceRowSingleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  serviceChipMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceChipTextMinimal: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
  },
  fullCardFooterCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTextSmall: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1C1C1C',
    fontWeight: '900',
  },
  vDividerSmall: {
    width: 1.5,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 15,
  },
  detailsChevron: {
    marginLeft: 'auto',
    backgroundColor: '#F1F5F9',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOfferSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  // SEARCH BOX
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  searchInput: {
    marginLeft: 12,
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    flex: 1,
    color: "#1C1C1C",
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  modalWrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    elevation: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#1C1C1C",
    textAlign: "center",
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
  },
  dayText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#444",
  },
  timeText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#1C1C1C",
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#FF2B5C",
    borderRadius: 14,
  },
  closeText: {
    textAlign: "center",
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
  },
  voiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceOverlayInner: {
    width: '100%',
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
  },
  voiceText: {
    fontSize: 24 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFF",
    marginTop: 20,
  },
  voiceSubtext: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "rgba(255,255,255,0.8)",
    marginTop: 10,
  },
  voiceClose: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  voiceCloseInner: {
    width: 60 * scale,
    height: 60 * scale,
    borderRadius: 30 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  voicePulseCircle: {
    width: 140 * scale,
    height: 140 * scale,
    borderRadius: 70 * scale,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  reserveTableBtn: {
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  reserveTableGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  reserveTableBtnText: {
    color: '#FFFFFF',
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* SUCCESS MODAL STYLES */
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
    backgroundColor: "#FFF",
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
    marginBottom: 10,
  },
  enjoyText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#64748B",
    opacity: 0.8,
    textAlign: "center",
    marginBottom: 25,
  },
  successCloseBtn: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
  },
  successCloseBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  successCloseText: {
    fontSize: 16 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFFFFF",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20 * scale,
    fontFamily: 'PoppinsBold',
    color: '#0F172A',
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  pickerText: {
    fontSize: 15 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#FF2B5C',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#FF2B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 1,
  },
});

const cardStyles = StyleSheet.create({
  wideCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    paddingRight: 15,
  },
  categoryName: {
    fontSize: 19 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  floatingImageContainer: {
    position: 'relative',
  },
  imageShadow: {
    width: 85 * scale,
    height: 85 * scale,
    borderRadius: 42.5 * scale,
    backgroundColor: '#FFF',
    padding: 6,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  roundImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40 * scale,
    resizeMode: 'contain',
  },
  arrowCirc: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
  },
  exploreRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  exploreBadge: {
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#FF2B5C',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  exploreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exploreText: {
    fontSize: 12.5 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  offerBadgeWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  offerBadgeRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomRightRadius: 15,
    gap: 4,
  },
  offerBadgeText: {
    color: '#FFF',
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIconBtn: {
    marginLeft: 6,
    padding: 2,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  infoModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalTitle: {
    fontSize: 22 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1C1C1C',
  },
  infoModalCloseBox: {
    backgroundColor: '#F5F5F5',
    padding: 6,
    borderRadius: 20,
  },
  infoModalContent: {
    paddingBottom: 20,
  },
  infoSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#333',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 10,
  },
  contactIconBg: {
    width: 38 * scale,
    height: 38 * scale,
    backgroundColor: '#FFF0F3',
    borderRadius: 19 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactText: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#444',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#64748B',
    flex: 1,
  },
  detailValue: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowText: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },

  /* POPUP MATCHING PRODUCTS STYLE */
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
    backgroundColor: '#fff'
  },
  popupContent: {
    padding: 24,
    alignItems: "center",
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
    color: "#FF2B5C",
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
    paddingTop: 16,
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#333",
    textAlignVertical: "top",
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  popupRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 12,
  },
  popupPrimaryWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#FF2B5C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  popupPrimaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  popupPrimaryText: {
    color: "#FFF",
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  /* END POPUP STYLES */

  linkText: {
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#4B5563',
  },
  partnersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  partnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  partnerBtnText: {
    color: '#FFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13 * scale,
    marginLeft: 8,
  },
  socialsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialIcon: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#1C1C1C',
    width: 120 * scale,
  },
});

const offerStyles = StyleSheet.create({
  // INLINE DROPDOWN OFFERS
  offerToggleHeaderInline: {
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  offerCardInline: {
    width: width - 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 220 * scale,
  },
  offerBannerImgSmall: {
    width: '100%',
    height: 110 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerToggleHeader: {
    height: 60 * scale,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  offerTitleBadge: {
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  offerBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  offerSectionTitle: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    marginLeft: 5,
  },
  offerCount: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#94A3B8',
  },
  offerScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 12,
  },
  offerCard: {
    width: width - 36,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  offerCardGrad: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  offerBannerImg: {
    width: '100%',
    height: 140 * scale,
    opacity: 0.95,
  },
  offerIconPlaceholder: {
    width: '100%',
    height: 140 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  offerCardContent: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 12,
  },
  offerClickCirc: {
    width: 36 * scale,
    height: 36 * scale,
    borderRadius: 18 * scale,
    backgroundColor: '#FF2B5C',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FF2B5C',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
  },
  offerTapText: {
    fontSize: 8 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    marginTop: 4,
    fontWeight: '900',
  },
  offerBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    gap: 4,
  },
  offerBadgeText: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offerCardTitle: {
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1C1C1C',
    fontWeight: '900',
    marginBottom: 1,
  },
  offerCardDesc: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#64748B',
    lineHeight: 16 * scale,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 0,
  },
  selectedOfferSection: {
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 15,
  },
  selectedOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  selectedOfferTitle: {
    fontSize: 18 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1E293B',
    fontWeight: '900',
  },
  selectedOfferSub: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#64748B',
    marginTop: -2,
  },
  itemsList: {
    paddingVertical: 10,
  },
  itemCard: {
    width: 140 * scale,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    marginRight: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 100 * scale,
    borderRadius: 15,
    backgroundColor: '#EEEEEE',
  },
  itemInfo: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  itemName: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1E293B',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
  },
  itemOriginalPrice: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  itemRowDiscountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF2B5C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  itemRowDiscountText: {
    color: '#FFFFFF',
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
  },
  catLabel: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsBold',
    color: '#94A3B8',
  },
  itemBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemBadgeText: {
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#64748B',
  },
  offerClickHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offerClickHintText: {
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  addCircleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2B5C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 5,
  },
  addBtnText: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFF',
    fontWeight: '900',
  },

  discountBadgeSmall: {
    backgroundColor: 'rgba(255, 43, 92, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  discountBadgeTextSmall: {
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
  },

  // PREMIUM MODAL STYLES ADDED
  premiumModalHeader: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 30,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 0,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    gap: 4,
  },
  modalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  premiumModalTitle: {
    color: '#FFFFFF',
    fontSize: 22 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  premiumModalSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13 * scale,
    fontFamily: 'PoppinsMedium',
  },
  modalCloseCirc: {
    width: 36 * scale,
    height: 36 * scale,
    borderRadius: 18 * scale,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  premiumItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  premiumImageWrap: {
    width: 100 * scale,
    height: 100 * scale,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
  },
  premiumItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    resizeMode: 'cover',
  },
  premiumDiscountBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#FFB800',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#FFF',
  },
  premiumDiscountText: {
    color: '#FFF',
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
  },
  premiumItemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
    minHeight: 90 * scale,
  },
  premiumItemName: {
    fontSize: 15 * scale,
    fontFamily: 'PoppinsBold',
    color: '#1E293B',
    lineHeight: 20 * scale,
    fontWeight: '900',
  },
  premiumPriceActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  premiumOriginalPrice: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  premiumActualPrice: {
    fontSize: 18 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    fontWeight: '900',
  },
});
