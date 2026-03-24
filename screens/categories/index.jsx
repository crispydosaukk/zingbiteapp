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
  const [instructionPopupVisible, setInstructionPopupVisible] = useState(false);
  const [instructionNote, setInstructionNote] = useState("");
  const [instructionPopupTarget, setInstructionPopupTarget] = useState(null);
  const [isOffersOpen, setIsOffersOpen] = useState(false);
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
        if (discountValue && Number(discountValue) > Number(item.price)) {
           const saved = Number(discountValue) - Number(item.price);
           if (saved > 0) {
             Alert.alert("🛒 Added to Cart", `Item safely added to your cart!\nYou saved £${saved.toFixed(2)} with this exclusive offer!`);
           } else {
             Alert.alert("🛒 Added to Cart", "Item successfully added to your cart!");
           }
        } else {
           Alert.alert("🛒 Added to Cart", "Item successfully added to your cart!");
        }

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
          colors={isEven ? ["#FFF", "#FDF2F8"] : ["#FFF", "#F0FDF4"]}
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
                <Text style={cardStyles.offerBadgeText}>OFFER</Text>
              </LinearGradient>
            </View>
          )}

          <View style={cardStyles.cardInfo}>
            <Text style={cardStyles.categoryName}>{item?.name}</Text>
            <View style={cardStyles.exploreRow}>
              <LinearGradient
                colors={isEven ? ["#FEF2F2", "#FFE4E6"] : ["#F0FDF4", "#DCFCE7"]}
                style={cardStyles.exploreBadge}
              >
                <Text style={[cardStyles.exploreText, { color: isEven ? '#E11D48' : '#166534' }]}>
                  EXPLORE MENU
                </Text>
              </LinearGradient>
            </View>
          </View>

          <View style={cardStyles.floatingImageContainer}>
            <View style={[cardStyles.imageShadow, { shadowColor: isEven ? '#FF2B5C' : '#22C55E' }]}>
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
    // 🔧 only left/right safe insets so we don't double-pad   return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.brandSectionScrolling}>
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
                        <Text style={styles.serviceChipTextMinimal}>In-store</Text>
                      </View>
                    )}
                    {restaurant.kerbside && (
                      <View style={styles.serviceChipMinimal}>
                        <Ionicons name="car-sport" size={16 * scale} color="#16a34a" />
                        <Text style={[styles.serviceChipTextMinimal, { color: '#166534' }]}>Kerbside</Text>
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
                <View style={offerStyles.offerTitleBadge}>
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
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
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
                    <TouchableOpacity
                      key={idx}
                      style={offerStyles.premiumItemCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedOffer(null);
                        navigation.navigate("Products", { userId, productId: item.id });
                      }}
                    >
                      <View style={offerStyles.premiumImageWrap}>
                        <Image
                          source={item.image ? { uri: item.image } : require("../../assets/restaurant.png")}
                          style={offerStyles.premiumItemImage}
                        />
                        {hasDiscount && (
                          <LinearGradient colors={['#FFB800', '#FF8A00']} start={{x:0,y:0}} end={{x:1,y:0}} style={offerStyles.premiumDiscountBadge}>
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Instruction Popup OVERLAYing the whole screen */}
          {instructionPopupVisible && (
            <View style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}>
              <View style={{
                width: '85%',
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                overflow: 'hidden',
                elevation: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
              }}>
                {/* Cart Icon Circle */}
                <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8 }}>
                  <View style={{
                    width: 68 * scale,
                    height: 68 * scale,
                    borderRadius: 34 * scale,
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: 'rgba(22, 163, 74, 0.2)',
                  }}>
                    <Ionicons name="cart-outline" size={32 * scale} color="#16a34a" />
                  </View>
                </View>

                {/* Name + Price + Close Row */}
                <View style={{
                  flexDirection: 'row',
                  paddingHorizontal: 24,
                  paddingTop: 12,
                  paddingBottom: 4,
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    {instructionPopupTarget && (
                      <Text style={{
                        fontSize: 18 * scale,
                        fontFamily: 'PoppinsBold',
                        fontWeight: '900',
                        color: '#0F172A',
                      }}>{instructionPopupTarget.name}</Text>
                    )}
                    {instructionPopupTarget && (
                      <Text style={{
                        fontSize: 16 * scale,
                        fontFamily: 'PoppinsBold',
                        fontWeight: '900',
                        color: '#16a34a',
                        marginTop: 2,
                      }}>£{(Number(instructionPopupTarget.price)).toFixed(2)}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => { setInstructionPopupVisible(false); setInstructionPopupTarget(null); }}
                    style={{ padding: 4, marginTop: 2 }}
                  >
                    <Ionicons name="close" size={22 * scale} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Hint Text */}
                <Text style={{
                  fontSize: 13 * scale,
                  fontFamily: 'PoppinsMedium',
                  color: '#64748B',
                  textAlign: 'center',
                  paddingHorizontal: 24,
                  marginTop: 8,
                  marginBottom: 12,
                }}>
                  Enter any special instructions (e.g. "Spicy", "No Onion")
                </Text>

                {/* Text Input */}
                <View style={{ paddingHorizontal: 24 }}>
                  <TextInput
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      minHeight: 90,
                      width: '100%',
                      borderRadius: 16,
                      padding: 14,
                      paddingTop: 14,
                      fontSize: 14 * scale,
                      fontFamily: 'PoppinsMedium',
                      color: '#333',
                      textAlignVertical: 'top',
                    }}
                    placeholder="Type your instructions..."
                    value={instructionNote}
                    onChangeText={setInstructionNote}
                    multiline
                    placeholderTextColor="#999999"
                  />
                </View>

                {/* Add to Cart Button */}
                <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>
                  <TouchableOpacity
                    style={{ borderRadius: 14, overflow: 'hidden', elevation: 4 }}
                    onPress={handleSubmitInstructionPopup}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#16a34a", "#15803d"]}
                      style={{
                        paddingVertical: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{
                        color: '#FFF',
                        fontSize: 16 * scale,
                        fontFamily: 'PoppinsBold',
                        fontWeight: '900',
                        letterSpacing: 0.5,
                      }}>
                        {updating[instructionPopupTarget?.id] ? "Adding..." : "Add to Cart"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
      )}

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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exploreText: {
    fontSize: 11 * scale,
    fontFamily: 'PoppinsBold',
    fontWeight: '900',
    letterSpacing: 0.5,
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
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.2)",
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
    color: "#16a34a",
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
    shadowColor: "#16a34a",
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
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#FF2B5C',
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
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  discountBadgeTextSmall: {
    fontSize: 9 * scale,
    fontFamily: 'PoppinsBold',
    color: '#166534',
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
