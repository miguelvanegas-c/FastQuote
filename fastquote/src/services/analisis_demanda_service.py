from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from src.repositories.cotizacion_repository import CotizacionRepository
from src.repositories.producto_repository import ProductoRepository


class AnalisiserDemandaService:
    """Servicio para analizar demanda basado en cotizaciones y sugerir inventario óptimo."""

    def __init__(self, cotizacion_repo: CotizacionRepository, producto_repo: ProductoRepository):
        self.cotizacion_repo = cotizacion_repo
        self.producto_repo = producto_repo

    async def analizar_demanda_por_producto(self) -> Dict[str, Any]:
        """Analiza qué productos se piden más en las cotizaciones."""
        cotizaciones = await self.cotizacion_repo.obtener_todas()

        if not cotizaciones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay cotizaciones para analizar",
            )

        # Contar productos solicitados
        contador_productos: Dict[str, int] = {}
        contador_tallas: Dict[str, Dict[int, int]] = {}

        for cotizacion in cotizaciones:
            productos = cotizacion.get("productos", [])
            for producto in productos:
                nombre = producto.get("nombre", "").lower()
                talla = producto.get("talla", 0)

                contador_productos[nombre] = contador_productos.get(nombre, 0) + 1

                if nombre not in contador_tallas:
                    contador_tallas[nombre] = {}
                contador_tallas[nombre][talla] = contador_tallas[nombre].get(talla, 0) + 1

        # Ordenar por cantidad de solicitudes
        productos_ordenados = sorted(
            contador_productos.items(), key=lambda x: x[1], reverse=True
        )

        resultado = []
        for nombre_producto, cantidad_solicitudes in productos_ordenados:
            tallas_info = contador_tallas.get(nombre_producto, {})
            resultado.append({
                "nombre": nombre_producto,
                "total_cotizaciones_solicitadas": cantidad_solicitudes,
                "tallas_demandadas": tallas_info,
                "talla_mas_popular": max(tallas_info, key=tallas_info.get) if tallas_info else None,
            })

        return {
            "total_cotizaciones": len(cotizaciones),
            "productos_unicos_solicitados": len(contador_productos),
            "demanda_por_producto": resultado,
        }

    async def sugerir_niveles_stock(self, porcentaje_seguridad: int = 20) -> Dict[str, Any]:
        """Sugiere niveles óptimos de stock basado en demanda."""
        demanda = await self.analizar_demanda_por_producto()
        demanda_info = demanda.get("demanda_por_producto", [])

        sugerencias = []

        for item in demanda_info:
            nombre_producto = item["nombre"]
            cantidad_solicitada = item["total_cotizaciones_solicitadas"]

            # Calcular stock sugerido: cantidad solicitada + % de seguridad
            stock_sugerido = int(cantidad_solicitada * (1 + porcentaje_seguridad / 100))

            # Obtener producto actual de inventario
            productos_actuales = await self.producto_repo.list()
            producto_actual = next(
                (p for p in productos_actuales if p.get("nombre", "").lower() == nombre_producto),
                None,
            )

            if producto_actual:
                stock_actual = producto_actual.get("stock", 0)
                diferencia = stock_sugerido - stock_actual

                sugerencias.append({
                    "nombre": nombre_producto,
                    "stock_actual": stock_actual,
                    "stock_sugerido": stock_sugerido,
                    "diferencia": diferencia,
                    "accion": (
                        "REABASTECER" if diferencia > 0
                        else "SOBRESTOCK" if diferencia < -5
                        else "OK"
                    ),
                    "demanda_cotizaciones": cantidad_solicitada,
                    "talla_mas_popular": item["talla_mas_popular"],
                })

        return {
            "porcentaje_seguridad": porcentaje_seguridad,
            "sugerencias": sorted(sugerencias, key=lambda x: x["diferencia"], reverse=True),
            "total_productos": len(sugerencias),
        }

    async def predecir_rotacion_inventario(self) -> Dict[str, Any]:
        """Predice cuáles productos se van a agotar pronto."""
        demanda = await self.analizar_demanda_por_producto()
        demanda_info = demanda.get("demanda_por_producto", [])

        productos_actuales = await self.producto_repo.list()

        rotacion = []

        for item in demanda_info[:10]:  # Top 10 productos más solicitados
            nombre_producto = item["nombre"]
            cantidad_solicitada = item["total_cotizaciones_solicitadas"]

            producto_actual = next(
                (p for p in productos_actuales if p.get("nombre", "").lower() == nombre_producto),
                None,
            )

            if producto_actual:
                stock_actual = producto_actual.get("stock", 0)

                # Estimar "días hasta agotarse" asumiendo 5 ventas/semana por cotización
                velocidad_venta = cantidad_solicitada * 0.2  # 20% de cotizaciones se convierten en ventas
                if velocidad_venta > 0:
                    dias_hasta_agotarse = int(stock_actual / max(velocidad_venta, 1) * 7)
                else:
                    dias_hasta_agotarse = 999

                criticidad = (
                    "CRÍTICO" if dias_hasta_agotarse < 7
                    else "ALTO" if dias_hasta_agotarse < 14
                    else "MEDIO" if dias_hasta_agotarse < 30
                    else "BAJO"
                )

                rotacion.append({
                    "nombre": nombre_producto,
                    "stock_actual": stock_actual,
                    "demanda_cotizaciones": cantidad_solicitada,
                    "dias_hasta_agotarse": dias_hasta_agotarse,
                    "criticidad": criticidad,
                    "talla_popular": item.get("talla_mas_popular"),
                })

        return {
            "productos_analizados": len(rotacion),
            "rotacion_inventario": rotacion,
            "reabastecer_urgente": [p for p in rotacion if p["criticidad"] in ["CRÍTICO", "ALTO"]],
        }

    async def estadisticas_cotizaciones(self) -> Dict[str, Any]:
        """Obtiene estadísticas generales de cotizaciones."""
        total_cotizaciones = await self.cotizacion_repo.contar_cotizaciones()
        cotizaciones_recientes = await self.cotizacion_repo.obtener_recientes(limite=100)

        # Agrupar por correo
        correos: Dict[str, int] = {}
        for cot in cotizaciones_recientes:
            correo = cot.get("correo", "desconocido")
            correos[correo] = correos.get(correo, 0) + 1

        cliente_mas_activo = max(correos.items(), key=lambda x: x[1]) if correos else None

        return {
            "total_cotizaciones": total_cotizaciones,
            "clientes_unicos": len(correos),
            "cliente_mas_activo": cliente_mas_activo[0] if cliente_mas_activo else None,
            "cotizaciones_cliente_top": cliente_mas_activo[1] if cliente_mas_activo else 0,
            "top_clientes": sorted(correos.items(), key=lambda x: x[1], reverse=True)[:5],
        }

