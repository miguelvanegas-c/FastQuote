import axios from 'axios';
import { API_URL } from './apiConfig';

export const demandaService = {
  analizar: async (): Promise<unknown> => {
    const response = await axios.get(`${API_URL}/demanda/analizar`);
    return response.data;
  },
  sugerenciasStock: async (porcentajeSeguridad = 20): Promise<unknown> => {
    const response = await axios.get(`${API_URL}/demanda/sugerencias-stock`, {
      params: { porcentaje_seguridad: porcentajeSeguridad },
    });
    return response.data;
  },
  rotacionInventario: async (): Promise<unknown> => {
    const response = await axios.get(`${API_URL}/demanda/rotacion-inventario`);
    return response.data;
  },
  estadisticas: async (): Promise<unknown> => {
    const response = await axios.get(`${API_URL}/demanda/estadisticas`);
    return response.data;
  },
  topThreeProductos: async (): Promise<unknown> => {
    const response = await axios.post(`${API_URL}/predict/top-three`);
    return response.data;
  },
};