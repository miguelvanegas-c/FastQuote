import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProductos } from '../hooks/useProductos';
import { ProductTable } from '../components/ProductTable';
import { ProductForm } from '../components/ProductForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Producto } from '../types/Producto';
import { DashboardShell, type DashboardSection } from '../components/DashboardShell';
import { usePrediccion } from '../hooks/usePrediccion';

interface ProductosPageProps {
  onNavigate: (section: DashboardSection) => void;
}

export const ProductosPage: React.FC<ProductosPageProps> = ({ onNavigate }) => {
  const { productos, loading, error, createProducto, updateProducto, deleteProducto } = useProductos();
  const compactNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
  const { loading: prediccionLoading, error: prediccionError, result: prediccionResult, data: prediccionData, lastAction: prediccionLastAction, train, predict } = usePrediccion();
  const [editing, setEditing] = useState<Producto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedPredictProducto, setSelectedPredictProducto] = useState<Producto | null>(null);
  const [predictDays, setPredictDays] = useState(7);
  const [predictLeadTimeDays, setPredictLeadTimeDays] = useState(7);

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const predictionValue = (() => {
    if (!prediccionData) return '';

    const preferredKeys = [
      'prediction',
      'prediccion',
      'result',
      'resultado',
      'value',
      'forecast',
      'predicted_value',
      'prediction_value',
      'output',
    ];

    for (const key of preferredKeys) {
      const value = prediccionData[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    const extraEntry = Object.entries(prediccionData).find(([key, value]) => {
      return !['status', 'model_path', 'metrics'].includes(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean');
    });

    return extraEntry ? String(extraEntry[1]) : '';
  })();

  const inventoryRecommendation = prediccionData?.inventory_recommendation as
    | {
        stock_actual?: number;
        lead_time_days?: number;
        demanda_estimada_lead_time?: number;
        stock_seguridad?: number;
        punto_reorden?: number;
        cantidad_sugerida_pedido?: number;
        accion?: string;
      }
    | undefined;

  const predictions = Array.isArray(prediccionData?.predictions) ? prediccionData?.predictions as Array<{ fecha?: string; prediccion?: number }> : [];

  const handleEdit = (producto: Producto) => {
    setEditing(producto);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const handlePredict = (productoId: string) => {
    const producto = productos.find((item) => item._id === productoId) ?? null;
    setSelectedPredictProducto(producto);
    setPredictDays(7);
    setPredictLeadTimeDays(7);
    setShowPredictModal(true);
  };

  const handleFormSubmit = async (data: Omit<Producto, '_id'>) => {
    if (editing && editing._id) {
      await updateProducto(editing._id, data);
    } else {
      await createProducto(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteProducto(deleteId);
      setDeleteId(null);
    }
  };

  const closePredictModal = () => {
    setShowPredictModal(false);
    setSelectedPredictProducto(null);
  };

  const handleTrainPredict = async () => {
    if (!selectedPredictProducto?._id) return;
    await train(selectedPredictProducto._id);
    await predict(selectedPredictProducto._id, predictDays, predictLeadTimeDays);
  };

  const exportToExcel = () => {
    const rows = productos.map((producto) => ({
      Nombre: producto.nombre,
      Precio: producto.precio,
      Stock: producto.stock,
      Talla: producto.talla,
      ID: producto._id ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'inventario_actual.xlsx');
  };

  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Inventario actual', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Precio', 'Stock', 'Talla', 'ID']],
      body: productos.map((producto) => [
        producto.nombre,
        `$${producto.precio}`,
        String(producto.stock),
        String(producto.talla),
        producto._id ?? '',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [24, 34, 53] },
      styles: { fontSize: 9 },
    });

    doc.save('inventario_actual.pdf');
  };

  return (
    <DashboardShell
      activeSection="productos"
      onNavigate={onNavigate}
      title="Productos"
      subtitle="Inventario actual y acciones rápidas"
      topActions={(
        <>
          <label className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.4a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar referencia"
              className="w-44 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReportMenu((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Reporte
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showReportMenu && (
              <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    exportToExcel();
                    setShowReportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Exportar a Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToPdf();
                    setShowReportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Exportar a PDF
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo producto
          </button>
        </>
      )}
    >
      {showReportMenu && (
        <button
          type="button"
          aria-label="Cerrar menú de reportes"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setShowReportMenu(false)}
        />
      )}

      <div className="space-y-6">
        {loading && <p className="text-sm text-slate-500">Cargando...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Listado</p>
                <h3 className="text-lg font-bold text-slate-900">Productos</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {productosFiltrados.length} visibles
              </div>
            </div>

            <ProductTable
              productos={productosFiltrados}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPredict={handlePredict}
            />
          </div>
        </section>
      </div>

      {showForm && (
        <ProductForm
          initialData={editing}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar producto"
        message="¿Estás seguro que deseas eliminar este producto?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {showPredictModal && selectedPredictProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Predicción de demanda</p>
              <h3 className="text-xl font-bold text-slate-900">{selectedPredictProducto.nombre}</h3>
              <p className="text-sm text-slate-500">ID: {selectedPredictProducto._id}</p>
            </div>

            <div className="grid gap-4 px-6 py-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Días a predecir</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={predictDays}
                      onChange={(event) => setPredictDays(Number(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Lead time</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={predictLeadTimeDays}
                      onChange={(event) => setPredictLeadTimeDays(Number(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={prediccionLoading}
                    onClick={handleTrainPredict}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Predecir
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl bg-[#182235] p-5 text-white shadow-sm lg:min-h-[460px]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recomendación</p>
                  <h4 className="mt-2 text-3xl font-bold leading-tight">
                    {inventoryRecommendation?.accion || 'Aún sin ejecutar'}
                  </h4>
                  <p className="mt-2 text-sm text-slate-300">
                    Esta es la sugerencia principal del sistema para decidir si debes comprar o no.
                  </p>
                </div>

                {prediccionLoading && <p className="text-sm text-slate-300">Consultando servicio...</p>}
                {prediccionError && <p className="text-sm text-red-300">{prediccionError}</p>}

                {!prediccionLoading && !prediccionError && inventoryRecommendation && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cantidad sugerida</p>
                      <p className="mt-2 text-3xl font-bold text-white">
                        {compactNumber.format(inventoryRecommendation.cantidad_sugerida_pedido ?? 0)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">Lo que el sistema sugiere pedir o mantener según la demanda estimada.</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stock actual</p>
                      <p className="mt-2 text-2xl font-bold text-white">{compactNumber.format(inventoryRecommendation.stock_actual ?? 0)}</p>
                      <p className="mt-2 text-sm text-slate-300">Unidades que tienes hoy en inventario.</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Punto de reorden</p>
                      <p className="mt-2 text-2xl font-bold text-white">{compactNumber.format(inventoryRecommendation.punto_reorden ?? 0)}</p>
                      <p className="mt-2 text-sm text-slate-300">Nivel mínimo para volver a comprar a tiempo.</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stock seguridad</p>
                      <p className="mt-2 text-2xl font-bold text-white">{compactNumber.format(inventoryRecommendation.stock_seguridad ?? 0)}</p>
                      <p className="mt-2 text-sm text-slate-300">Colchón para evitar quiebres de inventario.</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Demanda en lead time</p>
                      <p className="mt-2 text-2xl font-bold text-white">{compactNumber.format(inventoryRecommendation.demanda_estimada_lead_time ?? 0)}</p>
                      <p className="mt-2 text-sm text-slate-300">Demanda estimada mientras llega el pedido.</p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Acción</p>
                      <p className="mt-2 text-2xl font-bold text-white">{inventoryRecommendation.accion || 'Sin dato'}</p>
                      <p className="mt-2 text-sm text-slate-300">Interpretación rápida para decidir qué hacer.</p>
                    </div>
                  </div>
                )}

                {!prediccionLoading && !prediccionError && predictions.length > 0 && (
                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Predicciones por día</p>
                    <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
                      {predictions.map((item, index) => (
                        <div key={`${item.fecha ?? index}-${index}`} className="flex items-center justify-between rounded-2xl bg-black/15 px-4 py-3">
                          <span className="text-sm text-slate-200">{item.fecha || `Día ${index + 1}`}</span>
                          <span className="text-sm font-semibold text-white">{compactNumber.format(item.prediccion ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!prediccionLoading && !prediccionError && !inventoryRecommendation && !predictions.length && (
                  <p className="text-sm text-slate-300">Selecciona una acción para ver la recomendación.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closePredictModal}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};
