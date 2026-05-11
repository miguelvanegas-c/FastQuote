import { useState } from 'react';
import { predictService } from '../services/predictService';

type PredictionMetrics = {
  samples?: number;
  mae?: number;
  rmse?: number;
  mape?: number;
};

type PredictionData = {
  status?: string;
  model_path?: string;
  metrics?: PredictionMetrics;
  [key: string]: unknown;
};

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parsePredictionData(data: unknown): PredictionData | null {
  const normalizedData = typeof data === 'string' ? tryParseJson(data) : data;

  if (!normalizedData || typeof normalizedData !== 'object' || Array.isArray(normalizedData)) {
    return null;
  }

  return normalizedData as PredictionData;
}

function formatMetrics(metrics: Record<string, unknown>): string[] {
  const lines: string[] = [];

  if (typeof metrics.samples === 'number') {
    lines.push(`Muestras: ${metrics.samples}`);
  }

  if (typeof metrics.mae === 'number') {
    lines.push(`MAE: ${metrics.mae}`);
  }

  if (typeof metrics.rmse === 'number') {
    lines.push(`RMSE: ${metrics.rmse}`);
  }

  if (typeof metrics.mape === 'number') {
    lines.push(`MAPE: ${metrics.mape}%`);
  }

  return lines;
}

function formatResponse(data: unknown): string {
  const normalizedData = typeof data === 'string' ? tryParseJson(data) : data;

  if (typeof normalizedData === 'string') {
    return normalizedData;
  }

  if (normalizedData && typeof normalizedData === 'object') {
    const response = normalizedData as Record<string, unknown>;
    const summaryLines: string[] = [];

    if (typeof response.status === 'string') {
      summaryLines.push(`Estado: ${response.status}`);
    }

    if (typeof response.model_path === 'string') {
      summaryLines.push(`Modelo: ${response.model_path}`);
    }

    if (response.metrics && typeof response.metrics === 'object' && !Array.isArray(response.metrics)) {
      const metricLines = formatMetrics(response.metrics as Record<string, unknown>);
      if (metricLines.length > 0) {
        summaryLines.push('Métricas:');
        summaryLines.push(...metricLines.map((line) => `  - ${line}`));
      }
    }

    if (summaryLines.length > 0) {
      return summaryLines.join('\n');
    }
  }

  try {
    return JSON.stringify(normalizedData, null, 2);
  } catch {
    return String(normalizedData);
  }
}

export function usePrediccion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [data, setData] = useState<PredictionData | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const runAction = async (action: string, executor: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    setLastAction(action);
    try {
      const data = await executor();
      setData(parsePredictionData(data));
      setResult(formatResponse(data));
    } catch {
      setData(null);
      setError(`No se pudo ejecutar ${action.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    result,
    data,
    lastAction,
    train: (productoId: string) => runAction('Entrenar modelo', () => predictService.train(productoId)),
    predict: (productoId: string, days?: number, leadTimeDays?: number) =>
      runAction('Predecir demanda', () => predictService.predict(productoId, days, leadTimeDays)),
  };
}
