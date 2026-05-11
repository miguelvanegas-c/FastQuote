import React, { useState } from 'react';
import { DashboardShell, type DashboardSection } from '../components/DashboardShell';
import { ragService } from '../services/ragService';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

function formatInlineText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function formatAssistantContent(content: string) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const isBullet = line.startsWith('* ');
    const cleanedLine = isBullet ? line.slice(2).trim() : line;
    const isSection = cleanedLine.endsWith(':') && cleanedLine.includes('**');

    if (isSection) {
      return (
        <div key={`${line}-${index}`} className="mt-4 first:mt-0">
          <p className="text-sm font-semibold text-slate-900">{formatInlineText(cleanedLine)}</p>
        </div>
      );
    }

    if (isBullet) {
      return (
        <div key={`${line}-${index}`} className="flex gap-2 pl-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <p className="text-sm leading-6 text-slate-700">{formatInlineText(cleanedLine)}</p>
        </div>
      );
    }

    return (
      <p key={`${line}-${index}`} className="text-sm leading-6 text-slate-700">
        {formatInlineText(cleanedLine)}
      </p>
    );
  });
}

interface ChatPageProps {
  onNavigate: (section: DashboardSection) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigate }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Escribe una pregunta antes de consultar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ragService.query({
        question: trimmedQuestion,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        { id: Date.now(), role: 'user', content: trimmedQuestion },
        { id: Date.now() + 1, role: 'assistant', content: result.answer },
      ]);
      setQuestion('');
    } catch {
      setError('No se pudo consultar el RAG. Verifica que el backend en localhost:8080 esté activo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  return (
    <DashboardShell
      activeSection="chat"
      onNavigate={onNavigate}
      title="Chat"
      subtitle="Consulta el RAG con preguntas en lenguaje natural"
    >
      <section className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Pregunta lo que necesites acerca del inventario.
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    {message.role === 'assistant' ? formatAssistantContent(message.content) : message.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700 shadow-sm">Consultando...</div>
            </div>
          )}

          {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Escribe tu pregunta..."
              className="min-h-[84px] flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="min-h-[84px] rounded-3xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
};
