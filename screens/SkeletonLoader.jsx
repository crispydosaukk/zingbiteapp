// SkeletonLoader.jsx — Shared shimmer skeleton component
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = width / 400;

// Single shimmer block
export function SkeletonBox({ width: w = '100%', height: h = 16, radius = 8, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
}

// Restaurant card skeleton (used in Resturent.jsx)
export function RestaurantCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.cardBody}>
        <View style={skStyles.imgCol}>
          <SkeletonBox width={90 * scale} height={90 * scale} radius={16} />
          <SkeletonBox width={70 * scale} height={16} radius={8} style={{ marginTop: 6 }} />
        </View>
        <View style={skStyles.infoCol}>
          <SkeletonBox width="75%" height={18} radius={8} />
          <SkeletonBox width="45%" height={13} radius={6} style={{ marginTop: 8 }} />
          <SkeletonBox width="60%" height={13} radius={6} style={{ marginTop: 6 }} />
          <SkeletonBox width="40%" height={22} radius={10} style={{ marginTop: 10 }} />
        </View>
      </View>
    </View>
  );
}

// Category card skeleton (used in Categories/index.jsx)
export function CategoryCardSkeleton() {
  return (
    <View style={skStyles.catCard}>
      <View style={skStyles.catInfo}>
        <SkeletonBox width="55%" height={20} radius={8} />
        <SkeletonBox width="40%" height={30} radius={12} style={{ marginTop: 10 }} />
      </View>
      <SkeletonBox width={80 * scale} height={80 * scale} radius={40} />
    </View>
  );
}

// Product card skeleton (used in Products/index.jsx)
export function ProductCardSkeleton() {
  return (
    <View style={skStyles.prodCard}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <SkeletonBox width="80%" height={18} radius={8} />
        <SkeletonBox width="100%" height={13} radius={6} style={{ marginTop: 6 }} />
        <SkeletonBox width="60%" height={13} radius={6} style={{ marginTop: 4 }} />
        <SkeletonBox width="35%" height={22} radius={8} style={{ marginTop: 12 }} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <SkeletonBox width={85 * scale} height={85 * scale} radius={14} />
        <SkeletonBox width={60 * scale} height={32} radius={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// Offer card skeleton (used in OffersScreen.jsx)
export function OfferCardSkeleton() {
  return (
    <View style={skStyles.offerCard}>
      <View style={skStyles.offerHeader}>
        <SkeletonBox width="50%" height={16} radius={6} />
        <SkeletonBox width={24} height={24} radius={12} />
      </View>
      <SkeletonBox width="100%" height={160 * scale} radius={0} />
      <View style={{ padding: 12 }}>
        <SkeletonBox width="65%" height={18} radius={8} />
        <SkeletonBox width="40%" height={14} radius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 14,
    marginVertical: 7,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imgCol: {
    alignItems: 'center',
    marginRight: 14,
  },
  infoCol: {
    flex: 1,
  },
  catCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 14,
    marginVertical: 7,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    height: 100 * scale,
  },
  catInfo: {
    flex: 1,
    paddingRight: 16,
  },
  prodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginVertical: 7,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FAFAFA',
  },
});
