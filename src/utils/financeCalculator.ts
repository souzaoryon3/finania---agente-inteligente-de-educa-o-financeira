import type {
  FinancialAnalysis,
  FinancialCategory,
  FinancialHealthStatus,
} from '../types/chat.ts';

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function parseBRLNumber(rawInput: string): number | null {
  if (!rawInput) return null;
  let cleaned = rawInput
    .replace(/R\$/gi, '')
    .trim()
    .toLowerCase();

  let multiplier = 1;
  if (/(?:\bmil\b|k$)/.test(cleaned)) {
    multiplier = 1000;
    cleaned = cleaned.replace(/(?:\bmil\b|k$)/g, '').trim();
  }

  cleaned = cleaned.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  // Formato brasileiro: 1.200,50 ou 3.500
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[1] && parts[1].length === 3 && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  } else if (cleaned.includes('.')) {
    const dotParts = cleaned.split('.');
    // Em pt-BR, "3.500" ou "1.200.000" representa separador de milhar
    const allThreeDigitsAfterFirst = dotParts
      .slice(1)
      .every((part) => part.length === 3);
    if (allThreeDigitsAfterFirst) {
      cleaned = dotParts.join('');
    }
  }

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return roundCurrency(parsed * multiplier);
}

function capitalizeCategory(raw: string): string {
  const trimmed = raw
    .replace(/^(?:o|a|os|as|um|uma|uns|umas)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed) return 'Outras despesas';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

interface TextSpan {
  start: number;
  end: number;
}

function overlapsAnySpan(start: number, end: number, spans: TextSpan[]): boolean {
  return spans.some((span) => start < span.end && end > span.start);
}

const NON_CATEGORY_WORDS = new Set([
  'mês',
  'mes',
  'meses',
  'ano',
  'anos',
  'semana',
  'semanas',
  'dia',
  'dias',
  'renda',
  'salário',
  'salario',
  'receita',
  'receitas',
  'faturamento',
  'salário líquido',
  'salario liquido',
  'juros',
  'retorno',
  'rendimento',
]);

export function analyzeFinancialText(text: string): FinancialAnalysis | null {
  if (!text || text.trim().length < 4) return null;

  const usedSpans: TextSpan[] = [];
  let totalIncome = 0;

  // 1. Detectar receitas explícitas (ex: "Recebo R$ 3.500 por mês", "Salário de 4.200", "Renda: R$ 5 mil")
  const incomeBeforeAmountRegex =
    /(?:recebo|ganho|meu\s+sal[aá]rio\s+(?:[ée]\s+de|[ée]|l[ií]quido\s+de)?|sal[aá]rio(?:\s+l[ií]quido)?|renda(?:\s+mensal|\s+familiar|\s+l[ií]quida)?|faturamento|entra(?:m)?|receita(?:\s+mensal)?)\s*(?:de|[:=]|é\s+de|fica\s+em|soma)?\s*(R?\$\s*[\d.,]+(?:\s*(?:mil|k))?|\b\d[\d.,]*(?:\s*(?:mil|k))?)/gi;

  for (const match of text.matchAll(incomeBeforeAmountRegex)) {
    const fullMatch = match[0];
    const amountRaw = match[1];
    const start = match.index ?? 0;
    const end = start + fullMatch.length;

    // Ignorar se seguido de %
    const nextChar = text.slice(end, end + 2).trim();
    if (nextChar.startsWith('%')) continue;

    const val = parseBRLNumber(amountRaw);
    if (val !== null && val >= 50) {
      totalIncome = roundCurrency(totalIncome + val);
      const amountOffset = fullMatch.lastIndexOf(amountRaw);
      usedSpans.push({
        start: start + Math.max(0, amountOffset),
        end,
      });
    }
  }

  // Padrão invertido: "R$ 3.500 de salário / renda"
  const amountBeforeIncomeRegex =
    /(R?\$\s*[\d.,]+(?:\s*(?:mil|k))?)\s+(?:de\s+)?(?:sal[aá]rio|renda(?:\s+mensal)?|receita|faturamento)/gi;

  for (const match of text.matchAll(amountBeforeIncomeRegex)) {
    const fullMatch = match[0];
    const amountRaw = match[1];
    const start = match.index ?? 0;
    const end = start + fullMatch.length;
    if (overlapsAnySpan(start, end, usedSpans)) continue;

    const val = parseBRLNumber(amountRaw);
    if (val !== null && val >= 50) {
      totalIncome = roundCurrency(totalIncome + val);
      usedSpans.push({ start, end: start + amountRaw.length });
    }
  }

  // 2. Detectar despesas categorizadas
  const categoryMap = new Map<string, number>();

  // Padrão A: "R$ 1.200 com moradia", "800 em alimentação", "R$ 500 de transporte"
  const amountThenCategoryRegex =
    /(R?\$\s*[\d.,]+(?:\s*(?:mil|k))?|\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b|\b\d{2,6}(?:,\d{1,2})?(?:\s*(?:mil|k))?)\s+(?:com|em|de|para|no|na|nos|nas)\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s/-]{1,34}?)(?=\s*(?:,|;|\.|!|\?|\be\s+R?\$|\be\s+\d|$))/gi;

  for (const match of text.matchAll(amountThenCategoryRegex)) {
    const fullMatch = match[0];
    const amountRaw = match[1];
    const rawCat = match[2].trim();
    const start = match.index ?? 0;
    const amountEnd = start + amountRaw.length;

    if (overlapsAnySpan(start, amountEnd, usedSpans)) continue;

    const lowerCat = rawCat.toLowerCase();
    if (
      NON_CATEGORY_WORDS.has(lowerCat) ||
      lowerCat.startsWith('mês') ||
      lowerCat.startsWith('mes') ||
      lowerCat.startsWith('juros') ||
      lowerCat.startsWith('taxa') ||
      lowerCat.startsWith('rendimento')
    ) {
      continue;
    }

    const val = parseBRLNumber(amountRaw);
    if (val !== null && val > 0) {
      const catName = capitalizeCategory(rawCat);
      categoryMap.set(catName, roundCurrency((categoryMap.get(catName) ?? 0) + val));
      usedSpans.push({ start, end: start + fullMatch.length });
    }
  }

  // Padrão B: "moradia: R$ 1.200", "alimentação R$ 800", "aluguel de R$ 1.500"
  const categoryThenAmountRegex =
    /([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s/-]{2,28}?)\s*(?::|=|-|\bde\b|\bcusta\b|\bfoi\b|\bé\b)\s*(R\$\s*[\d.,]+(?:\s*(?:mil|k))?)/gi;

  for (const match of text.matchAll(categoryThenAmountRegex)) {
    const fullMatch = match[0];
    const rawCat = match[1].trim();
    const amountRaw = match[2];
    const start = match.index ?? 0;
    const end = start + fullMatch.length;

    if (overlapsAnySpan(start, end, usedSpans)) continue;

    const lowerCat = rawCat.toLowerCase();
    if (
      NON_CATEGORY_WORDS.has(lowerCat) ||
      /(?:recebo|ganho|gasto|pago|tenho|receita|sal[aá]rio|renda|reserva|meta|economizar)/i.test(
        lowerCat
      )
    ) {
      continue;
    }

    const val = parseBRLNumber(amountRaw);
    if (val !== null && val > 0) {
      const catName = capitalizeCategory(rawCat);
      categoryMap.set(catName, roundCurrency((categoryMap.get(catName) ?? 0) + val));
      usedSpans.push({ start, end });
    }
  }

  // 3. Caso o usuário informe apenas um total de gastos sem categorias
  if (categoryMap.size === 0) {
    const genericExpenseRegex =
      /(?:gasto|despesas?(?:\s+totais|\s+mensais)?|pago|sa[ií]das?)\s*(?:totais?|mensais?)?\s*(?:de|[:=]|somam|cerca\s+de)?\s*(R?\$\s*[\d.,]+(?:\s*(?:mil|k))?|\b\d{2,6}(?:[.,]\d{1,3})*(?:\s*(?:mil|k))?)/gi;

    for (const match of text.matchAll(genericExpenseRegex)) {
      const fullMatch = match[0];
      const amountRaw = match[1];
      const start = match.index ?? 0;
      const end = start + fullMatch.length;
      if (overlapsAnySpan(start, end, usedSpans)) continue;

      const val = parseBRLNumber(amountRaw);
      if (val !== null && val > 0) {
        categoryMap.set(
          'Despesas informadas',
          roundCurrency((categoryMap.get('Despesas informadas') ?? 0) + val)
        );
        usedSpans.push({ start, end });
      }
    }
  }

  const rawCategories = Array.from(categoryMap.entries()).map(([name, amount]) => ({
    name,
    amount,
  }));

  const totalExpenses = roundCurrency(
    rawCategories.reduce((acc, item) => acc + item.amount, 0)
  );

  // Só retorna análise se houver ao menos receita + despesa, ou despesas claras
  if (totalIncome <= 0 && totalExpenses <= 0) {
    return null;
  }

  if (totalIncome > 0 && totalExpenses === 0 && rawCategories.length === 0) {
    // Se informou só a renda (ex: "Ganho R$ 4.000"), ainda é útil calcular a referência 50-30-20
    return {
      totalIncome,
      totalExpenses: 0,
      balance: totalIncome,
      expenseRatioPercent: 0,
      savingsRatePercent: 100,
      categories: [],
      highestExpenseCategory: null,
      status: 'surplus',
      rule503020: {
        needsLimit: roundCurrency(totalIncome * 0.5),
        wantsLimit: roundCurrency(totalIncome * 0.3),
        savingsTarget: roundCurrency(totalIncome * 0.2),
      },
      emergencyFundTargets: null,
    };
  }

  const categories: FinancialCategory[] = rawCategories
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      name: item.name,
      amount: item.amount,
      percentOfExpenses:
        totalExpenses > 0 ? roundPercent((item.amount / totalExpenses) * 100) : 0,
      percentOfIncome:
        totalIncome > 0 ? roundPercent((item.amount / totalIncome) * 100) : null,
    }));

  const highestExpenseCategory = categories.length > 0 ? categories[0] : null;
  const balance = roundCurrency(totalIncome - totalExpenses);
  const expenseRatioPercent =
    totalIncome > 0 ? roundPercent((totalExpenses / totalIncome) * 100) : null;
  const savingsRatePercent =
    totalIncome > 0 ? roundPercent((balance / totalIncome) * 100) : null;

  let status: FinancialHealthStatus = 'expenses_only';
  if (totalIncome > 0) {
    if (balance < 0) {
      status = 'deficit';
    } else if ((savingsRatePercent ?? 0) < 15) {
      status = 'tight';
    } else {
      status = 'surplus';
    }
  }

  return {
    totalIncome,
    totalExpenses,
    balance,
    expenseRatioPercent,
    savingsRatePercent,
    categories,
    highestExpenseCategory,
    status,
    rule503020:
      totalIncome > 0
        ? {
            needsLimit: roundCurrency(totalIncome * 0.5),
            wantsLimit: roundCurrency(totalIncome * 0.3),
            savingsTarget: roundCurrency(totalIncome * 0.2),
          }
        : null,
    emergencyFundTargets:
      totalExpenses > 0
        ? {
            threeMonths: roundCurrency(totalExpenses * 3),
            sixMonths: roundCurrency(totalExpenses * 6),
          }
        : null,
  };
}

