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
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const offerScrollX = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [textIndex, setTextIndex] = useState(0);
  const offers = [
    { colors: ["#FF416C", "#FF4B2B"], textColor: "#FFFFFF", icon: "flash" },
    { colors: ["#1D976C", "#93F9B9"], textColor: "#004D40", icon: "leaf" },
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
      if (s) setUser(JSON.parse(s));
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

  const handleAddItem = async (item) => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to add items to your cart.", [
        { text: "Cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }

    const pid = item.id;
    setUpdating(prev => ({ ...prev, [pid]: true }));

    try {
      const currentQty = cartItems[pid] || 0;
      const res = await addToCart({
        customer_id: user.id ?? user.customer_id,
        user_id: item.user_id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        product_tax: 0,
        product_quantity: currentQty + 1,
        textfield: "",
      });

      if (res.status === 1) {
        setCartItems(prev => ({ ...prev, [pid]: currentQty + 1 }));
      } else {
        Alert.alert("Error", res.message || "Could not add to cart");
      }
    } catch (err) {
      console.log("Add to cart error:", err);
    } finally {
      setUpdating(prev => ({ ...prev, [pid]: false }));
    }
  };

  const renderCategory = ({ item, index }) => {
    const isEven = index % 2 === 0;
    return (
      <TouchableOpacity
        style={cardStyles.wideCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("Products", { userId, categoryId: item.id })
        }
      >
        <LinearGradient
          colors={isEven ? ["#FFF", "#FDF2F8"] : ["#FFF", "#F0FDF4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.cardGradient}
        >
          <View style={cardStyles.cardInfo}>
            <Text style={cardStyles.categoryName}>{item?.name}</Text>
            <View style={styles.serviceRow}>
              <View style={[styles.serviceChip, { backgroundColor: isEven ? '#FCE7F3' : '#DCFCE7' }]}>
                <Text style={[styles.serviceChipText, { color: isEven ? '#9D174D' : '#166534', fontWeight: '800' }]}>EXPLORE MENU</Text>
              </View>
            </View>
          </View>

          <View style={cardStyles.floatingImageContainer}>
            <View style={[cardStyles.imageShadow, { shadowColor: isEven ? '#DB2777' : '#16a34a' }]}>
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

  const formatFoodType = (types) => {
    if (!types) return '';
    const mapping = {
      '0': 'Veg',
      '1': 'Non Veg',
      '2': 'Vegan',
      '3': 'Egg',
    };
    return String(types).split(',').map(t => mapping[t.trim()] || t).join(', ');
  };

  return (
    // 🔧 only left/right safe insets so we don't double-pad top/bottom
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.brandSection}>
        <LinearGradient
          colors={["#FF2B5C", "#FF6B8B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <AppHeader
          user={user}
          navigation={navigation}
          onMenuPress={() => setMenuVisible(true)}
          cartItems={cartItems}
          transparent
          textColor="#FFFFFF"
          barStyle="light-content"
          statusColor="#FF2B5C"
        />

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

        {/* EXECUTIVE RESTAURANT CARD (The Boutique Experience) */}
        {restaurant && (
          <View style={styles.infoCardWrapper}>
            <View style={styles.executiveCard}>
              <View style={styles.cardHeader}>
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      restaurant?.restaurant_photo
                        ? { uri: restaurant.restaurant_photo }
                        : require("../../assets/restaurant.png")
                    }
                    style={styles.boutiqueImage}
                  />
                  <View style={styles.vegFloatingTag}>
                    <Ionicons name="leaf" size={10} color="#16a34a" />
                    <Text style={styles.vegBadgeText}>PURE VEG</Text>
                  </View>
                </View>

                <View style={styles.executiveInfo}>
                  <View style={styles.nameHeaderRow}>
                    <Text style={styles.boutiqueName}>{restaurant.restaurant_name}</Text>
                    <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoIconBtn}>
                      <Ionicons name="information-circle-outline" size={24} color="#FF2B5C" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.locIconBtn}>
                      <Ionicons name="location" size={14} color="#FF2B5C" />
                    </View>
                    <Text style={styles.locText} numberOfLines={4}>
                      {restaurant.restaurant_address}
                    </Text>
                  </View>

                  <View style={styles.serviceRow}>
                    {restaurant.instore && (
                      <View style={styles.serviceChip}>
                        <Ionicons name="storefront" size={16 * scale} color="#FF2B5C" />
                        <Text style={styles.serviceChipText}>In-store</Text>
                      </View>
                    )}
                    {restaurant.kerbside && (
                      <View style={styles.serviceChip}>
                        <Ionicons name="car-sport" size={18 * scale} color="#16a34a" />
                        <Text style={[styles.serviceChipText, { color: '#16a34a' }]}>Kerbside</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerCol}>
                  <View style={styles.footerIconRow}>
                    <Ionicons name="call" size={14 * scale} color="#FF2B5C" />
                    <Text style={styles.footerValLarge}>{restaurant.restaurant_phonenumber}</Text>
                  </View>
                </View>
                <View style={styles.footerDivider} />
                <View style={styles.footerCol}>
                  <View style={styles.footerIconRow}>
                    <Ionicons name="time" size={14 * scale} color="#FF2B5C" />
                    <Text style={styles.footerValLarge}>{timeLabel}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.detailsCirc} onPress={openTimingsModal}>
                  <Ionicons name="chevron-forward" size={18} color="#FF2B5C" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

      {/* Voice Overlay - Modal for absolute visibility */}

      <MenuModal
        visible={menuVisible}
        setVisible={setMenuVisible}
        user={user}
        navigation={navigation}
      />

      {/* PROMOTIONAL OFFERS BANNER */}
      {promoOffers.length > 0 && (
        <View style={offerStyles.offerSection}>
          <View style={offerStyles.offerHeaderRow}>
            <View style={offerStyles.offerTitleBadge}>
              <Ionicons name="pricetag" size={14} color="#FF2B5C" />
              <Text style={offerStyles.offerSectionTitle}>Available Offers</Text>
            </View>
             <Text style={offerStyles.offerCount}>{promoOffers.length} active</Text>
          </View>
          <View>
            <Animated.ScrollView
              horizontal
              pagingEnabled
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
                  style={offerStyles.offerCard}
                  activeOpacity={0.9}
                  onPress={() => setSelectedOffer(selectedOffer?.id === offer.id ? null : offer)}
                >
                  <LinearGradient
                    colors={idx % 3 === 0 ? ['#FF2B5C', '#FF6B8B'] : idx % 3 === 1 ? ['#7C3AED', '#A855F7'] : ['#0F766E', '#14B8A6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={offerStyles.offerCardGrad}
                  >
                    {offer.banner_image ? (
                      <Image
                        source={{ uri: offer.banner_image }}
                        style={offerStyles.offerBannerImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={offerStyles.offerIconPlaceholder}>
                        <Ionicons name="gift" size={36} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                    <View style={offerStyles.offerCardContent}>
                      <View style={offerStyles.offerBadgePill}>
                        <Ionicons name="sparkles" size={10} color="#FF2B5C" />
                        <Text style={offerStyles.offerBadgeText}>OFFER</Text>
                      </View>
                      <Text style={offerStyles.offerCardTitle} numberOfLines={2}>{offer.title}</Text>
                      {offer.description ? (
                        <Text style={offerStyles.offerCardDesc} numberOfLines={2}>{offer.description}</Text>
                      ) : null}

                      {/* CLICK HINT BUTTON */}
                      <View style={offerStyles.offerClickHint}>
                        <Text style={offerStyles.offerClickHintText}>See Details</Text>
                        <Ionicons name="arrow-forward-circle" size={16} color="rgba(255,255,255,0.9)" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>

            {/* DOT INDICATORS */}
            {promoOffers.length > 1 && (
              <View style={offerStyles.dotContainer}>
                {promoOffers.map((_, i) => {
                  const opacity = bannerScrollX.interpolate({
                    inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });
                  const dotWidth = bannerScrollX.interpolate({
                    inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                    outputRange: [8, 20, 8],
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        offerStyles.dot,
                        { opacity, width: dotWidth, backgroundColor: '#FF2B5C' }
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* SELECTED OFFER ITEMS SECTION (RECOMMENDED STYLE) */}
          {selectedOffer && (
            <Animated.View style={offerStyles.selectedOfferSection}>
              <View style={offerStyles.selectedOfferHeader}>
                <View>
                  <Text style={offerStyles.selectedOfferTitle}>Exclusive Offer Items</Text>
                  <Text style={offerStyles.selectedOfferSub}>Handpicked from {selectedOffer.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOffer(null)}>
                  <Ionicons name="close-circle" size={28} color="#FF2B5C" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator={false}
                style={offerStyles.itemsList}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              >
                {selectedOffer.targets?.filter(t => t.type === 'product').map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={offerStyles.itemRowCard}
                    activeOpacity={0.9}
                    onPress={() => {
                        navigation.navigate("Products", { userId, productId: item.id });
                    }}
                  >
                    <Image
                      source={item.image ? { uri: item.image } : require("../../assets/restaurant.png")}
                      style={offerStyles.itemRowImage}
                    />
                    <View style={offerStyles.itemRowInfo}>
                      <Text style={offerStyles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={offerStyles.itemRowDesc} numberOfLines={1}>{item.description}</Text>
                      <View style={offerStyles.itemPriceRow}>
                        <Text style={offerStyles.itemPrice}>£{Number(item.price || 0).toFixed(2)}</Text>
                        
                        <TouchableOpacity 
                           style={offerStyles.addCircleBtn} 
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
                              <Ionicons name="add" size={18} color="#FFF" />
                              <Text style={offerStyles.addBtnText}>ADD</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      )}

      <BottomBar navigation={navigation} />

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

      {/* RESTAURANT INFO MODAL */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Restaurant Information</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoModalContent}>
              {/* Basic Info */}
              <View style={styles.infoSection}>
                <View style={styles.contactRow}>
                  <View style={styles.contactIconBg}>
                    <Ionicons name="location" size={20} color="#FF2B5C" />
                  </View>
                  <Text style={styles.contactText}>{restaurant?.restaurant_address || 'Address not available'}</Text>
                </View>
                {restaurant?.restaurant_phonenumber && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconBg}>
                      <Ionicons name="call" size={18} color="#FF2B5C" />
                    </View>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${restaurant.restaurant_phonenumber}`)}>
                      <Text style={[styles.contactText, styles.linkText]}>{restaurant.restaurant_phonenumber}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {restaurant?.restaurant_email && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconBg}>
                      <Ionicons name="mail" size={18} color="#FF2B5C" />
                    </View>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:${restaurant.restaurant_email}`)}>
                      <Text style={[styles.contactText, styles.linkText]}>{restaurant.restaurant_email}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {restaurant?.website_url && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconBg}>
                      <Ionicons name="globe" size={18} color="#FF2B5C" />
                    </View>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(restaurant.website_url)}>
                      <Text style={[styles.contactText, styles.linkText]}>{restaurant.website_url}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {restaurant?.google_review_link && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconBg}>
                      <Ionicons name="star" size={18} color="#FF2B5C" />
                    </View>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(restaurant.google_review_link)}>
                      <Text style={[styles.contactText, styles.linkText]}>View Reviews</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Details</Text>

                {restaurant?.food_type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Food Type</Text>
                    <Text style={styles.detailValue}>{formatFoodType(restaurant.food_type)}</Text>
                  </View>
                )}

                {restaurant?.cuisine_type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cuisine</Text>
                    <Text style={styles.detailValue}>{String(restaurant.cuisine_type)}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Halal</Text>
                  <Text style={styles.detailValue}>{restaurant?.is_halal == 1 ? 'Yes' : 'No'}</Text>
                </View>

                {(restaurant?.instore == 1) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>In-store Dining</Text>
                    <Text style={styles.detailValue}>Available</Text>
                  </View>
                )}

                {(restaurant?.kerbside == 1) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kerbside Pickup</Text>
                    <Text style={styles.detailValue}>Available</Text>
                  </View>
                )}

                {restaurant?.parking_info && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Parking</Text>
                    <Text style={styles.detailValue}>{restaurant.parking_info}</Text>
                  </View>
                )}
              </View>

              {/* Social Channels */}
              {(restaurant?.restaurant_facebook || restaurant?.restaurant_twitter || restaurant?.restaurant_instagram || restaurant?.restaurant_linkedin) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Follow Us</Text>
                    <View style={styles.socialsContainer}>
                      {restaurant?.restaurant_facebook && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => Linking.openURL(restaurant.restaurant_facebook)}>
                          <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_instagram && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => Linking.openURL(restaurant.restaurant_instagram)}>
                          <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_twitter && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => Linking.openURL(restaurant.restaurant_twitter)}>
                          <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                        </TouchableOpacity>
                      )}
                      {restaurant?.restaurant_linkedin && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => Linking.openURL(restaurant.restaurant_linkedin)}>
                          <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  mainScroll: {
    marginTop: 0,
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

  // EXECUTIVE BOUTIQUE CARD
  infoCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 15,
  },
  executiveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    position: 'relative',
  },
  boutiqueImage: {
    width: 110 * scale,
    height: 110 * scale,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  vegFloatingTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vegBadgeText: {
    fontSize: 8 * scale,
    fontFamily: "PoppinsBold",
    color: "#16a34a",
    marginLeft: 3,
  },
  executiveInfo: {
    flex: 1,
    marginLeft: 18,
  },
  boutiqueName: {
    fontSize: 20 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: '900',
    color: "#1C1C1C",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,43,92,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  locText: {
    fontSize: 12 * scale,
    fontFamily: "PoppinsMedium",
    color: "#666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 4,
    marginRight: 15,
  },
  serviceChipText: {
    marginLeft: 6,
    fontSize: 14 * scale,
    fontFamily: "PoppinsBold",
    color: "#FF2B5C",
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  footerCol: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 9 * scale,
    fontFamily: "PoppinsBold",
    color: "#AAA",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  footerVal: {
    fontSize: 11 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#333",
  },
  footerValLarge: {
    fontSize: 13.5 * scale,
    fontFamily: "PoppinsBold",
    color: "#1C1C1C",
    marginLeft: 6,
  },
  footerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#EEE",
    marginHorizontal: 15,
  },
  detailsCirc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,43,92,0.08)",
    alignItems: "center",
    justifyContent: "center",
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
  }
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
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
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
  offerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingBottom: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  offerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  offerTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
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
    width: 240 * scale,
    height: 130 * scale,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  offerCardGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  offerBannerImg: {
    width: 100 * scale,
    height: '100%',
    opacity: 0.9,
  },
  offerIconPlaceholder: {
    width: 80 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  offerCardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  offerBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
    gap: 4,
  },
  offerBadgeText: {
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  offerCardTitle: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  offerCardDesc: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsMedium',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
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
    fontSize: 14 * scale,
    fontFamily: 'PoppinsExtraBold',
    color: '#FF2B5C',
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
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  offerClickHintText: {
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFFFFF',
    fontWeight: '900',
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
  },
  itemRowImage: {
    width: 90 * scale,
    height: 90 * scale,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
  },
  itemRowInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  itemRowDesc: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 8,
  },
  addCircleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
  },
  addBtnText: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FFF',
    fontWeight: '900',
  },
});
