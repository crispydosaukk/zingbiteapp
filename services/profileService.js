import api from "../config/api";

export async function fetchProfile() {
  const res = await api.get("/profile");
  return res.data;
}

export async function updateProfile(data) {
  const res = await api.put("/profile", data);
  return res.data;
}

export async function deleteAccount() {
  const res = await api.delete("/profile");
  return res.data;
}
