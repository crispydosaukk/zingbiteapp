import api from "../config/api";

export const fetchProducts = async (userId, categoryId) => {
  try {
    const res = await api.get(`/products?user_id=${userId}&cat_id=${categoryId}`);

    if (res.data.status === 1) {
      return res.data.data
        .map(product => {
          // Robust parsing for 'contains' field matching dashboard logic
          let c = product.contains;
          try {
            if (typeof c === 'string') c = JSON.parse(c);
            if (typeof c === 'string') c = JSON.parse(c); // Handle double-serialization
          } catch (e) {
            console.warn("Error parsing product contains:", e);
          }

          return {
            ...product, // The API natively returns 'price' and 'discount_price'
            contains: Array.isArray(c) ? c : [],
            restaurantId: product.user_id,
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order);  // 🟢 IMPORTANT
    }

    return [];
  } catch (err) {
    console.log("Product Service Error:", err.response?.data || err);
    return [];
  }
};
