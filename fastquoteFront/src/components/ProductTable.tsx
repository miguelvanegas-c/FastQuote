import React from 'react';
import type { Producto } from '../types/Producto';
import { IconButton } from './IconButton';

interface ProductTableProps {
  productos: Producto[];
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
  onPredict: (productoId: string) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ productos, onEdit, onDelete, onPredict }) => {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-sm text-slate-600">
            <th className="px-5 py-3 text-left font-semibold">Nombre</th>
            <th className="px-5 py-3 text-left font-semibold">Precio</th>
            <th className="px-5 py-3 text-left font-semibold">Stock</th>
            <th className="px-5 py-3 text-left font-semibold">Talla</th>
            <th className="px-5 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {productos.map((producto) => (
            <tr key={producto._id} className="text-sm text-slate-700 transition hover:bg-slate-50">
              <td className="px-5 py-4 font-medium text-slate-900">{producto.nombre}</td>
              <td className="px-5 py-4">${producto.precio}</td>
              <td className="px-5 py-4">{producto.stock}</td>
              <td className="px-5 py-4">{producto.talla}</td>
              <td className="px-5 py-4">
                <div className="flex justify-center gap-2">
                  <IconButton
                    title="Predecir demanda"
                    onClick={() => producto._id && onPredict(producto._id)}
                    className="bg-indigo-50 hover:bg-indigo-100"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-indigo-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 4-4 3 3 5-5" />
                      </svg>
                    }
                  />
                  <IconButton
                    title="Editar"
                    onClick={() => onEdit(producto)}
                    className="bg-blue-50 hover:bg-blue-100"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4 14.362-14.303z" />
                      </svg>
                    }
                  />
                  <IconButton
                    title="Eliminar"
                    onClick={() => producto._id && onDelete(producto._id)}
                    className="bg-red-50 hover:bg-red-100"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-red-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    }
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
