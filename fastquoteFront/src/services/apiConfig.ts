const DEFAULT_API_URL = 'http://localhost:8000';
const DEFAULT_RAG_URL = 'http://localhost:8080';

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\/$/, '');
}

export const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL, DEFAULT_API_URL);
export const RAG_URL = normalizeBaseUrl(import.meta.env.VITE_RAG_URL, DEFAULT_RAG_URL);
