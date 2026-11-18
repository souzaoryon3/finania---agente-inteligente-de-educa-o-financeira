import {
  ArrowUpRight,
  PieChart,
  PiggyBank,
  ShieldAlert,
  TrendingUp,
  Umbrella,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { SuggestionItem } from '../types/chat';
import { FinanIALogo } from './FinanIALogo';

interface WelcomeScreenProps {
  onSelectSuggestion: (prompt: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'budget',
    title: 'Organizar meu orçamento.',
    subtitle: 'Estruture receitas e contas mensais com clareza',
    prompt:
      'Quero organizar meu orçamento mensal do zero. Como devo dividir minha renda entre gastos essenciais, objetivos e lazer?',
    iconName: 'wallet',
  },
  {
    id: 'expenses',
    title: 'Analisar meus gastos.',
    subtitle: 'Identifique onde o dinheiro pesa mais no mês',
    prompt:
      'Recebo R$ 3.500 por mês e gasto R$ 1.200 com moradia, R$ 800 com alimentação, R$ 500 com transporte e R$ 600 com outras despesas. Como posso melhorar meu orçamento?',
    iconName: 'pie-chart',
  },
  {
    id: 'save',
    title: 'Economizar dinheiro.',
    subtitle: 'Estratégias práticas para aumentar sua sobra mensal',
    prompt:
      'Quais estratégias práticas e realistas posso aplicar no dia a dia para economizar dinheiro sem comprometer minha qualidade de vida?',
    iconName: 'piggy-bank',
  },
  {
    id: 'invest',
    title: 'Aprender sobre investimentos.',
    subtitle: 'Entenda renda fixa, liquidez e juros compostos',
    prompt:
      'Estou começando a estudar investimentos no Brasil. Pode me explicar de forma didática a diferença entre Poupança, CDB e Tesouro Direto?',
    iconName: 'trending-up',
  },
  {
    id: 'debts',
    title: 'Sair das dívidas.',
    subtitle: 'Priorize juros altos e negocie com método',
    prompt:
      'Tenho dívidas no cartão de crédito e parcelas acumuladas. Como montar um plano eficiente para sair das dívidas?',
    iconName: 'shield-alert',
  },
  {
    id: 'emergency',
    title: 'Criar uma reserva de emergência.',
    subtitle: 'Calcule quanto guardar e onde manter acessível',
    prompt:
      'Como calcular o valor ideal da minha reserva de emergência e quais critérios devo observar para escolher onde deixá-la?',
    iconName: 'umbrella',
  },
];

function renderSuggestionIcon(name: SuggestionItem['iconName']) {
  const iconClass = 'w-4 h-4 text-emerald-400 shrink-0';
  switch (name) {
    case 'wallet':
      return <Wallet className={iconClass} />;
    case 'pie-chart':
      return <PieChart className={iconClass} />;
    case 'piggy-bank':
      return <PiggyBank className={iconClass} />;
    case 'trending-up':
      return <TrendingUp className={iconClass} />;
    case 'shield-alert':
      return <ShieldAlert className={iconClass} />;
    case 'umbrella':
      return <Umbrella className={iconClass} />;
  }
}

export function WelcomeScreen({
  onSelectSuggestion,
  disabled = false,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex justify-center mb-5">
            <FinanIALogo size="lg" showWordmark={false} />
          </div>

          <h1
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50 mx-auto max-w-xl"
            style={{ textWrap: 'balance' }}
          >
            Como posso ajudar suas finanças hoje?
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300/90 max-w-lg mx-auto leading-relaxed">
            Tome decisões mais conscientes com seu assistente financeiro inteligente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SUGGESTIONS.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              disabled={disabled}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.035,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group text-left rounded-2xl bg-[#0D1628] hover:bg-[#121E36] border border-slate-800/90 hover:border-emerald-500/40 p-4 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  {renderSuggestionIcon(item.iconName)}
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <div className="font-display text-sm font-semibold text-slate-100 group-hover:text-white leading-snug">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-slate-400 leading-relaxed">
                {item.subtitle}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onSelectSuggestion(
                'Recebo R$ 3.500 por mês e gasto R$ 1.200 com moradia, R$ 800 com alimentação, R$ 500 com transporte e R$ 600 com outras despesas. Como posso melhorar meu orçamento?'
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D1628] hover:bg-[#121E36] border border-slate-800 hover:border-emerald-500/35 text-xs font-medium text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>Simular análise com exemplo: R$ 3.500 de renda e R$ 3.100 em gastos</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
