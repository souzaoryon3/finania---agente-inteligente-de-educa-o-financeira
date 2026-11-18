import { useEffect, useRef, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { ChatInput } from './components/ChatInput';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { FinanIALogo } from './components/FinanIALogo';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import type { ChatMessage, Conversation, FinancialAnalysis } from './types/chat';

const STORAGE_KEY = 'finania_conversations_v1';

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildConversationTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 44) return cleaned;
  return `${cleaned.slice(0, 44).trimEnd()}...`;
}

function loadSavedConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Conversation =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.messages)
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadSavedConversations()
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => {
      const saved = loadSavedConversations();
      return saved.length > 0 ? saved[0].id : null;
    }
  );
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignora erro caso armazenamento local esteja cheio ou bloqueado
    }
  }, [conversations]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages.length, streamingMessageId]);

  const handleNewConversation = () => {
    if (isLoading) {
      abortControllerRef.current?.abort();
      setIsLoading(false);
      setStreamingMessageId(null);
    }
    setActiveConversationId(null);
    setInputText('');
  };

  const handleSelectConversation = (id: string) => {
    if (isLoading) {
      abortControllerRef.current?.abort();
      setIsLoading(false);
      setStreamingMessageId(null);
    }
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    if (isLoading) {
      abortControllerRef.current?.abort();
      setIsLoading(false);
      setStreamingMessageId(null);
    }
    setConversations([]);
    setActiveConversationId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora erro de remoção
    }
  };

  const streamAssistantResponse = async (
    conversationId: string,
    historyPayload: Array<{ role: 'user' | 'assistant'; content: string }>,
    assistantMessageId: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setStreamingMessageId(assistantMessageId);

    const updateAssistantMessage = (
      updater: (msg: ChatMessage) => ChatMessage
    ) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            updatedAt: Date.now(),
            messages: conv.messages.map((msg) =>
              msg.id === assistantMessageId ? updater(msg) : msg
            ),
          };
        })
      );
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyPayload }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        let errorMessage =
          'Não foi possível obter resposta do FinanIA no momento. Tente novamente em instantes.';
        if (contentType.includes('application/json')) {
          const errorJson = (await response.json()) as { error?: string };
          if (errorJson?.error) errorMessage = errorJson.error;
        }
        updateAssistantMessage((msg) => ({
          ...msg,
          content: errorMessage,
          isError: true,
        }));
        return;
      }

      if (!response.body) {
        throw new Error('Fluxo de resposta indisponível.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const line = rawEvent
            .split('\n')
            .find((l) => l.startsWith('data: '));
          if (!line) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let parsed: {
            type?: string;
            text?: string;
            error?: string;
            analysis?: FinancialAnalysis;
          };
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (parsed.type === 'analysis' && parsed.analysis) {
            updateAssistantMessage((msg) => ({
              ...msg,
              analysis: parsed.analysis,
            }));
          } else if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
            accumulatedText += parsed.text;
            updateAssistantMessage((msg) => ({
              ...msg,
              content: accumulatedText,
              isError: false,
            }));
          } else if (parsed.type === 'error') {
            updateAssistantMessage((msg) => ({
              ...msg,
              content:
                parsed.error ||
                'Ocorreu uma falha durante a geração da resposta. Tente novamente.',
              isError: true,
            }));
            return;
          }
        }
      }

      if (!accumulatedText.trim()) {
        updateAssistantMessage((msg) => ({
          ...msg,
          content:
            'A resposta retornou vazia. Por favor, tente reformular ou reenviar sua pergunta.',
          isError: true,
        }));
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      updateAssistantMessage((msg) => ({
        ...msg,
        content:
          'Falha de conexão com o servidor do FinanIA. Verifique sua rede e tente novamente.',
        isError: true,
      }));
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const content = (overrideText ?? inputText).trim();
    if (!content || isLoading) return;

    if (!overrideText) {
      setInputText('');
    }

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
      createdAt: now,
    };
    const assistantMessageId = createId();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
    };

    let targetConversationId = activeConversationId;
    let historyForApi: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (!targetConversationId || !activeConversation) {
      const newConversation: Conversation = {
        id: createId(),
        title: buildConversationTitle(content),
        messages: [userMessage, assistantPlaceholder],
        createdAt: now,
        updatedAt: now,
      };
      targetConversationId = newConversation.id;
      historyForApi = [{ role: 'user', content }];

      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    } else {
      const priorValidMessages = activeConversation.messages
        .filter((m) => !m.isError && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      historyForApi = [...priorValidMessages, { role: 'user', content }];

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id !== targetConversationId) return conv;
          return {
            ...conv,
            updatedAt: now,
            messages: [...conv.messages, userMessage, assistantPlaceholder],
          };
        });
        return [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }

    await streamAssistantResponse(
      targetConversationId,
      historyForApi,
      assistantMessageId
    );
  };

  const handleRetryLastError = async (failedMessageId: string) => {
    if (!activeConversation || isLoading) return;

    const failedIndex = activeConversation.messages.findIndex(
      (m) => m.id === failedMessageId
    );
    if (failedIndex <= 0) return;

    const precedingMessages = activeConversation.messages
      .slice(0, failedIndex)
      .filter((m) => !m.isError && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    if (precedingMessages.length === 0) return;

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversation.id) return conv;
        return {
          ...conv,
          messages: conv.messages.map((m) =>
            m.id === failedMessageId
              ? { ...m, content: '', isError: false, analysis: null }
              : m
          ),
        };
      })
    );

    await streamAssistantResponse(
      activeConversation.id,
      precedingMessages,
      failedMessageId
    );
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#070D19] text-slate-100">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearHistory={handleClearHistory}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Barra superior limpa */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 border-b border-slate-800/80 bg-[#070D19]/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpenMobile(true)}
              aria-label="Abrir histórico de conversas"
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="lg:hidden">
              <FinanIALogo size="sm" showWordmark />
            </div>

            <div className="hidden lg:flex items-center gap-2.5 min-w-0">
              <span className="font-display text-sm font-semibold text-slate-200 truncate">
                {activeConversation
                  ? activeConversation.title
                  : 'Agente Inteligente de Educação Financeira'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeConversation && (
              <button
                type="button"
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E182C] hover:bg-[#14223D] border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Nova conversa</span>
              </button>
            )}
          </div>
        </header>

        {/* Área central do chat */}
        <main className="flex-1 overflow-y-auto">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <WelcomeScreen
              onSelectSuggestion={(prompt) => handleSendMessage(prompt)}
              disabled={isLoading}
            />
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
              {activeConversation.messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isLoading && streamingMessageId === msg.id}
                  onRetry={
                    msg.isError
                      ? () => handleRetryLastError(msg.id)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </main>

        {/* Campo de entrada fixado na parte inferior + Rodapé */}
        <footer className="shrink-0 border-t border-slate-800/80 bg-[#070D19]/95 px-4 sm:px-6 pt-3 pb-3">
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={() => handleSendMessage()}
            isLoading={isLoading}
          />
          <div className="w-full max-w-3xl mx-auto mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-400/85 text-center sm:text-left">
            <span>
              FinanIA — Projeto acadêmico de Inteligência Artificial | Fatec Cotia — 2026
            </span>
            <span className="text-slate-500">
              Finalidade educativa · Não substitui aconselhamento profissional.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
