import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsConditionsScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

                <Text style={styles.sectionTitle}>1. Introduction</Text>
                <Text style={styles.paragraph}>
                    These Terms and Conditions govern your use of the ZingBite UK mobile application and services. By accessing or using our app, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.
                </Text>

                <Text style={styles.sectionTitle}>2. Use of Application</Text>
                <Text style={styles.paragraph}>
                    You must be at least 18 years of age to use this application. By using this application and by agreeing to these terms and conditions, you warrant and represent that you are at least 18 years of age.
                </Text>

                <Text style={styles.sectionTitle}>3. User Accounts</Text>
                <Text style={styles.paragraph}>
                    When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                </Text>

                <Text style={styles.sectionTitle}>4. Orders and Payments</Text>
                <Text style={styles.paragraph}>
                    All orders are subject to availability and confirmation of the order price. Dispatch times may vary according to availability and subject to any delays resulting from postal delays or force majeure for which we will not be responsible.
                </Text>

                <Text style={styles.sectionTitle}>5. Cancellation and Refund Policy</Text>
                <Text style={styles.paragraph}>
                    Orders can be cancelled before they are accepted by the restaurant. Once an order is accepted and preparation has begun, cancellation may not be possible. Refunds are processed on a case-by-case basis.
                </Text>

                <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
                <Text style={styles.paragraph}>
                    The Service and its original content, features and functionality are and will remain the exclusive property of ZingBite UK and its licensors.
                </Text>

                <Text style={styles.sectionTitle}>7. Contact Information</Text>
                <Text style={styles.paragraph}>
                    Questions about the Terms should be sent to us at support@zingbite.co.uk.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    content: {
        padding: 20,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#16a34a', // Brand Green
        marginTop: 20,
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 24,
        color: '#444',
    },
});
