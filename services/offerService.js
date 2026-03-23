import api from "../config/api";

/**
 * Fetch all active promotional offers.
 * Returns an array of offer objects, each with: id, title, description, banner_image, status, targets
 */
export const fetchActiveOffers = async () => {
  try {
    const res = await api.get("/offers");
    if (res.data.status === 1) {
      // Only return active offers
      return (res.data.data || []).filter(o => o.status === "active");
    }
    return [];
  } catch (error) {
    console.error("Fetch Offers Error:", error.response?.data || error.message);
    return [];
  }
};
