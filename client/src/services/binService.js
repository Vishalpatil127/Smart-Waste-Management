import api from './api';

export const getAllBins = async (status = '') => {
  const params = status ? { status } : {};
  const { data } = await api.get('/bins', { params });
  return data;
};

export const getCriticalBins = async () => {
  const { data } = await api.get('/bins/critical');
  return data;
};

export const getBinById = async (binId) => {
  const { data } = await api.get(`/bins/${binId}`);
  return data;
};

export const updateBin = async (payload) => {
  const { data } = await api.post('/bins/update', payload);
  return data;
};
