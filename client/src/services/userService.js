import api from './api';

/**
 * Fetch all users.  An admin can optionally filter by role.
 * GET /api/users?role=employee
 */
export const getAllUsers = async (role = '') => {
  const params = role ? { role } : {};
  const { data } = await api.get('/users', { params });
  return data;
};

export const getUserById = async (id) => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};
