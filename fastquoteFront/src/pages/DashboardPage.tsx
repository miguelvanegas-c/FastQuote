import React, { useEffect, useMemo, useState } from 'react';
import { DashboardShell, type DashboardSection } from '../components/DashboardShell';
import { useProductos } from '../hooks/useProductos';
import { demandaService } from '../services/demandaService';

interface DashboardPageProps {
  onNavigate: (section: DashboardSection) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

const dashboardNumberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const dashboardCompactFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

type SeriesItem = {
  label: string;
  value: number;
  note?: string;
};

type TopThreePrediction = {
  fecha: string;
  prediccion: number | null;
};

type TopThreeCard = {
  rank: number;
  id: string;
  name: string;
  count: number;
  trainingStatus: string;
  trainingSamples: number | null;
  trainingMae: number | null;
  trainingRmse: number | null;
  trainingMape: number | null;
  predictionStatus: string;
  horizonDays: number | null;
  leadTimeDays: number | null;
  predictions: TopThreePrediction[];
  stockActual: number | null;
  demandaLeadTime: number | null;
  stockSeguridad: number | null;
  puntoReorden: number | null;
  cantidadSugeridaPedido: number | null;
  accion: string;
  modelSamples: number | null;
  modelMae: number | null;
  modelRmse: number | null;
  modelMape: number | null;
};

type DashboardStats = {
  totalQuotes: string;
  uniqueClients: string;
};

function parseMaybeJson(data: unknown): unknown {
  if (typeof data !== 'string') return data;

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function extractArray(data: unknown, preferredKeys: string[] = []): unknown[] {
  const parsed = parseMaybeJson(data);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const record = parsed as Record<string, unknown>;

  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const numericEntries = Object.entries(record).filter(([, value]) => typeof value === 'number' || (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))));
  if (numericEntries.length > 0) {
    return numericEntries.map(([label, value]) => ({ label, value }));
  }

  return [];
}

function normalizeSeries(data: unknown, preferredKeys: string[], labelKeys: string[], valueKeys: string[]): SeriesItem[] {
  const items = extractArray(data, preferredKeys);

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return { label: item, value: index + 1 };
    }

    if (typeof item === 'number') {
      return { label: `Item ${index + 1}`, value: item };
    }

    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const label = firstString(record, labelKeys) || `Item ${index + 1}`;
      const value = firstNumber(record, valueKeys) ?? (typeof record.value === 'number' ? record.value : index + 1);
      const note = firstString(record, ['accion', 'criticidad', 'categoria', 'talla']);
      return { label, value, note: note || undefined };
    }

    return { label: `Item ${index + 1}`, value: index + 1 };
  });
}

