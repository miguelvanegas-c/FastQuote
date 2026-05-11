import os
from datetime import datetime, timedelta, timezone
from math import ceil, sqrt
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from src.repositories.cotizacion_repository import CotizacionRepository
from src.repositories.producto_repository import ProductoRepository

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)


class PredictService:
    def __init__(self, cotizacion_repo: CotizacionRepository, producto_repo: ProductoRepository):
        self.cotizacion_repo = cotizacion_repo
        self.producto_repo = producto_repo

    async def _resolve_search_term(self, producto_id: str) -> str:
        producto_info = await self.producto_repo.get_by_id(producto_id)
        if producto_info and producto_info.get("nombre"):
            return str(producto_info["nombre"]).strip().lower()
        return producto_id.strip().lower()

    async def _build_timeseries(self, producto_id: str) -> pd.DataFrame:
        """Construye una serie temporal diaria de conteos a partir de cotizaciones que contienen el producto."""
        search_term = await self._resolve_search_term(producto_id)
        cotizaciones = await self.cotizacion_repo.obtener_por_producto(search_term)
        if not cotizaciones:
            return pd.DataFrame()
        rows = []

        producto_info = await self.producto_repo.get_by_id(producto_id)
        producto_nombre = str(producto_info.get("nombre", "")).lower() if producto_info else None

        for cot in cotizaciones:
            fecha = None
            # intentar extraer fecha si existe (si no, usar _id timestamp)
            if "fecha" in cot:
                try:
                    fecha = pd.to_datetime(cot["fecha"]).date()
                except Exception:
                    fecha = None

            if fecha is None:
                try:
                    from bson import ObjectId

                    fecha = ObjectId(cot["_id"]).generation_time.date()
                except Exception:
                    fecha = datetime.now().date()

            productos = cot.get("productos", [])
            count = 0
            for p in productos:
                try:
                    if str(p.get("_id", "")) == str(producto_id):
                        count += 1
                        continue
                except Exception:
                    pass

                nombre_p = p.get("nombre", "")
                if nombre_p and producto_nombre and nombre_p.lower() == producto_nombre:
                    count += 1

            rows.append({"fecha": fecha, "count": count})

        df = pd.DataFrame(rows)
        if df.empty:
            return df

        # Asegurar que 'fecha' es datetime y re-muestrear por día
        df["fecha"] = pd.to_datetime(df["fecha"])
        df = df.set_index("fecha").resample("D").sum().fillna(0).reset_index()
        return df

    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.sort_values("fecha").copy()
        base_date = pd.to_datetime(df["fecha"]).min()
        df["day_idx"] = (pd.to_datetime(df["fecha"]) - base_date).dt.days
        df["dayofweek"] = pd.to_datetime(df["fecha"]).dt.dayofweek
        df["month"] = pd.to_datetime(df["fecha"]).dt.month
        df["dayofmonth"] = pd.to_datetime(df["fecha"]).dt.day
        df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)

        for lag in (1, 7, 14, 28):
            df[f"lag_{lag}"] = df["count"].shift(lag)

        df["rolling_mean_7"] = df["count"].shift(1).rolling(7, min_periods=1).mean()
        df["rolling_mean_14"] = df["count"].shift(1).rolling(14, min_periods=1).mean()
        df["rolling_std_7"] = df["count"].shift(1).rolling(7, min_periods=1).std().fillna(0)
        return df

    def _feature_columns(self) -> List[str]:
        return [
            "day_idx",
            "dayofweek",
            "month",
            "dayofmonth",
            "is_weekend",
            "lag_1",
            "lag_7",
            "lag_14",
            "lag_28",
            "rolling_mean_7",
            "rolling_mean_14",
            "rolling_std_7",
        ]

    def _prepare_training_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        df = self._add_time_features(df)
        feature_columns = self._feature_columns()
        numeric_columns = ["lag_1", "lag_7", "lag_14", "lag_28", "rolling_mean_7", "rolling_mean_14", "rolling_std_7"]
        fallback_value = float(df["count"].mean()) if not df.empty else 0.0
        for column in numeric_columns:
            df[column] = df[column].fillna(fallback_value)
        return df[["fecha", "count"] + feature_columns].copy()

    def _make_feature_row(self, history: pd.DataFrame, current_date: pd.Timestamp) -> Dict[str, float]:
        history = history.sort_values("fecha").copy()
        first_date = pd.to_datetime(history["fecha"]).min()
        current_date = pd.to_datetime(current_date)

        def _lag_value(lag: int) -> float:
            if len(history) >= lag:
                return float(history["count"].iloc[-lag])
            return float(history["count"].mean()) if not history.empty else 0.0

        recent = history["count"].tolist()
        recent_window_7 = recent[-7:] if recent else [0.0]
        recent_window_14 = recent[-14:] if recent else [0.0]

        return {
            "day_idx": float((current_date - first_date).days),
            "dayofweek": float(current_date.dayofweek),
            "month": float(current_date.month),
            "dayofmonth": float(current_date.day),
            "is_weekend": float(int(current_date.dayofweek >= 5)),
            "lag_1": _lag_value(1),
            "lag_7": _lag_value(7),
            "lag_14": _lag_value(14),
            "lag_28": _lag_value(28),
            "rolling_mean_7": float(np.mean(recent_window_7)),
            "rolling_mean_14": float(np.mean(recent_window_14)),
            "rolling_std_7": float(np.std(recent_window_7, ddof=0)) if len(recent_window_7) > 1 else 0.0,
        }

    def _build_inventory_recommendation(
        self,
        forecast_values: List[int],
        producto_info: Optional[Dict[str, Any]],
        lead_time_days: int,
    ) -> Dict[str, Any]:
        stock_actual = int(producto_info.get("stock", 0)) if producto_info else 0
        demanda_lead_time = int(sum(forecast_values[:lead_time_days]))
        desviacion = float(np.std(forecast_values, ddof=0))
        stock_seguridad = int(ceil(max(desviacion, 1.0) * sqrt(max(lead_time_days, 1))))
        punto_reorden = demanda_lead_time + stock_seguridad
        cantidad_sugerida_pedido = max(0, punto_reorden - stock_actual)

        if stock_actual < punto_reorden:
            accion = "REABASTECER"
        elif stock_actual > punto_reorden + max(5, stock_seguridad):
            accion = "SOBRESTOCK"
        else:
            accion = "OK"

        return {
            "stock_actual": stock_actual,
            "lead_time_days": lead_time_days,
            "demanda_estimada_lead_time": demanda_lead_time,
            "stock_seguridad": stock_seguridad,
            "punto_reorden": punto_reorden,
            "cantidad_sugerida_pedido": cantidad_sugerida_pedido,
            "accion": accion,
        }

    async def train_model(self, producto_id: str) -> Dict[str, Any]:
        """Entrena un modelo por producto usando rezagos y calendario, y lo guarda con joblib."""
        df = await self._build_timeseries(producto_id)
        if df.empty or df["count"].sum() < 1:
            return {"status": "error", "detail": "Datos insuficientes para entrenar"}

        prepared = self._prepare_training_frame(df)
        if len(prepared) < 2:
            return {"status": "error", "detail": "Datos insuficientes para entrenar un modelo"}

        feature_columns = self._feature_columns()
        X = prepared[feature_columns]
        y = prepared["count"]

        split_idx = max(int(len(prepared) * 0.8), 1)
        if split_idx >= len(prepared):
            split_idx = len(prepared) - 1
        X_train = X.iloc[:split_idx]
        y_train = y.iloc[:split_idx]
        X_test = X.iloc[split_idx:]
        y_test = y.iloc[split_idx:]

        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)

        metrics: Dict[str, Any] = {"samples": len(prepared)}
        if len(X_test) > 0:
            predictions = model.predict(X_test)
            errors = np.asarray(y_test) - np.asarray(predictions)
            mae = float(np.mean(np.abs(errors)))
            rmse = float(np.sqrt(np.mean(errors ** 2)))
            nonzero_mask = np.asarray(y_test) != 0
            if nonzero_mask.any():
                mape = float(np.mean(np.abs(errors[nonzero_mask] / np.asarray(y_test)[nonzero_mask])) * 100)
            else:
                mape = None
            metrics.update(
                {
                    "mae": round(mae, 4),
                    "rmse": round(rmse, 4),
                    "mape": round(mape, 4) if mape is not None else None,
                }
            )

        model_path = os.path.join(MODELS_DIR, f"model_{producto_id}.joblib")
        payload = {
            "model": model,
            "feature_columns": feature_columns,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "series_start": pd.to_datetime(df["fecha"]).min().isoformat(),
            "last_date": pd.to_datetime(df["fecha"]).max().isoformat(),
            "metrics": metrics,
        }
        joblib.dump(payload, model_path)

        return {"status": "ok", "model_path": model_path, "metrics": metrics}

    async def predict(self, producto_id: str, days: int = 7, lead_time_days: int = 7) -> Dict[str, Any]:
        model_path = os.path.join(MODELS_DIR, f"model_{producto_id}.joblib")
        if not os.path.exists(model_path):
            return {"status": "error", "detail": "Modelo no entrenado. Llama a /predict/train primero."}

        payload = joblib.load(model_path)
        model = payload["model"]
        feature_columns = payload.get("feature_columns", self._feature_columns())

        df = await self._build_timeseries(producto_id)
        if df.empty:
            return {"status": "error", "detail": "No hay datos para predecir"}

        history = self._prepare_training_frame(df)
        if history.empty:
            return {"status": "error", "detail": "No hay suficientes datos históricos para generar rezagos"}

        product_info = await self.producto_repo.get_by_id(producto_id)
        last_date = pd.to_datetime(df["fecha"]).max()

        predictions: List[int] = []
        forecast_rows: List[Dict[str, Any]] = []
        working_history = history[["fecha", "count", "day_idx"]].copy()

        for step in range(days):
            current_date = last_date + timedelta(days=step + 1)
            feature_row = self._make_feature_row(working_history, current_date)
            feature_frame = pd.DataFrame([feature_row])[feature_columns]
            predicted_value = float(model.predict(feature_frame)[0])
            predicted_int = int(round(max(0.0, predicted_value)))
            predictions.append(predicted_int)
            forecast_rows.append({"fecha": current_date.date().isoformat(), "prediccion": predicted_int})

            next_day_idx = int(working_history["day_idx"].iloc[-1]) + 1
            working_history = pd.concat(
                [
                    working_history,
                    pd.DataFrame(
                        {
                            "fecha": [current_date],
                            "count": [predicted_int],
                            "day_idx": [next_day_idx],
                        }
                    ),
                ],
                ignore_index=True,
            )

        recommendation = self._build_inventory_recommendation(predictions, product_info, lead_time_days)

        return {
            "status": "ok",
            "product_id": producto_id,
            "horizon_days": days,
            "lead_time_days": lead_time_days,
            "predictions": forecast_rows,
            "inventory_recommendation": recommendation,
            "model_metrics": payload.get("metrics", {}),
        }

    async def get_top_three_products(self) -> List[Dict[str, Any]]:
        """Obtiene los 3 productos más cotizados."""
        productos = await self.producto_repo.list()
        
        productos_con_conteo = []
        for producto in productos:
            nombre_producto = producto.get("nombre", "")
            conteo = await self.cotizacion_repo.contar_por_producto(nombre_producto)
            if conteo > 0:
                productos_con_conteo.append({
                    "id": producto.get("_id"),
                    "nombre": nombre_producto,
                    "conteo": conteo
                })
        
        # Ordenar por conteo descendente y tomar top 3
        productos_top = sorted(productos_con_conteo, key=lambda x: x["conteo"], reverse=True)[:3]
        return productos_top

    async def predict_top_three_with_auto_train(
        self,
        days: int = 7,
        lead_time_days: int = 7,
    ) -> Dict[str, Any]:
        """Entrena y predice en un solo flujo para los 3 productos más cotizados."""
        productos_top = await self.get_top_three_products()
        if not productos_top:
            return {
                "status": "error",
                "detail": "No hay productos cotizados suficientes para generar predicciones",
            }

        resultados: List[Dict[str, Any]] = []
        for producto in productos_top:
            producto_id = str(producto.get("id", ""))
            if not producto_id:
                resultados.append({
                    "producto": producto,
                    "training": {"status": "error", "detail": "Producto inválido"},
                    "prediction": {"status": "error", "detail": "No se pudo generar la predicción"},
                })
                continue

            entrenamiento = await self.train_model(producto_id)
            if entrenamiento.get("status") != "ok":
                resultados.append({
                    "producto": producto,
                    "training": entrenamiento,
                    "prediction": {"status": "error", "detail": "No se pudo generar la predicción"},
                })
                continue

            prediccion = await self.predict(producto_id, days=days, lead_time_days=lead_time_days)
            resultados.append({
                "producto": producto,
                "training": entrenamiento,
                "prediction": prediccion,
            })

        return {
            "status": "ok",
            "horizon_days": days,
            "lead_time_days": lead_time_days,
            "top_products": productos_top,
            "results": resultados,
        }

