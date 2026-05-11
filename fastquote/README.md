# FastQuote API

API FastAPI con CRUD de productos en MongoDB.

## Estructura

- `main.py`: punto de entrada
- `src/routes`: endpoints HTTP
- `src/services`: lógica de negocio
- `src/repositories`: acceso a MongoDB
- `src/schemas`: validación de datos
- `src/utils`: helpers y conexión

## Variables de entorno

Crea un archivo `.env` con:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=fastquote
```

## Ejecutar

```powershell
pip install -r requirements.txt
uvicorn main:app --reload
```

## Endpoints

- `POST /productos`
- `GET /productos`
- `GET /productos/{producto_id}`
- `PUT /productos/{producto_id}`
- `PATCH /productos/{producto_id}`
- `DELETE /productos/{producto_id}`
- `POST /predict/train/{producto_id}` - Entrena modelo para un producto específico
- `GET /predict/predict/{producto_id}` - Predice para un producto (requiere modelo entrenado)
- `POST /predict/top-three` - Auto-entrena y predice los 3 productos más cotizados en un solo flujo