function normalizeTopThree(data: unknown): TopThreeCard[] {
  const parsed = parseMaybeJson(data);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const topProducts = extractArray(record, ['top_products', 'top_three', 'topThree', 'productos']);
  const results = extractArray(record, ['results', 'data']);

  return topProducts.slice(0, 3).map((item, index) => {
    const topProductRecord = item && typeof item === 'object' ? item as Record<string, unknown> : null;
    const resultRecord = results[index] && typeof results[index] === 'object' ? results[index] as Record<string, unknown> : null;
    const productRecord = (resultRecord?.producto && typeof resultRecord.producto === 'object')
      ? resultRecord.producto as Record<string, unknown>
      : topProductRecord;
    const predictionRecord = resultRecord?.prediction && typeof resultRecord.prediction === 'object'
      ? resultRecord.prediction as Record<string, unknown>
      : null;
    const trainingRecord = resultRecord?.training && typeof resultRecord.training === 'object'
      ? resultRecord.training as Record<string, unknown>
      : null;
    const trainingMetrics = trainingRecord?.metrics && typeof trainingRecord.metrics === 'object'
      ? trainingRecord.metrics as Record<string, unknown>
      : null;
    const modelMetrics = predictionRecord?.model_metrics && typeof predictionRecord.model_metrics === 'object'
      ? predictionRecord.model_metrics as Record<string, unknown>
      : null;
    const inventoryRecommendation = predictionRecord?.inventory_recommendation && typeof predictionRecord.inventory_recommendation === 'object'
      ? predictionRecord.inventory_recommendation as Record<string, unknown>
      : null;
    const predictionItems = extractArray(predictionRecord, ['predictions']);

    return {
      rank: index + 1,
      id: firstString(productRecord ?? {}, ['id', '_id']) || `top-${index + 1}`,
      name: firstString(productRecord ?? {}, ['nombre', 'nombre_producto', 'product_name', 'producto', 'product', 'label', 'name']) || `Producto ${index + 1}`,
      count: firstNumber(productRecord ?? {}, ['conteo', 'count', 'total', 'value']) ?? 0,
      trainingStatus: firstString(trainingRecord ?? {}, ['status']) || 'Sin dato',
      trainingSamples: firstNumber(trainingMetrics ?? {}, ['samples']),
      trainingMae: firstNumber(trainingMetrics ?? {}, ['mae']),
      trainingRmse: firstNumber(trainingMetrics ?? {}, ['rmse']),
      trainingMape: firstNumber(trainingMetrics ?? {}, ['mape']),
      predictionStatus: firstString(predictionRecord ?? {}, ['status']) || 'Sin dato',
      horizonDays: firstNumber(predictionRecord ?? {}, ['horizon_days', 'horizonDays']),
      leadTimeDays: firstNumber(predictionRecord ?? {}, ['lead_time_days', 'leadTimeDays']),
      predictions: predictionItems.map((predictionItem, predictionIndex) => {
        if (predictionItem && typeof predictionItem === 'object') {
          const predictionItemRecord = predictionItem as Record<string, unknown>;
          return {
            fecha: firstString(predictionItemRecord, ['fecha', 'date']) || `Día ${predictionIndex + 1}`,
            prediccion: firstNumber(predictionItemRecord, ['prediccion', 'prediction', 'value']),
          };
        }

        return {
          fecha: `Día ${predictionIndex + 1}`,
          prediccion: typeof predictionItem === 'number' ? predictionItem : null,
        };
      }),
      stockActual: firstNumber(inventoryRecommendation ?? {}, ['stock_actual', 'stockActual']),
      demandaLeadTime: firstNumber(inventoryRecommendation ?? {}, ['demanda_estimada_lead_time', 'demandaLeadTime']),
      stockSeguridad: firstNumber(inventoryRecommendation ?? {}, ['stock_seguridad', 'stockSeguridad']),
      puntoReorden: firstNumber(inventoryRecommendation ?? {}, ['punto_reorden', 'puntoReorden']),
      cantidadSugeridaPedido: firstNumber(inventoryRecommendation ?? {}, ['cantidad_sugerida_pedido', 'cantidadSugeridaPedido']),
      accion: firstString(inventoryRecommendation ?? {}, ['accion']) || 'Sin dato',
      modelSamples: firstNumber(modelMetrics ?? {}, ['samples']),
      modelMae: firstNumber(modelMetrics ?? {}, ['mae']),
      modelRmse: firstNumber(modelMetrics ?? {}, ['rmse']),
      modelMape: firstNumber(modelMetrics ?? {}, ['mape']),
    };
  });
}

