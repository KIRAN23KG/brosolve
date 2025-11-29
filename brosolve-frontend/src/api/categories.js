// src/api/categories.js
import api from './axios';

export const fetchCategories = async (includeInactive = false) => {
  try {
    const params = includeInactive ? '?includeInactive=true' : '';
    const res = await api.get(`/categories${params}`);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
};

export const createCategory = async (name, description = '') => {
  const res = await api.post('/categories', { name, description });
  return res.data;
};

export const updateCategory = async (id, data) => {
  const res = await api.patch(`/categories/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id) => {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
};

export const restoreCategory = async (id) => {
  const res = await api.patch(`/categories/${id}/restore`);
  return res.data;
};

