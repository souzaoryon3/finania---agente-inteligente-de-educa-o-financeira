import { useState } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import type { Conversation } from '../types/chat';
import { FinanIALogo } from './FinanIALogo';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearHistory: () => void;
}

function formatConversationDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function Sidebar({
  conversations,
  activeConversationId,
  isOpenMobile,
  onCloseMobile,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onClearHistory,
}: SidebarProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleConfirmClear = () => {
    onClearHistory();
    setConfirmClear(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0A1120] border-r border-slate-800/80 text-slate-200 w-[280px] select-none">
      {/* Cabeçalho lateral com logotipo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/70 shrink-0">
        <FinanIALogo size="md" showWordmark />
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu lateral"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Botão de nova conversa */}
      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewConversation();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1120]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Nova conversa</span>
        </button>
      </div>

      {/* Lista de histórico de conversas */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="px-2 pb-2 text-xs font-medium text-slate-400">
          Histórico de conversas
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center rounded-xl border border-dashed border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            Suas conversas aparecerão aqui e ficarão salvas neste navegador.
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const messageCount = conv.messages.length;

              return (
                <li key={conv.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 pr-10 rounded-xl transition-colors cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isActive
                        ? 'bg-[#121E36] text-slate-50 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#111B2E]/80 hover:text-slate-100 border border-transparent'
                    }`}
                  >
                    <MessageSquare
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {conv.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="tabular-nums">
                          {messageCount}{' '}
                          {messageCount === 1 ? 'mensagem' : 'mensagens'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatConversationDate(conv.updatedAt)}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    aria-label={`Excluir conversa: ${conv.title}`}
                    title="Excluir conversa"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Ação de limpar histórico */}
      <div className="p-3 border-t border-slate-800/70 shrink-0">
        {conversations.length > 0 ? (
          confirmClear ? (
            <div className="p-2.5 rounded-xl bg-[#111B2E] border border-rose-500/30 space-y-2">
              <p className="text-xs text-slate-300">
                Apagar todas as conversas salvas?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Limpar histórico</span>
            </button>
          )
        ) : (
          <div className="px-2 py-1.5 text-[11px] text-slate-500 text-center">
            Armazenamento local ativo
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar fixa para desktop */}
      <aside className="hidden lg:block shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Drawer lateral para dispositivos móveis */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