function normalizeStats(data: unknown): DashboardStats | null {
  const parsed = parseMaybeJson(data);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  return {
    totalQuotes: dashboardNumberFormat.format(firstNumber(record, ['total_cotizaciones', 'cotizaciones_totales', 'totalQuotes', 'quotes_total']) ?? 0),
    uniqueClients: dashboardNumberFormat.format(firstNumber(record, ['clientes_unicos', 'unique_clients', 'uniqueClients']) ?? 0),
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { productos, loading, error } = useProductos();
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [demandAnalysis, setDemandAnalysis] = useState<unknown>(null);
  const [topThreeAnalysis, setTopThreeAnalysis] = useState<unknown>(null);
  const [statsAnalysis, setStatsAnalysis] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const [analysisResult, topThreeResult, statsResult] = await Promise.allSettled([
        demandaService.analizar(),
        demandaService.topThreeProductos(),
        demandaService.estadisticas(),
      ]);

      if (!active) {
        return;
      }

      if (analysisResult.status === 'fulfilled') setDemandAnalysis(analysisResult.value);
      else setDemandAnalysis(null);

      if (topThreeResult.status === 'fulfilled') setTopThreeAnalysis(topThreeResult.value);
      else setTopThreeAnalysis(null);

      if (statsResult.status === 'fulfilled') setStatsAnalysis(statsResult.value);
      else setStatsAnalysis(null);

      if ([analysisResult, topThreeResult, statsResult].some((item) => item.status === 'rejected')) {
        setAnalyticsError('Algunas gráficas de demanda no pudieron cargarse');
      }

      setAnalyticsLoading(false);
    };

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalProductos = productos.length;
    const stockTotal = productos.reduce((total, producto) => total + producto.stock, 0);
    const precioPromedio = totalProductos > 0
      ? productos.reduce((total, producto) => total + producto.precio, 0) / totalProductos
      : 0;
    const valorInventario = productos.reduce((total, producto) => total + (producto.precio * producto.stock), 0);
    const lowStock = productos.filter((producto) => producto.stock <= 5).length;

    const topByStock = [...productos]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 6);

    const stockMax = Math.max(...topByStock.map((producto) => producto.stock), 1);

    const stockBuckets = productos.reduce(
      (accumulator, producto) => {
        if (producto.stock <= 5) accumulator.low += 1;
        else if (producto.stock <= 15) accumulator.medium += 1;
        else accumulator.high += 1;
        return accumulator;
      },
      { low: 0, medium: 0, high: 0 }
    );

    const bucketTotal = Math.max(stockBuckets.low + stockBuckets.medium + stockBuckets.high, 1);

    return {
      totalProductos,
      stockTotal,
      precioPromedio,
      valorInventario,
      lowStock,
      topByStock,
      stockMax,
      stockBuckets,
      bucketTotal,
    };
  }, [productos]);

  const demandByProduct = useMemo(
    () => normalizeSeries(demandAnalysis, ['demanda_por_producto', 'productos', 'items', 'data', 'results'], ['nombre', 'producto', 'product', 'label'], ['cantidad', 'total', 'demanda', 'count', 'pedidos', 'value']),
    [demandAnalysis]
  );

  const popularSizes = useMemo(
    () => normalizeSeries(demandAnalysis, ['tallas_mas_populares', 'tallas', 'sizes', 'popular_sizes'], ['talla', 'size', 'label', 'nombre'], ['cantidad', 'total', 'count', 'value']),
    [demandAnalysis]
  );

  const topThreeProducts = useMemo(() => normalizeTopThree(topThreeAnalysis), [topThreeAnalysis]);

  const statsCards = useMemo(() => normalizeStats(statsAnalysis), [statsAnalysis]);

  return (
    <DashboardShell
      activeSection="dashboard"
      onNavigate={onNavigate}
      title="Dashboard"
      subtitle="Visualización dinámica del inventario"
      topActions={(
        <button
          type="button"
          onClick={() => onNavigate('productos')}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Ver productos
        </button>
      )}
    >
      {loading && <p className="mb-4 text-sm text-slate-500">Cargando inventario...</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total productos</p>
            <div className="mt-3 text-3xl font-bold text-slate-900">{metrics.totalProductos}</div>
            <p className="mt-2 text-sm text-slate-500">Referencias activas en inventario</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stock total</p>
            <div className="mt-3 text-3xl font-bold text-slate-900">{metrics.stockTotal}</div>
            <p className="mt-2 text-sm text-slate-500">Unidades disponibles en bodega</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Valor inventario</p>
            <div className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(metrics.valorInventario)}</div>
            <p className="mt-2 text-sm text-slate-500">Precio por stock actual</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bajo stock</p>
            <div className="mt-3 text-3xl font-bold text-slate-900">{metrics.lowStock}</div>
            <p className="mt-2 text-sm text-slate-500">Productos con 5 unidades o menos</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Gráfica</p>
                <h3 className="text-xl font-bold text-slate-900">Stock por producto</h3>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                Top {Math.min(metrics.topByStock.length, 6)}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {metrics.topByStock.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Aún no hay productos para graficar.
                </div>
              ) : (
                metrics.topByStock.map((producto) => {
                  const width = (producto.stock / metrics.stockMax) * 100;
                  return (
                    <div key={producto._id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{producto.nombre}</span>
                        <span className="text-slate-500">{producto.stock} unidades</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Distribución</p>
                <h3 className="text-xl font-bold text-slate-900">Niveles de inventario</h3>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="relative h-44 w-44 rounded-full bg-slate-100">
                  <svg viewBox="0 0 36 36" className="h-44 w-44 -rotate-90">
                    {(() => {
                      const lowPercent = (metrics.stockBuckets.low / metrics.bucketTotal) * 100;
                      const mediumPercent = (metrics.stockBuckets.medium / metrics.bucketTotal) * 100;
                      const highPercent = (metrics.stockBuckets.high / metrics.bucketTotal) * 100;
                      const segments = [
                        { percent: lowPercent, color: '#ef4444' },
                        { percent: mediumPercent, color: '#f59e0b' },
                        { percent: highPercent, color: '#10b981' },
                      ];
                      let offset = 0;

                      return segments.map((segment) => {
                        const strokeDasharray = `${segment.percent} ${100 - segment.percent}`;
                        const circle = (
                          <circle
                            key={`${segment.color}-${segment.percent}`}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += segment.percent;
                        return circle;
                      });
                    })()}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{metrics.totalProductos}</div>
                      <div className="text-xs text-slate-500">productos</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs font-semibold">
                <div className="rounded-2xl bg-red-50 px-3 py-3 text-red-700">Bajo: {metrics.stockBuckets.low}</div>
                <div className="rounded-2xl bg-amber-50 px-3 py-3 text-amber-700">Medio: {metrics.stockBuckets.medium}</div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-emerald-700">Alto: {metrics.stockBuckets.high}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Demanda & predicción</p>
                <h3 className="text-xl font-bold text-slate-900">Productos más pedidos</h3>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                {analyticsLoading ? 'Cargando...' : `${demandByProduct.length} items`}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {analyticsLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Consultando análisis de demanda...
                </div>
              )}

              {!analyticsLoading && demandByProduct.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No hay datos de demanda por producto.
                </div>
              )}

              {!analyticsLoading && demandByProduct.length > 0 && demandByProduct.slice(0, 8).map((item, index) => {
                const maxValue = Math.max(...demandByProduct.map((entry) => entry.value), 1);
                const width = (item.value / maxValue) * 100;
                return (
                  <div key={`${item.label}-${index}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{dashboardCompactFormat.format(item.value)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tallas</p>
                <h3 className="text-xl font-bold text-slate-900">Más populares</h3>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                {popularSizes.length || 0}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {analyticsLoading && <p className="text-sm text-slate-500">Cargando tallas más pedidas...</p>}
              {!analyticsLoading && popularSizes.length === 0 && <p className="text-sm text-slate-500">No hay tallas populares para mostrar.</p>}
              {!analyticsLoading && popularSizes.slice(0, 8).map((item, index) => {
                const maxValue = Math.max(...popularSizes.map((entry) => entry.value), 1);
                const width = (item.value / maxValue) * 100;
                return (
                  <div key={`${item.label}-${index}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{dashboardCompactFormat.format(item.value)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top tres</p>
              <h3 className="text-xl font-bold text-slate-900">Top three</h3>
            </div>
            <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              {analyticsLoading ? 'Cargando...' : `${topThreeProducts.length} productos`}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {analyticsLoading && (
              <div className="xl:col-span-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Cargando top tres productos...
              </div>
            )}

            {!analyticsLoading && topThreeProducts.length === 0 && (
              <div className="xl:col-span-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No hay top tres para mostrar.
              </div>
            )}

            {!analyticsLoading && topThreeProducts.map((item) => {
              const cardTone = item.rank === 1
                ? 'from-amber-400 via-orange-500 to-rose-500'
                : item.rank === 2
                  ? 'from-slate-400 via-slate-500 to-slate-700'
                  : 'from-emerald-400 via-sky-500 to-indigo-500';

              const heightClass = item.rank === 1 ? 'xl:translate-y-0' : item.rank === 2 ? 'xl:translate-y-4' : 'xl:translate-y-8';

              return (
                <article
                  key={`${item.rank}-${item.id}`}
                  className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm ${heightClass}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cardTone}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">#{item.rank}</p>
                      <h4 className="mt-2 text-2xl font-bold leading-tight">{item.name}</h4>
                      <p className="mt-2 text-sm text-slate-300">{dashboardNumberFormat.format(item.count)} cotizaciones</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white">
                      {item.rank}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Entrenamiento</p>
                      <p className="mt-2 text-sm text-white/90">{item.trainingStatus}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        Muestras: {item.trainingSamples ?? '—'} | MAE: {item.trainingMae ?? '—'} | RMSE: {item.trainingRmse ?? '—'} | MAPE: {item.trainingMape ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Predicción</p>
                      <p className="mt-2 text-sm text-white/90">{item.predictionStatus}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        Horizonte: {item.horizonDays ?? '—'} días | Lead time: {item.leadTimeDays ?? '—'} días
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recomendación</p>
                      <p className="mt-2 text-sm text-white/90">{item.accion}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        Stock actual: {item.stockActual ?? '—'} | Seguridad: {item.stockSeguridad ?? '—'} | Reorden: {item.puntoReorden ?? '—'} | Pedido: {item.cantidadSugeridaPedido ?? '—'}
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Predicciones 7 días</p>
                      <p className="text-xs text-slate-300">
                        Total estimado: {dashboardNumberFormat.format(item.predictions.reduce((total, prediction) => total + (prediction.prediccion ?? 0), 0))}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                      {item.predictions.map((prediction, predictionIndex) => (
                        <div
                          key={`${item.id}-${predictionIndex}`}
                          className={`rounded-xl px-2 py-2 text-center ring-1 ${prediction.prediccion && prediction.prediccion > 0 ? 'bg-emerald-500/15 ring-emerald-400/20' : 'bg-slate-950/60 ring-white/10'}`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{prediction.fecha}</p>
                          <p className="mt-1 text-lg font-bold text-white">{prediction.prediccion ?? '—'}</p>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${prediction.prediccion && prediction.prediccion > 0 ? 'bg-emerald-400' : 'bg-slate-500'}`}
                              style={{ width: `${prediction.prediccion && prediction.prediccion > 0 ? 100 : 35}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estadísticas</p>
              <h3 className="text-xl font-bold text-slate-900">Resumen general de cotizaciones</h3>
            </div>
            {analyticsError && <p className="text-sm text-amber-600">{analyticsError}</p>}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cotizaciones</p>
              <div className="mt-3 text-3xl font-bold text-slate-900">
                {statsCards?.totalQuotes || '—'}
              </div>
              <p className="mt-2 text-sm text-slate-500">Total de cotizaciones analizadas</p>
            </article>

            <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clientes únicos</p>
              <div className="mt-3 text-3xl font-bold text-slate-900">
                {statsCards?.uniqueClients || '—'}
              </div>
              <p className="mt-2 text-sm text-slate-500">Cantidad de clientes distintos</p>
            </article>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};
