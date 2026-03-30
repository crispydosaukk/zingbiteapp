import api from "../config/api";

export const submitTableReservation = async (data) => {
  try {
    const res = await api.post("/table-reservation", data);
    return res.data;
  } catch (error) {
    console.error("Reservation API Error:", error.response?.data || error);
    return { status: 0, message: error.response?.data?.message || "Server connection failed" };
  }
};
