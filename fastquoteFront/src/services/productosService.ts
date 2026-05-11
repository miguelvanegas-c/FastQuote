
import axios from 'axios';
import type { Producto } from '../types/Producto';
import { API_URL } from './apiConfig';

export const productosService = {
  getAll: async (): Promise<Producto[]> => {
    const res = await axios.get(`${API_URL}/productos/`);
    return res.data;
  },
  getById: async (id: string): Promise<Producto> => {
    const res = await axios.get(`${API_URL}/productos/${id}`);
    return res.data;
  },
  create: async (producto: Omit<Producto, '_id'>): Promise<Producto> => {
    const res = await axios.post(`${API_URL}/productos/`, producto);
    return res.data;
  },
  update: async (id: string, producto: Partial<Producto>): Promise<Producto> => {
    const res = await axios.patch(`${API_URL}/productos/${id}`, producto);
    return res.data;
  },
  delete: async (id: string): Promise<string> => {
    const res = await axios.delete(`${API_URL}/productos/${id}`);
    return res.data;
  },
};
