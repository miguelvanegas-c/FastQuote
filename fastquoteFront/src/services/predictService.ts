import axios from 'axios';
import { API_URL } from './apiConfig';

export const predictService = {
  train: async (productoId: string): Promise<unknown> => {
    const response = await axios.post(`${API_URL}/predict/train/${productoId}`);
    return response.data;
  },
  predict: async (productoId: string, days = 7, leadTimeDays = 7): Promise<unknown> => {
    const response = await axios.get(`${API_URL}/predict/predict/${productoId}`, {
      params: { days, lead_time_days: leadTimeDays },
    });
    return response.data;
  },
};
