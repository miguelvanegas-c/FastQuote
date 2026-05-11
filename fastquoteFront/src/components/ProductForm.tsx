import React, { useState, useEffect } from 'react';
import type { Producto } from '../types/Producto';

interface ProductFormProps {
  initialData?: Producto | null;
  onSubmit: (data: Omit<Producto, '_id'>) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(0);
  const [stock, setStock] = useState(0);
  const [talla, setTalla] = useState(1);

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre);
      setPrecio(initialData.precio);
      setStock(initialData.stock);
      setTalla(initialData.talla);
    } else {
      setNombre('');
      setPrecio(0);
      setStock(0);
      setTalla(1);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ nombre, precio, stock, talla });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Formulario de producto</p>
          <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Editar producto' : 'Nuevo producto'}</h3>
        </div>
        <div className="grid gap-4 px-6 py-6">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Precio</span>
          <input
            type="number"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={precio}
            onChange={e => setPrecio(Number(e.target.value))}
            min={0}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Stock</span>
          <input
            type="number"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={stock}
            onChange={e => setStock(Number(e.target.value))}
            min={0}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Talla</span>
          <input
            type="number"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            value={talla}
            onChange={e => setTalla(Number(e.target.value))}
            min={1}
            max={60}
            required
          />
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onCancel} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Cancelar</button>
          <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Guardar</button>
        </div>
        </div>
      </form>
    </div>
  );
};
