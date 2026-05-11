import axios from 'axios';
import { RAG_URL } from './apiConfig';

export interface RagQueryRequest {
  question: string;
}

export interface RagSource {
  document_id: string;
  content: string;
  page_number: number;
  similarity: number;
  rrf_score: number;
  vector_rank: number;
  lexical_rank: number;
}

export interface RagQueryResponse {
  answer: string;
  sources: RagSource[];
  retrieval_mode: string;
}

export const ragService = {
  query: async (payload: RagQueryRequest): Promise<RagQueryResponse> => {
    const response = await axios.post(`${RAG_URL}/api/query`, payload);
    return response.data;
  },
};
