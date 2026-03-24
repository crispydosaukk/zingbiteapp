import api from "../config/api";

export const fetchCategories = async (userId) => {
  try {
    const res = await api.get(`/categories?user_id=${userId}`);

    if (res.data.status === 1) {
      return res.data.data
        .map(cat => ({
          id: cat.id,
          userId: cat.user_id,
          name: cat.name,
          image: cat.image,
          sort_order: cat.sort_order
        }))
        .sort((a, b) => a.sort_order - b.sort_order);  // <--- IMPORTANT
    }

    return [];
  } catch (error) {
    console.error("Category API Error:", error.response?.data || error);
    return [];
  }
};

