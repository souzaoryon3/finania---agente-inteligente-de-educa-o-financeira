import { AlertTriangle, CheckCircle2, Info, Scale } from 'lucide-react';
import type { FinancialAnalysis } from '../types/chat';
import { formatBRL, formatPercent } from '../utils/financeCalculator';

interface FinancialSummaryCardProps {
  analysis: FinancialAnalysis;
}

const CATEGORY_COLORS = [
  'bg-emerald-500',
  'bg-sky-400',
  'bg-amber-400',
  'bg-indigo-400',
  'bg-slate-400',
];

const DOT_COLORS = [
  'bg-emerald-500',
  'bg-sky-400',
  'bg-amber-400',
  'bg-indigo-400',
  'bg-slate-400',
];

export function FinancialSummaryCard({ analysis }: FinancialSummaryCardProps) {
  const hasIncome = analysis.totalIncome > 0;
  const isDeficit = hasIncome && analysis.balance < 0;
  const isTight = analysis.status === 'tight';

  const statusMeta = isDeficit
    ? {
        label: 'Déficit no orçamento',
        textClass: 'text-rose-300',
        Icon: AlertTriangle,
      }
    : isTight
      ? {
          label: 'Margem reduzida',
          textClass: 'text-amber-300',
          Icon: Scale,
        }
      : analysis.status === 'expenses_only'
        ? {
            label: 'Levantamento de despesas',
            textClass: 'text-slate-300',
            Icon: Info,
          }
        : {
            label: 'Saldo positivo',
            textClass: 'text-emerald-300',
            Icon: CheckCircle2,
          };

  const StatusIcon = statusMeta.Icon;

  return (
    <section
      aria-label="Resumo financeiro validado"
      className="mb-4 rounded-xl bg-[#0B1324] border border-slate-800/90 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <span className="text-xs font-medium text-slate-400">
          Cálculo validado automaticamente
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.textClass}`}
        >
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMeta.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
        <div>
          <div className="text-xs text-slate-400">Receita</div>
          <div className="mt-0.5 font-mono tabular-nums text-sm sm:text-base font-semibold text-slate-100">
            {hasIncome ? formatBRL(analysis.totalIncome) : 'Não informada'}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Despesas totais</div>
          <div className="mt-0.5 font-mono tabular-nums text-sm sm:text-base font-semibold text-slate-100">
            {formatBRL(analysis.totalExpenses)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Saldo disponível</div>
          <div
            className={`mt-0.5 font-mono tabular-nums text-sm sm:text-base font-semibold ${
              !hasIncome
                ? 'text-slate-400'
                : analysis.balance < 0
                  ? 'text-rose-400'
                  : 'text-emerald-400'
            }`}
          >
            {hasIncome ? formatBRL(analysis.balance) : '—'}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">
            {hasIncome ? 'Comprometido' : 'Maior gasto'}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-sm sm:text-base font-semibold text-slate-100 truncate">
            {hasIncome && analysis.expenseRatioPercent !== null
              ? formatPercent(analysis.expenseRatioPercent)
              : analysis.highestExpenseCategory
                ? analysis.highestExpenseCategory.name
                : '—'}
          </div>
        </div>
      </div>

      {analysis.categories.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/70">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Distribuição dos gastos</span>
            {analysis.highestExpenseCategory && (
              <span>
                Maior peso:{' '}
                <strong className="font-medium text-slate-200">
                  {analysis.highestExpenseCategory.name}
                </strong>{' '}
                ({formatPercent(analysis.highestExpenseCategory.percentOfExpenses)})
              </span>
            )}
          </div>

          <div
            className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex gap-0.5"
            role="img"
            aria-label="Proporção de gastos por categoria"
          >
            {analysis.categories.map((cat, idx) => (
              <div
                key={cat.name}
                style={{ width: `${Math.max(cat.percentOfExpenses, 2)}%` }}
                className={`${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} h-full transition-all duration-200`}
                title={`${cat.name}: ${formatBRL(cat.amount)} (${formatPercent(cat.percentOfExpenses)})`}
              />
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300">
            {analysis.categories.map((cat, idx) => (
              <div key={cat.name} className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${DOT_COLORS[idx % DOT_COLORS.length]} shrink-0`}
                  aria-hidden="true"
                />
                <span className="text-slate-300">{cat.name}</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {formatBRL(cat.amount)} · {formatPercent(cat.percentOfExpenses)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
