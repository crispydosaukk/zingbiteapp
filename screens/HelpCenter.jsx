// HelpCenter.jsx
import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

export default function HelpCenter({ navigation }) {
    const supportEmail = "support@zingbite.com";

    const handleEmail = () => {
        Linking.openURL(`mailto:${supportEmail}`);
    };

    const handleWhatsApp = () => {
        const whatsappNumber = "442012345678"; // UK number without + and spaces
        Linking.openURL(`whatsapp://send?phone=${whatsappNumber}`);
    };

    const contactMethods = [
        {
            id: "email",
            icon: "mail",
            title: "Email Support",
            subtitle: supportEmail,
            color: "#FE724C",
            bgColor: "#FFF7ED",
            onPress: handleEmail,
        },
        {
            id: "whatsapp",
            icon: "logo-whatsapp",
            title: "WhatsApp",
            subtitle: "Chat with us",
            color: "#25D366",
            bgColor: "#F0FDF4",
            onPress: handleWhatsApp,
        },
    ];

    const faqCategories = [
        {
            title: "Orders & Delivery",
            icon: "fast-food",
            color: "#ff6b35",
            questions: [
                "How do I track my order?",
                "What are the delivery hours?",
                "Can I modify my order?",
            ],
        },
        {
            title: "Payments & Wallet",
            icon: "wallet",
            color: "#FE724C",
            questions: [
                "How do I add money to wallet?",
                "What payment methods are accepted?",
                "How do refunds work?",
            ],
        },
        {
            title: "Account & Profile",
            icon: "person",
            color: "#FE724C",
            questions: [
                "How do I update my profile?",
                "How do I change my password?",
                "Can I delete my account?",
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient colors={["#FFF7ED", "#FFFFFF"]} style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={28} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Center</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={["#FE724C", "#FF9272"]}
                        style={styles.heroGradient}
                    >
                        <Ionicons name="headset" size={64} color="#ffffff" />
                        <Text style={styles.heroTitle}>We're Here to Help!</Text>
                        <Text style={styles.heroSubtitle}>
                            Get in touch with our support team
                        </Text>
                    </LinearGradient>
                </View>

                {/* Contact Methods */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    {contactMethods.map((method) => (
                        <TouchableOpacity
                            key={method.id}
                            style={styles.contactCard}
                            onPress={method.onPress}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.contactIcon,
                                    { backgroundColor: method.bgColor },
                                ]}
                            >
                                <Ionicons
                                    name={method.icon}
                                    size={28}
                                    color={method.color}
                                />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>{method.title}</Text>
                                <Text style={styles.contactSubtitle}>
                                    {method.subtitle}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#999" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick FAQ Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Help</Text>
                    <TouchableOpacity
                        style={styles.faqButton}
                        onPress={() => navigation.navigate("FAQ")}
                        activeOpacity={0.7}
                    >
                        <View style={styles.faqButtonContent}>
                            <Ionicons name="help-circle" size={24} color="#ffffff" />
                            <Text style={styles.faqButtonText}>
                                View All FAQs
                            </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={24} color="#ffffff" />
                    </TouchableOpacity>

                    {faqCategories.map((category, index) => (
                        <View key={index} style={styles.categoryCard}>
                            <View style={styles.categoryHeader}>
                                <View
                                    style={[
                                        styles.categoryIcon,
                                        { backgroundColor: `${category.color}20` },
                                    ]}
                                >
                                    <Ionicons
                                        name={category.icon}
                                        size={24}
                                        color={category.color}
                                    />
                                </View>
                                <Text style={styles.categoryTitle}>
                                    {category.title}
                                </Text>
                            </View>
                            {category.questions.map((question, qIndex) => (
                                <Text key={qIndex} style={styles.questionText}>
                                    • {question}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Business Hours */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support Hours</Text>
                    <View style={styles.hoursCard}>
                        <View style={styles.hoursRow}>
                            <Ionicons name="time" size={24} color="#0b7a2a" />
                            <View style={styles.hoursInfo}>
                                <Text style={styles.hoursDay}>Monday - Friday</Text>
                                <Text style={styles.hoursTime}>9:00 AM - 10:00 PM</Text>
                            </View>
                        </View>
                        <View style={styles.hoursDivider} />
                        <View style={styles.hoursRow}>
                            <Ionicons name="time" size={24} color="#0b7a2a" />
                            <View style={styles.hoursInfo}>
                                <Text style={styles.hoursDay}>Saturday - Sunday</Text>
                                <Text style={styles.hoursTime}>10:00 AM - 8:00 PM</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
    },
    heroCard: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        borderRadius: 20,
        overflow: "hidden",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    heroGradient: {
        alignItems: "center",
        padding: 40,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: "#ffffff",
        marginTop: 16,
    },
    heroSubtitle: {
        fontSize: 14,
        color: "#FFF7ED",
        marginTop: 8,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#222",
        marginBottom: 16,
    },
    contactCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    contactIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#222",
        marginBottom: 4,
    },
    contactSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    faqButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FE724C",
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        elevation: 4,
    },
    faqButtonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    faqButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ffffff",
        marginLeft: 12,
    },
    categoryCard: {
        backgroundColor: "#f8f8f8",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#FE724C",
    },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#222",
    },
    questionText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 6,
        marginLeft: 8,
    },
    hoursCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    hoursRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    hoursInfo: {
        marginLeft: 16,
    },
    hoursDay: {
        fontSize: 16,
        fontWeight: "700",
        color: "#222",
        marginBottom: 4,
    },
    hoursTime: {
        fontSize: 14,
        color: "#666",
    },
    hoursDivider: {
        height: 1,
        backgroundColor: "#e0e0e0",
        marginVertical: 16,
    },
});
