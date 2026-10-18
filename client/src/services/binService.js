import api from './api';
import { syncBinToFirestore } from './firebase';

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

/**
 * Update bin fill level.
 * 1. Sends to Express API → MongoDB (source of truth).
 * 2. Syncs the updated bin to Firestore for real-time frontend listeners.
 */
export const updateBin = async (payload) => {
  const { data } = await api.post('/bins/update', payload);

  // Mirror to Firestore so all connected clients update instantly
  if (data?.data) {
    await syncBinToFirestore(data.data);
  }

  return data;
};
