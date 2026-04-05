import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../config/api";

export default function EditProfile({ navigation }) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    gender: "",
    date_of_birth: "",
    preferred_restaurant: "",
  });

  const [showDobPicker, setShowDobPicker] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile");
      setForm({
        full_name: res.data.full_name || "",
        email: res.data.email || "",
        mobile_number: res.data.mobile_number || "",
        gender: res.data.gender || "",
        date_of_birth: res.data.date_of_birth || "",
        preferred_restaurant: res.data.preferred_restaurant || "",
      });
    } catch (err) {
      Alert.alert("Error", "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!form.full_name.trim()) {
      Alert.alert("Validation", "Full name is required");
      return;
    }

    try {
      setSaving(true);

      await api.put("/profile", {
        full_name: form.full_name,
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        preferred_restaurant: form.preferred_restaurant,
      });

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FE724C" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      {/* HEADER */}
      <LinearGradient
        colors={["#FE724C", "#FF9272"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* FULL NAME */}
        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(v) => setForm({ ...form, full_name: v })}
          icon="person-outline"
        />

        {/* EMAIL (LOCKED) */}
        <Input
          label="Email"
          value={form.email}
          icon="mail-outline"
          disabled
        />

        {/* MOBILE (LOCKED) */}
        <Input
          label="Mobile Number"
          value={form.mobile_number}
          icon="call-outline"
          disabled
        />

        {/* GENDER */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.inputRow}>
            <Ionicons name="male-female-outline" size={18} color="#777" />
            <Picker
              selectedValue={form.gender}
              onValueChange={(v) => setForm({ ...form, gender: v })}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>
        </View>

        {/* DOB */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setShowDobPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#777" />
            <Text style={[styles.input, !form.date_of_birth && { color: "#aaa" }]}>
              {form.date_of_birth ? new Date(form.date_of_birth).toLocaleDateString("en-GB") : "Select Date"}
            </Text>
          </TouchableOpacity>
        </View>

        {showDobPicker && (
          <DateTimePicker
            mode="date"
            display="default"
            value={form.date_of_birth ? new Date(form.date_of_birth) : new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
            maximumDate={new Date()}
            onChange={(e, selectedDate) => {
              setShowDobPicker(false);
              if (selectedDate) {
                setForm({
                  ...form,
                  date_of_birth: selectedDate.toISOString().split("T")[0],
                });
              }
            }}
          />
        )}


        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={updateProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ---------- INPUT COMPONENT ---------- */

const Input = ({
  label,
  icon,
  value,
  onChangeText,
  disabled,
  placeholder,
}) => (
  <View style={styles.inputCard}>
    <Text style={styles.label}>{label}</Text>
    <View
      style={[
        styles.inputRow,
        disabled && { backgroundColor: "#f0f0f0" },
      ]}
    >
      <Ionicons name={icon} size={18} color="#777" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
      />
      {disabled && (
        <Ionicons name="lock-closed-outline" size={16} color="#999" />
      )}
    </View>
  </View>
);

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#FE724C",
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTitle: {
    marginTop: 12,
    fontSize: 22,
    fontFamily: "PoppinsBold",
    fontWeight: "900",
    color: "#fff",
  },

  inputCard: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: "PoppinsBold",
    color: "#64748B",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: "PoppinsMedium",
    color: "#1E293B",
  },
  picker: {
    flex: 1,
    marginLeft: 4,
    color: "#1E293B",
  },

  saveBtn: {
    backgroundColor: "#FE724C",
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    elevation: 6,
    shadowColor: "#FE724C",
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "PoppinsBold",
    fontWeight: '900',
  },
});
