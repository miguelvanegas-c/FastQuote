-- ============================================================
--  RAG Híbrido – Supabase Migration
--  Si ya corriste la versión anterior, ejecuta solo las
--  secciones marcadas con "NUEVO" y el RPC match_chunks_fts
-- ============================================================

-- 1. Extensiones necesarias
create extension if not exists vector;
create extension if not exists unaccent;   -- NUEVO: normaliza acentos en FTS

-- 2. Tabla: documents
create table if not exists documents (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    size_bytes  bigint,
    page_count  integer,
    created_at  timestamptz default now()
);

-- 3. Tabla: chunks (con columna FTS)
create table if not exists chunks (
    id           uuid primary key default gen_random_uuid(),
    document_id  uuid references documents(id) on delete cascade,
    content      text not null,
    page_number  integer,
    chunk_index  integer,
    embedding    vector(768),
    fts          tsvector generated always as (
                     to_tsvector('spanish', unaccent(content))
                 ) stored,
    created_at   timestamptz default now()
);

-- NOTA: si la tabla ya existe y solo quieres agregar FTS:
-- alter table chunks add column if not exists fts tsvector
--     generated always as (to_tsvector('spanish', unaccent(content))) stored;

-- 4. Indice vectorial (cosine similarity)
create index if not exists chunks_embedding_idx
    on chunks
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- 5. NUEVO: Indice GIN para busqueda de texto completo
create index if not exists chunks_fts_idx
    on chunks
    using gin(fts);

-- 6. RPC busqueda vectorial (se mantiene sin cambios)
create or replace function match_chunks(
    query_embedding vector(768),
    match_count     int     default 5,
    filter_doc_id   uuid    default null
)
returns table (
    id          uuid,
    document_id uuid,
    content     text,
    page_number integer,
    chunk_index integer,
    similarity  float
)
language sql stable
as $$
    select
        c.id,
        c.document_id,
        c.content,
        c.page_number,
        c.chunk_index,
        1 - (c.embedding <=> query_embedding) as similarity
    from chunks c
    where
        (filter_doc_id is null or c.document_id = filter_doc_id)
        and c.embedding is not null
    order by c.embedding <=> query_embedding
    limit match_count;
$$;

-- 7. NUEVO: RPC busqueda lexica (FTS)
create or replace function match_chunks_fts(
    query_text    text,
    match_count   int  default 20,
    filter_doc_id uuid default null
)
returns table (
    id          uuid,
    document_id uuid,
    content     text,
    page_number integer,
    chunk_index integer,
    rank        float
)
language sql stable
as $$
    select
        c.id,
        c.document_id,
        c.content,
        c.page_number,
        c.chunk_index,
        ts_rank_cd(c.fts, query, 32)::float as rank
    from
        chunks c,
        to_tsquery('spanish', unaccent(
            regexp_replace(trim(query_text), '\s+', ' | ', 'g')
        )) query
    where
        (filter_doc_id is null or c.document_id = filter_doc_id)
        and c.fts @@ query
    order by rank desc
    limit match_count;
$$;
