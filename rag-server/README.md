# RAG Server

Servidor RAG (Retrieval-Augmented Generation) construido con **FastAPI**, **Supabase pgvector** y **Google Gemini**.

## Stack

| Capa | Tecnología |
|---|---|
| API | FastAPI + Uvicorn |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Embeddings | `text-embedding-004` (768 dims, gratuito) |
| Generación | `gemini-1.5-flash-8b` (el más económico de Gemini) |
| Extracción PDF | pdfplumber |
| Chunking | LangChain RecursiveCharacterTextSplitter |

---

## Configuración paso a paso

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el contenido de `scripts/supabase_migration.sql`.  
   Esto crea las tablas `documents` y `chunks`, el índice IVFFlat y la función RPC `match_chunks`.
3. Copia tu **Project URL** y tu **service_role key** (Settings → API).

### 2. Google Gemini

1. Obtén una API key en [aistudio.google.com](https://aistudio.google.com/app/apikey).
2. El modelo de embeddings (`text-embedding-004`) y el generativo (`gemini-1.5-flash-8b`) son gratuitos dentro de los límites del plan gratuito.

### 3. Variables de entorno

Edita el archivo `.env` con tus credenciales:

```env
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Instalación y ejecución

```bash
# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor (con hot-reload)
python server.py
```

El servidor queda disponible en `http://localhost:8000`.  
Documentación interactiva: `http://localhost:8000/docs`

---

## API Reference

### `POST /api/documents/upload`
Sube e indexa un PDF.

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@mi_documento.pdf"
```

**Respuesta:**
```json
{
  "document": { "id": "uuid", "name": "mi_documento.pdf", ... },
  "chunks_indexed": 42,
  "message": "Successfully indexed 42 chunks from 10 pages."
}
```

---

### `GET /api/documents`
Lista todos los documentos indexados.

```bash
curl http://localhost:8000/api/documents
```

---

### `DELETE /api/documents/{document_id}`
Elimina un documento y todos sus chunks.

```bash
curl -X DELETE http://localhost:8000/api/documents/uuid-aqui
```

---

### `POST /api/query`
Hace una pregunta sobre los documentos.

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuáles son los requisitos del proyecto?",
    "top_k": 5
  }'
```

**Opcional:** limitar la búsqueda a un documento específico:
```json
{
  "question": "¿Cuáles son los requisitos?",
  "document_id": "uuid-del-documento",
  "top_k": 5
}
```

**Respuesta:**
```json
{
  "answer": "Según la página 3, los requisitos son...",
  "sources": [
    {
      "document_id": "uuid",
      "content": "fragmento relevante...",
      "page_number": 3,
      "similarity": 0.89
    }
  ]
}
```

---

### `GET /api/health`
Health check.

---

## Arquitectura del flujo

```
[Cliente Web]
     │
     ├─ POST /api/documents/upload
     │       │
     │       ├─ pdfplumber → extrae texto por página
     │       ├─ RecursiveCharacterTextSplitter → chunks de ~800 chars
     │       ├─ Gemini text-embedding-004 → vectores 768d
     │       └─ Supabase → guarda documento + chunks con embeddings
     │
     └─ POST /api/query
             │
             ├─ Gemini text-embedding-004 → embede la pregunta
             ├─ Supabase match_chunks RPC → top-k chunks más similares
             └─ Gemini gemini-1.5-flash-8b → genera respuesta contextualizada
```

## Consumo desde cliente web (ejemplo fetch)

```javascript
// Subir PDF
const formData = new FormData();
formData.append('file', pdfFile);
const res = await fetch('http://localhost:8000/api/documents/upload', {
  method: 'POST',
  body: formData,
});
const { document, chunks_indexed } = await res.json();

// Consultar
const res = await fetch('http://localhost:8000/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: '¿De qué trata el documento?' }),
});
const { answer, sources } = await res.json();
```
