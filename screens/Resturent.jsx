// Resturent.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Modal,
  Alert,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { PermissionsAndroid } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { RefreshControl } from "react-native";
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useRefresh from "../hooks/useRefresh";

import AppHeader from "./AppHeader";
import BottomBar from "./BottomBar";
import MenuModal from "./MenuModal";
import RestaurantImg from "../assets/restaurant.png";
import AllergyAlert from "../assets/allergy-alert.jpg";
import Rating5 from "../assets/rating-5.png";

import { fetchRestaurants } from "../services/restaurantService";
import { getCart } from "../services/cartService";
import { fetchAppSettings } from "../services/settingsService";

const { width } = Dimensions.get("window");
const scale = width / 400;
const FONT_FAMILY = Platform.select({ ios: "System", android: "System" });

function RestaurantCard({ name, address, photo, onPress, instore, kerbside, distance, index, foodType, isHalal, timings, onClosedPress }) {
  const isEven = index % 2 === 0;

  // Status Calculation
  const getStatus = () => {
    if (!timings || timings.length === 0) return { isOpen: true, message: "Open Now", color: "#16a34a" };
    
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dayIndex = now.getDay();
    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    
    let todayTiming = timings.find(t => t.day === days[dayIndex]);
    
    if (todayTiming && todayTiming.is_active) {
      if (currentTimeStr < todayTiming.opening_time) {
        return { 
          isOpen: false, 
          message: "Closed", 
          nextOpenMessage: `This restaurant is currently closed.\nIt will open Today at ${todayTiming.opening_time.substring(0, 5)}.`,
          color: "#64748b" 
        };
      }
      if (currentTimeStr <= todayTiming.closing_time) {
        return { isOpen: true, message: `Open until ${todayTiming.closing_time.substring(0, 5)}`, color: "#16a34a" };
      }
    }

    // If closed today or closed for the day, find next open day
    for (let i = 1; i <= 7; i++) {
      let nextDayIndex = (dayIndex + i) % 7;
      let nextTiming = timings.find(t => t.day === days[nextDayIndex]);
      if (nextTiming && nextTiming.is_active) {
        let dayName = i === 1 ? "Tomorrow" : days[nextDayIndex];
        return { 
          isOpen: false, 
          message: "Closed", 
          nextOpenMessage: `This restaurant is currently closed.\nIt will open on ${dayName} at ${nextTiming.opening_time.substring(0, 5)}.`,
          color: "#64748b" 
        };
      }
    }

    return { isOpen: false, message: "Closed", nextOpenMessage: "This restaurant is currently closed.", color: "#64748b" }; // Grey color for closed
  };

  const status = getStatus();

  // Extremely robust dynamic parsing (0=Veg, 1=NonVeg, 2=Jain)
  const rawFT = foodType !== null && foodType !== undefined ? String(foodType) : "";
  const foodTypeArr = rawFT ? rawFT.split(',').map(s => s.trim().toLowerCase()) : [];

  const isVeg = foodTypeArr.includes('0') || foodTypeArr.includes('veg') || foodTypeArr.includes('pure veg');
  const isNonVeg = foodTypeArr.includes('1') || foodTypeArr.includes('nonveg') || foodTypeArr.includes('non-veg');
  const isJain = foodTypeArr.includes('2') || foodTypeArr.includes('jain');
  const isHalalValue = Number(isHalal) === 1 || String(isHalal).trim().toLowerCase() === "1" || String(isHalal).trim().toLowerCase() === "halal";

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => {
        if (!status.isOpen && onClosedPress) {
          onClosedPress("Store Currently Unavailable", status.nextOpenMessage);
        } else {
          onPress();
        }
      }}
      activeOpacity={0.9}
    >
      <View style={cardStyles.cardBody}>
        <View style={cardStyles.imageColumn}>
          <View style={cardStyles.imageContainer}>
            <Image
              source={photo ? { uri: photo } : RestaurantImg}
              style={[cardStyles.image, !status.isOpen && { opacity: 0.5, tintColor: 'gray' }]} // Grey out image
            />
            {/* Dark overlay if closed */}
            {!status.isOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontFamily: 'PoppinsBold', fontSize: 14 * scale, letterSpacing: 1 }}>CLOSED</Text>
              </View>
            )}
          </View>
          {distance !== null && distance !== undefined && (
            <View style={cardStyles.distanceBadgeBelow}>
              <Ionicons name="navigate" size={10 * scale} color="#FFF" />
              <Text style={cardStyles.distanceText}>{(distance * 0.621371).toFixed(2)} mi</Text>
            </View>
          )}
        </View>

        <View style={cardStyles.info}>
          <View style={cardStyles.headerRow}>
            <Text style={cardStyles.name}>
              {name}
            </Text>
            <Ionicons name="chevron-forward" size={18 * scale} color="#CBD5E1" style={{ marginTop: 2 }} />
          </View>

          {/* DYNAMIC FOOD TYPE ROW */}
          <View style={cardStyles.foodBadgeRow}>
            {isVeg && (
              <View style={cardStyles.vegBadgeCompact}>
                <Ionicons name="leaf" size={12 * scale} color="#FE724C" />
                <Text style={[cardStyles.dietText, { color: '#FE724C' }]}>Pure veg</Text>
              </View>
            )}
            {isNonVeg && (
              <View style={cardStyles.vegBadgeCompact}>
                <View style={[cardStyles.dietDot, { borderColor: '#C62828' }]}>
                  <View style={[cardStyles.dietInner, { backgroundColor: '#C62828' }]} />
                </View>
                <Text style={[cardStyles.dietText, { color: '#C62828' }]}>
                  Non-veg{isHalalValue ? " (Halal)" : ""}
                </Text>
              </View>
            )}
            {isJain && (
              <View style={cardStyles.vegBadgeCompact}>
                <Ionicons name="flower" size={12 * scale} color="#DB2777" />
                <Text style={[cardStyles.dietText, { color: '#DB2777' }]}>Jain</Text>
              </View>
            )}
          </View>

          <View style={cardStyles.addressRow}>
            <Ionicons name="location" size={12 * scale} color="#94A3B8" style={{ marginTop: 2 }} />
            <Text style={cardStyles.address} numberOfLines={1}>
              {address}
            </Text>
          </View>

          {/* Status Indicator */}
          <View style={[cardStyles.statusBadge, { backgroundColor: status.color + '15', borderColor: status.color + '30' }]}>
             <View style={[cardStyles.statusDot, { backgroundColor: status.color }]} />
             <Text style={[cardStyles.statusText, { color: status.color }]}>{status.message}</Text>
          </View>

          <View style={cardStyles.bottomRow}>
            <View style={cardStyles.serviceGroup}>
              {instore && (
                <View style={[cardStyles.serviceItem, { marginLeft: 0 }]}>
                  <Ionicons name="storefront" size={14 * scale} color="#475569" />
                  <Text style={cardStyles.serviceText}>In-store</Text>
                </View>
              )}
              {kerbside && (
                <View style={cardStyles.serviceItem}>
                  <Ionicons name="car-sport" size={15 * scale} color="#475569" />
                  <Text style={cardStyles.serviceText}>Kerbside</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Resturent({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [restaurants, setRestaurants] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [currentLocationName, setCurrentLocationName] = useState("Fetching location...");
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchLocationModal, setSearchLocationModal] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [infoVisible, setInfoVisible] = useState(false);
  const [closedModalVisible, setClosedModalVisible] = useState(false);
  const [closedModalData, setClosedModalData] = useState({ title: "", message: "" });

  const scrollRef = useRef(null);
  const isFocused = useIsFocused();

  const scrollX = useRef(new Animated.Value(0)).current;

  const [settings, setSettings] = useState(null);

  const loadSettings = async () => {
    try {
      const data = await fetchAppSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load settings in Resturent:", err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const offers = settings ? [
    {
      title: "Signup bonus",
      subtitle: `Earn £${Number(settings?.signup_bonus_amount || 0).toFixed(2)} completely free`,
      desc: "Register now and get instant credit in your wallet.",
      icon: "gift",
      colors: ["#0288D1", "#03A9F4"], // Brand Blue
      textColor: "#FFFFFF",
      badgeColor: "rgba(255,255,255,0.2)",
    },
    {
      title: "Loyalty rewards",
      subtitle: `Earn £${Number(settings?.earn_per_order_amount || 0).toFixed(2)} on every order`,
      desc: "Order your favorite food and get cashback every time.",
      icon: "ribbon",
      colors: ["#F7CB45", "#FBC02D"], // Brand Yellow
      textColor: "#1E293B",
      badgeColor: "rgba(0,0,0,0.08)",
    },
    {
      title: "Refer & earn",
      subtitle: `Earn £${Number(settings?.referral_bonus_amount || 0).toFixed(2)} per friend`,
      desc: "Invite your friends and earn rewards when they join.",
      icon: "people",
      colors: ["#1E293B", "#334155"], // Dark Premium
      textColor: "#FFFFFF",
      badgeColor: "rgba(255,255,255,0.15)",
    },
  ] : [];

  const GOOGLE_MAPS_API_KEY = "AIzaSyA-CXsyKpvFtpidpOkhOiIQGfXFO3O5lKA";

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        // Try to find a nice short address (e.g. neighborhood/sublocality)
        const result = data.results[0];

        // Find a more readable short name if possible
        const sublocality = result.address_components.find(c => c.types.includes('sublocality_level_1'));
        const city = result.address_components.find(c => c.types.includes('locality'));

        if (sublocality && city) {
          return `${sublocality.long_name}, ${city.long_name}`;
        }

        return result.formatted_address.split(',')[0] + ', ' + result.formatted_address.split(',')[1];
      }
      return "Unknown Location";
    } catch (error) {
      console.error("Geocoding Error:", error);
      return "Location unavailable";
    }
  };

  const searchPlaces = async (query) => {
    if (!query || query.length < 3) return;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK") {
        setLocationSuggestions(data.predictions);
      }
    } catch (err) {
      console.error("Place Search Error:", err);
    }
  };

  const getPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;
        return { latitude: lat, longitude: lng };
      }
      return null;
    } catch (err) {
      console.error("Place Details Error:", err);
      return null;
    }
  };
  const handleManualLocationSelect = async (suggestion) => {
    setLocationLoading(true);
    setSearchLocationModal(false);
    setCurrentLocationName(suggestion.structured_formatting.main_text);

    const coords = await getPlaceDetails(suggestion.place_id);
    if (coords) {
      try {
        const locationData = {
          name: suggestion.structured_formatting.main_text,
          coords: coords,
          manual: true
        };
        await AsyncStorage.setItem("user_manual_location", JSON.stringify(locationData));
      } catch (e) {
        console.log("Error saving location:", e);
      }
      const data = await fetchRestaurants(coords.latitude, coords.longitude);
      setRestaurants(data);
    }
    setLocationLoading(false);
  };

  // Load User
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "ZingBite needs access to your location to find the nearest restaurants.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else if (Platform.OS === "ios") {
      const status = await Geolocation.requestAuthorization("whenInUse");
      return status === "granted";
    }
    return true;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      // First attempt: High Accuracy
      Geolocation.getCurrentPosition(
        (position) => {
          resolve(position.coords);
        },
        (error) => {
          console.log("High Accuracy Error:", error.code, error.message);

          // Second attempt: Low Accuracy / Balanced Power
          Geolocation.getCurrentPosition(
            (pos) => {
              resolve(pos.coords);
            },
            (err) => {
              console.log("Low Accuracy Error:", err.code, err.message);

              // Third attempt: Fallback to any available position
              Geolocation.getCurrentPosition(
                (p) => resolve(p.coords),
                (e) => {
                  console.log("Final attempt Error:", e.code, e.message);
                  if (e.code === 2 || e.code === 5) {
                    Alert.alert(
                      "Location Disabled",
                      "Please turn on your GPS/Location services to find the nearest restaurants.",
                      [{ text: "OK" }]
                    );
                  }
                  resolve(null);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 300000, // 5 minutes old is okay as a last resort
                }
              );
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 60000, // 1 minute old
              forceRequestLocation: true,
              showLocationDialog: true,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 20000, // Increased timeout for better fix
          maximumAge: 0, // Force fresh location for the first attempt
          forceRequestLocation: true,
          showLocationDialog: true,
        }
      );
    });
  };

  const loadAllData = async (forceRefreshAuto = false) => {
    setLocationLoading(true);
    let useBackgroundFetch = false;

    try {
      const cachedData = await AsyncStorage.getItem("cached_restaurants_data");
      if (cachedData) {
        setRestaurants(JSON.parse(cachedData));
      }

      if (!forceRefreshAuto) {
        const storedLoc = await AsyncStorage.getItem("user_manual_location");
        if (storedLoc) {
          const loc = JSON.parse(storedLoc);
          setCurrentLocationName(loc.name);
          const data = await fetchRestaurants(loc.coords.latitude, loc.coords.longitude);
          setRestaurants(data);
          await AsyncStorage.setItem("cached_restaurants_data", JSON.stringify(data));
          setLocationLoading(false);
          return;
        }

        const lastAuto = await AsyncStorage.getItem("last_auto_location");
        if (lastAuto) {
          const parsed = JSON.parse(lastAuto);
          setCurrentLocationName(parsed.name);
          useBackgroundFetch = true;
        }
      } else {
        await AsyncStorage.removeItem("user_manual_location");
      }
    } catch (e) {
      console.log("AsyncStorage load error:", e);
    }

    if (!useBackgroundFetch) {
      setCurrentLocationName("Locating...");
    }

    const hasPermission = await requestLocationPermission();
    let coords = null;

    if (hasPermission) {
      coords = await getCurrentLocation();
    } else if (!useBackgroundFetch) {
      Alert.alert("Permission Denied", "Location access is recommended to find the best local restaurants.");
    }

    if (coords) {
      const address = await fetchAddressFromCoords(coords.latitude, coords.longitude);
      setCurrentLocationName(address);
      const data = await fetchRestaurants(coords.latitude, coords.longitude);
      setRestaurants(data);

      await AsyncStorage.setItem("last_auto_location", JSON.stringify({ name: address, coords }));
      await AsyncStorage.setItem("cached_restaurants_data", JSON.stringify(data));
    } else if (!useBackgroundFetch) {
      setCurrentLocationName("Set Location manually");
      const data = await fetchRestaurants(null, null);
      setRestaurants(data);
    }

    setLocationLoading(false);
  };

  // Fetch Restaurants
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
      });
    }
    loadAllData();
  }, []);

  // Fetch Cart
  useEffect(() => {
    const fetchCart = async () => {
      if (!user) return;
      const customerId = user.id ?? user.customer_id;
      if (!customerId) return;

      try {
        const res = await getCart(customerId);
        if (res?.status === 1 && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((item) => {
            const qty = item.product_quantity ?? 0;
            if (qty > 0) {
              map[item.product_id] =
                (map[item.product_id] || 0) + qty;
            }
          });
          setCartItems(map);
        }
      } catch (err) {
        console.log("Cart error:", err);
      }
    };

    if (isFocused) fetchCart();
  }, [isFocused, user]);

  // Slider Auto Move
  useEffect(() => {
    const timer = setInterval(() => {
      if (offers.length === 0) return;
      let next = activeIndex + 1;
      if (next >= offers.length) next = 0;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      // Delay state update so the heavy color re-renders happen AFTER the physical scroll snap finishes
      setTimeout(() => setActiveIndex(next), 400);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex, offers.length]);

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Premium Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("info");
  const alertScale = useRef(new Animated.Value(0)).current;

  const showPremiumAlert = (title, msg, type = "info") => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertType(type);
    setAlertVisible(true);
    Animated.spring(alertScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const hidePremiumAlert = () => {
    Animated.timing(alertScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setAlertVisible(false));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Any cleanup logic here
    };
  }, []);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await loadSettings();
    await loadAllData();

    if (user) {
      const customerId = user.id ?? user.customer_id;
      const res = await getCart(customerId);

      if (res?.status === 1 && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach((item) => {
          const qty = item.product_quantity ?? 0;
          if (qty > 0) {
            map[item.product_id] = (map[item.product_id] || 0) + qty;
          }
        });
        setCartItems(map);
      }
    }
  });

  return (
    <View style={styles.root}>
      <StatusBar
        backgroundColor={offers[activeIndex]?.colors?.[0] || "#FE724C"}
        barStyle={offers[activeIndex]?.textColor === "#FFFFFF" ? "light-content" : "dark-content"}
      />

      {/* Top Zomato-style Unified Section - Clean Unified Background */}
      <View style={[styles.topSection, { backgroundColor: offers[activeIndex]?.colors?.[0] || "#FFFFFF" }]}>
        <AppHeader
          user={user}
          navigation={navigation}
          cartItems={cartItems}
          onMenuPress={() => setMenuVisible(true)}
          transparent
          statusColor={offers[activeIndex]?.colors?.[0] || "#0288D1"}
          textColor={offers[activeIndex]?.textColor || "#FFFFFF"}
          barStyle={offers[activeIndex]?.textColor === "#FFFFFF" ? "light-content" : "dark-content"}
          currentLocationName={currentLocationName}
          onLocationPress={() => setSearchLocationModal(true)}
          locationLoading={locationLoading}
        />

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search"
              size={20 * scale}
              color="#FE724C"
            />
            <TextInput
              placeholder="Search restaurants, cuisines..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Premium Offer Slider - Integrated for Unified Look */}
        <View style={styles.sliderContainer}>
          <Animated.ScrollView
            horizontal
            pagingEnabled={Platform.OS === 'ios'}
            snapToInterval={Platform.OS === 'android' ? width : undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={true}
            showsHorizontalScrollIndicator={false}
            ref={scrollRef}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {offers.map((offer, i) => (
              <View key={i} style={styles.sliderPage}>
                <View style={[styles.offerCardWrapper, { backgroundColor: 'transparent' }]}>
                  <View style={styles.offerCardContent}>
                    <View style={styles.offerTextCol}>
                      <Text style={[styles.offerBadge, { backgroundColor: offer.badgeColor, color: offer.textColor, fontWeight: '900', opacity: 1 }]}>
                        {offer.title}
                      </Text>
                      <Text
                        style={[styles.offerMainTitle, { color: offer.textColor, fontWeight: '900' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                      >
                        {offer.subtitle}
                      </Text>
                      <Text style={[styles.offerDesc, { color: offer.textColor, opacity: 1, fontFamily: 'PoppinsBold', fontWeight: '900' }]}>
                        {offer.desc}
                      </Text>
                    </View>
                    <View style={[styles.offerIconCircle, { borderColor: offer.textColor, backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <Ionicons name={offer.icon} size={42 * scale} color={offer.textColor} />
                    </View>
                  </View>
                  {/* Decorative Elements */}
                  <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                  <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                </View>
              </View>
            ))}
          </Animated.ScrollView>

          {/* dots */}
          <View style={styles.dotContainer}>
            {offers.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: activeIndex === i ? 18 : 6,
                    backgroundColor: activeIndex === i ? "#FFF" : "rgba(255,255,255,0.4)",
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.contentWrap}>
          {/* Food Safety & Hygiene Dropdown */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setInfoVisible(!infoVisible)}
            style={styles.infoDropdownHeader}
          >
            <View style={styles.infoTitleBox}>
              <Ionicons name="shield-checkmark" size={18 * scale} color="#16a34a" />
              <Text style={styles.infoDropdownText}>Food Safety & Hygiene</Text>
            </View>
            <Ionicons name={infoVisible ? "chevron-up" : "chevron-down"} size={18 * scale} color="#64748B" />
          </TouchableOpacity>

          {infoVisible && (
            <View style={styles.infoExpandedContent}>
              <View style={styles.infoBannerRowPlain}>
                <Image source={AllergyAlert} style={styles.infoImageSingle} />
                <Image source={Rating5} style={styles.infoImageSingle} />
              </View>
            </View>
          )}

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Explore Our Locations</Text>
            <View style={styles.listLine} />
          </View>

          {filteredRestaurants.map((r, i) => (
            <RestaurantCard
              key={i}
              index={i}
              name={r.name}
              address={r.address}
              photo={r.photo}
              instore={r.instore}
              kerbside={r.kerbside}
              distance={r.distance}
              foodType={r.food_type || r.foodType || r.restaurant_food_type}
              isHalal={r.is_halal || r.isHalal || r.halal}
              timings={r.timings}
              onClosedPress={(title, message) => {
                setClosedModalData({ title, message });
                setClosedModalVisible(true);
              }}
              onPress={() =>
                navigation.navigate("Categories", { userId: r.userId })
              }
            />
          ))}
        </View>
      </ScrollView>

      <MenuModal
        visible={menuVisible}
        setVisible={setMenuVisible}
        user={user}
        navigation={navigation}
      />
      <BottomBar navigation={navigation} activeTab="Home" />

      {/* CLOSED RESTAURANT MODAL */}
      <Modal visible={closedModalVisible} animationType="fade" transparent={true} onRequestClose={() => setClosedModalVisible(false)}>
        <View style={styles.alertOverlay}>
          <View style={[styles.alertCard, { backgroundColor: "#FFF" }]}>
            <View style={styles.alertContent}>
              <View style={[styles.alertIconRing, { backgroundColor: "rgba(244, 63, 94, 0.1)" }]}>
                <Ionicons name="storefront-outline" size={40 * scale} color="#F43F5E" />
              </View>
              <Text style={styles.alertTitleText}>{closedModalData.title}</Text>
              <Text style={styles.alertMsgText}>{closedModalData.message}</Text>
              <TouchableOpacity
                style={styles.alertBtn}
                onPress={() => setClosedModalVisible(false)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FE724C", "#FF8D6A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.alertBtnGrad}
                >
                  <Text style={styles.alertBtnText}>Ok, Got it</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOCATION SEARCH MODAL */}
      <Modal visible={searchLocationModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.searchLocHeader}>
            <TouchableOpacity onPress={() => setSearchLocationModal(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24 * scale} color="#1c1c1c" />
            </TouchableOpacity>
            <View style={styles.searchLocInputBox}>
              <Ionicons name="search" size={20 * scale} color="#FE724C" />
              <TextInput
                placeholder="Search for area, street name..."
                placeholderTextColor="#999"
                style={styles.searchLocInput}
                autoFocus
                value={locationSearchQuery}
                onChangeText={(text) => {
                  setLocationSearchQuery(text);
                  searchPlaces(text);
                }}
              />
              {locationSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLocationSearchQuery("")}>
                  <Ionicons name="close-circle" size={18 * scale} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.useCurrentLocBtn}
              onPress={() => {
                setSearchLocationModal(false);
                loadAllData(true);
              }}
            >
              <Ionicons name="locate" size={20 * scale} color="#FE724C" />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.useCurrentLocText, { color: '#FE724C' }]}>Use current location</Text>
                <Text style={{ fontSize: 11 * scale, color: '#999', fontFamily: 'PoppinsMedium' }}>Reset to automatic GPS detection</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.suggestionList}>
              {locationSuggestions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionItem}
                  onPress={() => handleManualLocationSelect(item)}
                >
                  <Ionicons name="location-outline" size={20 * scale} color="#666" style={{ marginTop: 2 }} />
                  <View style={styles.suggestionTextCol}>
                    <Text style={styles.suggestionMain}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.suggestionSub} numberOfLines={1}>{item.structured_formatting.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Voice Overlay - Modal for absolute visibility */}

      {/* PREMIUM ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: alertScale }] }]}>
            <LinearGradient
              colors={alertType === 'error' ? ["#FFF5F5", "#FFFFFF"] : ["#FFF5F5", "#FFFFFF"]}
              style={styles.alertContent}
            >
              <View style={[
                styles.alertIconRing,
                { backgroundColor: alertType === 'error' ? '#FEE2E2' : '#FFD1DC' }
              ]}>
                <Ionicons
                  name={
                    alertType === 'error' ? "close-circle"
                      : alertType === 'success' ? "checkmark-circle"
                        : "information-circle"
                  }
                  size={40}
                  color={alertType === 'error' ? "#EF4444" : "#FE724C"}
                />
              </View>
              <Text style={styles.alertTitleText}>{alertTitle}</Text>
              <Text style={styles.alertMsgText}>{alertMsg}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={hidePremiumAlert}>
                <LinearGradient
                  colors={["#FE724C", "#FF9272"]}
                  style={styles.alertBtnGrad}
                >
                  <Text style={styles.alertBtnText}>Ok</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal >
    </View >
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topSection: {
    paddingBottom: 0,
    zIndex: 10,
  },
  locationBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  deliveringTo: {
    fontSize: 10 * scale,
    fontFamily: 'PoppinsMedium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentLocationText: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsSemiBold',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locIconBg: {
    width: 28 * scale,
    height: 28 * scale,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 10 * scale,
    fontFamily: 'PoppinsBold',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 0,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  searchLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 13 * scale,
    color: "#222",
    fontFamily: "PoppinsMedium",
    marginLeft: 10,
    paddingVertical: Platform.OS === "android" ? 10 : 0,
  },
  searchDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E5E5E5",
    marginHorizontal: 10,
  },
  micButton: {
    padding: 2,
  },
  sliderContainer: {
    marginTop: -8,
    position: 'relative',
  },
  sliderPage: {
    width: width,
    alignItems: "center",
  },
  offerCardWrapper: {
    width: width, // Full width spread
    height: 160 * scale,
    overflow: "hidden",
    paddingHorizontal: 24 * scale,
    paddingVertical: 20 * scale,
    justifyContent: "center",
    position: 'relative',
  },
  offerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  offerTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  offerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    color: "#FFF",
    fontSize: 12 * scale,
    fontFamily: "PoppinsBold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  offerMainTitle: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#FFF",
    lineHeight: 28 * scale,
  },
  offerDesc: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },
  offerIconCircle: {
    width: 66 * scale,
    height: 66 * scale,
    borderRadius: 33 * scale,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  decorCircle1: {
    position: 'absolute',
    width: 150 * scale,
    height: 150 * scale,
    borderRadius: 75 * scale,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -40,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -15,
    left: -15,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    position: 'absolute',
    bottom: 12,
    width: '100%',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  infoDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDropdownText: {
    fontSize: 14 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#334155',
    marginLeft: 10,
  },
  infoExpandedContent: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  infoBannerRowPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoImageSingle: {
    width: (width - 44) / 2,
    height: 90 * scale,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#1C1C1C",
  },
  sectionSubtitle: {
    fontSize: 12 * scale,
    fontFamily: "PoppinsMedium",
    color: "#888",
    marginTop: -2,
  },
  viewAllText: {
    fontSize: 13 * scale,
    fontFamily: "PoppinsSemiBold",
    color: "#C62828",
  },
  contentWrap: {
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  listHeader: {
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 17 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: '900',
    color: "#1C1C1C",
    marginRight: 15,
  },
  listLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    borderRadius: 1,
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

  /* ALERT STYLES */
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertCard: {
    width: "85%",
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  alertContent: {
    padding: 30,
    alignItems: "center",
  },
  alertIconRing: {
    width: 80 * scale,
    height: 80 * scale,
    borderRadius: 40 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitleText: {
    fontSize: 22 * scale,
    fontFamily: "PoppinsBold",
    color: "#0F172A",
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMsgText: {
    fontSize: 14 * scale,
    fontFamily: "PoppinsMedium",
    color: "#475569",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22 * scale,
  },
  alertBtn: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
  },
  alertBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 15 * scale,
    fontFamily: "PoppinsBold",
    color: "#FFF",
    fontWeight: "800",
  },

  /* LOCATION SEARCH MODAL STYLES */
  searchLocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  searchLocInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 2,
  },
  searchLocInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#1c1c1c',
  },
  useCurrentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F7F7F7',
  },
  useCurrentLocText: {
    marginLeft: 12,
    fontSize: 15 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#FE724C',
  },
  suggestionList: {
    paddingHorizontal: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMain: {
    fontSize: 15 * scale,
    fontFamily: 'PoppinsSemiBold',
    color: '#1c1c1c',
  },
  suggestionSub: {
    fontSize: 13 * scale,
    fontFamily: 'PoppinsMedium',
    color: '#666',
    marginTop: 2,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: 'visible', // Changed to visible for shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
  cardBody: {
    flexDirection: "row",
    padding: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 120 * scale,
    height: 120 * scale,
    borderRadius: 18,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 6 * scale,
    fontFamily: 'PoppinsSemiBold',
    marginLeft: 3,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 18 * scale,
    color: "#1C1C1C",
    fontFamily: "PoppinsBold",
    fontWeight: '900',
    flex: 1,
    marginRight: 10,
  },
  vegBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  vegText: {
    marginLeft: 4,
    color: "#16a34a",
    fontSize: 13 * scale,
    fontFamily: "PoppinsMedium",
  },
  addressRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  address: {
    fontSize: 14 * scale,
    color: "#666",
    marginLeft: 5,
    lineHeight: 18 * scale,
    fontFamily: "PoppinsMedium",
    flex: 1,
  },
  serviceRow: {
    flexDirection: "row",
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
    color: "#FE724C",
    fontFamily: "PoppinsBold",
    letterSpacing: 0.3,
  },
  awayText: {
    color: '#64748B',
    fontSize: 11 * scale,
    fontFamily: 'PoppinsMedium',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  serviceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  serviceText: {
    fontSize: 12 * scale,
    fontFamily: 'PoppinsSemiBold',
    marginLeft: 5,
    color: '#334155',
    marginTop: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageColumn: {
    alignItems: 'center',
  },
  distanceBadgeBelow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FE724C',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    width: 100 * scale,
    justifyContent: 'center',
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 12 * scale,
    fontFamily: 'PoppinsBold',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6 * scale,
    height: 6 * scale,
    borderRadius: 3 * scale,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11 * scale,
    fontFamily: "PoppinsBold",
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  foodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  vegBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
    paddingVertical: 2,
  },
  dietDot: {
    width: 14 * scale,
    height: 14 * scale,
    borderWidth: 1.5,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dietInner: {
    width: 6 * scale,
    height: 6 * scale,
    borderRadius: 3 * scale,
  },
  dietText: {
    fontSize: 11.5 * scale, // Increased text size by ~1.5px
    fontFamily: 'PoppinsBold',
    marginLeft: 5,
    letterSpacing: 0.5,
    fontWeight: '900',
  },
  dietChipPlain: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
});
