import { useState, type ReactNode } from 'react';
import { AlertCircle, Check, Copy, RotateCcw, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';
import type { ChatMessage } from '../types/chat';
import { FinanIALogo } from './FinanIALogo';
import { FinancialSummaryCard } from './FinancialSummaryCard';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRetry?: () => void;
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatMessageBubble({
  message,
  isStreaming = false,
  onRetry,
}: ChatMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso caso clipboard não esteja disponível
    }
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end gap-3"
      >
        <div className="max-w-[88%] sm:max-w-[78%] flex flex-col items-end">
          <div className="rounded-2xl rounded-tr-sm bg-[#162542] border border-slate-700/70 px-4 py-3 text-sm sm:text-[15px] text-slate-100 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          <span className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            Você · {formatMessageTime(message.createdAt)}
          </span>
        </div>
        <div
          className="w-8 h-8 rounded-xl bg-[#131F38] border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <User className="w-4 h-4 text-slate-300" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
    >
      <div className="mt-0.5 shrink-0">
        <FinanIALogo size="sm" showWordmark={false} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-display font-semibold text-slate-200">
              FinanIA
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>

          {!isStreaming && !message.isError && message.content.trim().length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar resposta da inteligência artificial"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-300 hover:bg-slate-800/70 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          )}
        </div>

        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-4 sm:px-5 sm:py-4 border ${
            message.isError
              ? 'bg-rose-950/30 border-rose-500/35 text-rose-200'
              : 'bg-[#0D1628] border-slate-800/90 text-slate-200'
          }`}
        >
          {message.analysis && <FinancialSummaryCard analysis={message.analysis} />}

          {message.isError ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-sm leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{message.content}</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
              )}
            </div>
          ) : message.content ? (
            <div className="finania-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }: { children?: ReactNode }) => (
                    <div className="table-wrapper">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span
                  className="inline-block w-2 h-4 ml-1 align-middle bg-emerald-400 animate-pulse rounded-xs"
                  aria-hidden="true"
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <div className="flex items-center gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.25s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.12s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
              </div>
              <span>Analisando seus dados financeiros...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
