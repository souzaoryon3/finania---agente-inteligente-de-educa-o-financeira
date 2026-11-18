import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Loader2, SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim().length > 0) {
        onSend();
      }
    }
  };

  const canSend = !isLoading && value.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="relative flex items-end gap-2 rounded-2xl bg-[#0E182C] border border-slate-700/80 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/15 px-3.5 py-2.5 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Pergunte sobre orçamento, dívidas, investimentos ou informe suas receitas e gastos..."
          aria-label="Digite sua mensagem para o FinanIA"
          className="flex-1 resize-none bg-transparent text-sm sm:text-[15px] text-slate-100 placeholder:text-slate-400 focus:outline-none py-1.5 max-h-40 leading-relaxed disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={isLoading ? 'Gerando resposta' : 'Enviar mensagem'}
          className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed min-w-[44px] min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline whitespace-nowrap">Enviar</span>
              <SendHorizontal className="w-4 h-4 shrink-0" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