export function buildFinancialPromptContext(analysis: FinancialAnalysis): string {
  const lines: string[] = [
    '[DADOS FINANCEIROS VALIDADOS PELO MÓDULO TYPESCRIPT — USE ESTES VALORES EXATOS NA ANÁLISE]',
  ];

  if (analysis.totalIncome > 0) {
    lines.push(`- Receita total informada: ${formatBRL(analysis.totalIncome)}`);
  } else {
    lines.push('- Receita total informada: Não informada pelo usuário');
  }

  lines.push(`- Despesas totais somadas: ${formatBRL(analysis.totalExpenses)}`);

  if (analysis.totalIncome > 0) {
    lines.push(`- Saldo disponível (Receita - Despesas): ${formatBRL(analysis.balance)}`);
    if (analysis.expenseRatioPercent !== null) {
      lines.push(
        `- Comprometimento da renda com despesas: ${formatPercent(analysis.expenseRatioPercent)}`
      );
    }
    if (analysis.savingsRatePercent !== null) {
      lines.push(
        `- Capacidade atual de poupança: ${formatPercent(analysis.savingsRatePercent)}`
      );
    }
  }

  if (analysis.categories.length > 0) {
    lines.push('- Detalhamento por categoria (ordenado do maior para o menor gasto):');
    for (const cat of analysis.categories) {
      const incomeShare =
        cat.percentOfIncome !== null
          ? ` | ${formatPercent(cat.percentOfIncome)} da renda`
          : '';
      lines.push(
        `  * ${cat.name}: ${formatBRL(cat.amount)} (${formatPercent(cat.percentOfExpenses)} das despesas${incomeShare})`
      );
    }
  }

  if (analysis.highestExpenseCategory) {
    lines.push(
      `- Maior concentração de gastos: ${analysis.highestExpenseCategory.name} (${formatBRL(analysis.highestExpenseCategory.amount)}, equivalente a ${formatPercent(analysis.highestExpenseCategory.percentOfExpenses)} do total de despesas)`
    );
  }

  if (analysis.rule503020) {
    lines.push(
      `- Referência educativa 50-30-20 para esta renda: Essenciais até ${formatBRL(analysis.rule503020.needsLimit)} (50%) | Desejos pessoais até ${formatBRL(analysis.rule503020.wantsLimit)} (30%) | Poupança/Investimentos ${formatBRL(analysis.rule503020.savingsTarget)} (20%)`
    );
  }

  if (analysis.emergencyFundTargets) {
    lines.push(
      `- Reserva de emergência sugerida (baseada nas despesas atuais): 3 meses = ${formatBRL(analysis.emergencyFundTargets.threeMonths)} | 6 meses = ${formatBRL(analysis.emergencyFundTargets.sixMonths)}`
    );
  }

  return lines.join('\n');
}
