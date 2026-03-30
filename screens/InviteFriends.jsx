// InviteFriends.jsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Share,
    TextInput,
    Alert,
    Modal,
    Animated,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Clipboard from "@react-native-clipboard/clipboard";
import { fetchAppSettings } from "../services/settingsService";

const { width } = Dimensions.get("window");
const scale = width / 400;

export default function InviteFriends({ navigation }) {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null);

    // Premium Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMsg, setAlertMsg] = useState("");
    const [alertType, setAlertType] = useState("info");
    const alertScale = React.useRef(new Animated.Value(0)).current;

    // Load user data
    useEffect(() => {
        const loadUser = async () => {
            try {
                const stored = await AsyncStorage.getItem("user");
                if (stored) setUser(JSON.parse(stored));
            } catch (e) {
                console.log("Failed to load user:", e);
            }
        };
        const loadSettings = async () => {
            const data = await fetchAppSettings();
            if (data) setSettings(data);
        };
        loadUser();
        loadSettings();
    }, []);

    const referralCode = user?.referral_code || "—";

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

    const handleCopy = () => {
        if (!user?.referral_code) return;
        Clipboard.setString(user.referral_code);
        showPremiumAlert("Copied", "Referral code copied to clipboard", "success");
    };

    const handleShare = async () => {
        if (!user?.referral_code) return;

        try {
            const result = await Share.share({
                message: `Join me on ZingBite! Use my referral code ${user.referral_code} to get special offers. Download the app now!`,
                title: "Invite Friends to ZingBite",
            });
            if (result.action === Share.sharedAction) {
                console.log("Shared successfully");
            }
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient colors={["#d7f7df", "#ffffff"]} style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={28} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <ScrollView style={styles.content}>
                <View style={styles.heroCard}>
                    <Ionicons name="gift" size={64} color="#0b7a2a" />
                    <Text style={styles.heroTitle}>Share the Love!</Text>
                    <Text style={styles.heroSubtitle}>
                        Invite your friends and earn {settings ? `£${Number(settings.referral_bonus_amount).toFixed(2)}` : "rewards"} when they make their first order
                    </Text>
                </View>

                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>Your Referral Code</Text>
                    <View style={styles.codeBox}>
                        <TextInput
                            style={styles.codeText}
                            value={referralCode}
                            editable={false}
                            selectTextOnFocus
                        />
                        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                            <Ionicons name="copy-outline" size={20} color="#0b7a2a" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Ionicons name="share-social" size={24} color="#ffffff" />
                    <Text style={styles.shareBtnText}>Share with Friends</Text>
                </TouchableOpacity>

                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>How it works</Text>
                    <View style={styles.benefitItem}>
                        <View style={styles.benefitIcon}>
                            <Text style={styles.benefitNumber}>1</Text>
                        </View>
                        <Text style={styles.benefitText}>
                            Share your unique referral code with friends
                        </Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={styles.benefitIcon}>
                            <Text style={styles.benefitNumber}>2</Text>
                        </View>
                        <Text style={styles.benefitText}>
                            They sign up and place their first order
                        </Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={styles.benefitIcon}>
                            <Text style={styles.benefitNumber}>3</Text>
                        </View>
                        <Text style={styles.benefitText}>
                            You both get rewards and special discounts!
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* PREMIUM ALERT MODAL */}
            <Modal visible={alertVisible} transparent animationType="fade">
                <View style={styles.alertOverlay}>
                    <Animated.View style={[styles.alertCard, { transform: [{ scale: alertScale }] }]}>
                        <LinearGradient
                            colors={alertType === 'error' ? ["#FFF5F5", "#FFFFFF"] : ["#F0FDF4", "#FFFFFF"]}
                            style={styles.alertContent}
                        >
                            <View style={[
                                styles.alertIconRing,
                                { backgroundColor: alertType === 'error' ? '#FEE2E2' : '#DCFCE7' }
                            ]}>
                                <Ionicons
                                    name={
                                        alertType === 'error' ? "close-circle"
                                            : alertType === 'success' ? "checkmark-circle"
                                                : "information-circle"
                                    }
                                    size={40}
                                    color={alertType === 'error' ? "#EF4444" : "#16A34A"}
                                />
                            </View>
                            <Text style={styles.alertTitleText}>{alertTitle}</Text>
                            <Text style={styles.alertMsgText}>{alertMsg}</Text>
                            <TouchableOpacity style={styles.alertBtn} onPress={hidePremiumAlert}>
                                <LinearGradient
                                    colors={alertType === 'error' ? ["#EF4444", "#DC2626"] : ["#16A34A", "#15803D"]}
                                    style={styles.alertBtnGrad}
                                >
                                    <Text style={styles.alertBtnText}>Ok</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#222",
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    heroCard: {
        alignItems: "center",
        backgroundColor: "#e8f5e9",
        borderRadius: 16,
        padding: 32,
        marginTop: 20,
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#222",
        marginTop: 16,
    },
    heroSubtitle: {
        fontSize: 14,
        color: "#555",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    codeCard: {
        backgroundColor: "#f8f8f8",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
        fontWeight: "600",
    },
    codeBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#0b7a2a",
        paddingHorizontal: 12,
    },
    codeText: {
        flex: 1,
        fontSize: 20,
        fontWeight: "700",
        color: "#0b7a2a",
        letterSpacing: 2,
        paddingVertical: 12,
    },
    copyBtn: {
        padding: 8,
    },
    shareBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b7a2a",
        borderRadius: 12,
        paddingVertical: 16,
        marginBottom: 32,
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ffffff",
        marginLeft: 8,
    },
    benefitsSection: {
        marginBottom: 32,
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#222",
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    benefitIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#0b7a2a",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    benefitNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: "#ffffff",
    },
    benefitText: {
        flex: 1,
        fontSize: 14,
        color: "#555",
        lineHeight: 20,
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
});
