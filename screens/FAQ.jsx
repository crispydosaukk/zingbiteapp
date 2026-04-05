// FAQ.jsx
import React from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

export default function FAQ({ navigation }) {
    const faqs = [
        {
            question: "How do I place an order?",
            answer: "Browse our menu, add items to your cart, and proceed to checkout. You can pay using various payment methods including wallet credits.",
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept credit/debit cards, wallet credits, and loyalty credits. All payments are processed securely through Stripe.",
        },
        {
            question: "How does the wallet work?",
            answer: "Add credits to your wallet and use them for faster checkout. You can top up your wallet from the Credits section in your profile.",
        },
        {
            question: "What are loyalty credits?",
            answer: "Earn loyalty credits with every purchase and redeem them for discounts on future orders.",
        },
        {
            question: "How can I track my order?",
            answer: "View all your orders in the Orders section. You'll receive updates on your order status.",
        },
        {
            question: "Can I cancel my order?",
            answer: "Please contact our support team immediately if you need to cancel an order. Cancellation policies may vary based on order status.",
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient colors={["#FFF7ED", "#ffffff"]} style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={28} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>FAQ</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <ScrollView style={styles.content}>
                <Text style={styles.subtitle}>Frequently Asked Questions</Text>
                {faqs.map((faq, index) => (
                    <View key={index} style={styles.faqItem}>
                        <View style={styles.questionRow}>
                            <Ionicons name="help-circle" size={24} color="#FE724C" />
                            <Text style={styles.question}>{faq.question}</Text>
                        </View>
                        <Text style={styles.answer}>{faq.answer}</Text>
                    </View>
                ))}
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
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginTop: 10,
        marginBottom: 20,
    },
    faqItem: {
        marginBottom: 24,
        backgroundColor: "#f8f8f8",
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#FE724C",
    },
    questionRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    question: {
        fontSize: 16,
        fontWeight: "700",
        color: "#222",
        marginLeft: 8,
        flex: 1,
    },
    answer: {
        fontSize: 14,
        color: "#555",
        lineHeight: 20,
        marginLeft: 32,
    },
});
