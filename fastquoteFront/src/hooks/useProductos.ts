import { useCallback, useEffect, useState } from 'react';
import { productosService } from '../services/productosService';
import type { Producto } from '../types/Producto';

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productosService.getAll();
      setProductos(data);
    } catch (err: any) {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const createProducto = async (producto: Omit<Producto, '_id'>) => {
    setLoading(true);
    try {
      await productosService.create(producto);
      await fetchProductos();
    } catch (err) {
      setError('Error al crear producto');
    } finally {
      setLoading(false);
    }
  };

  const updateProducto = async (id: string, producto: Partial<Producto>) => {
    setLoading(true);
    try {
      await productosService.update(id, producto);
      await fetchProductos();
    } catch (err) {
      setError('Error al actualizar producto');
    } finally {
      setLoading(false);
    }
  };

  const deleteProducto = async (id: string) => {
    setLoading(true);
    try {
      await productosService.delete(id);
      await fetchProductos();
    } catch (err) {
      setError('Error al eliminar producto');
    } finally {
      setLoading(false);
    }
  };

  return {
    productos,
    loading,
    error,
    createProducto,
    updateProducto,
    deleteProducto,
    fetchProductos,
  };
}
