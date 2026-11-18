export interface FinancialCategory {
  name: string;
  amount: number;
  percentOfExpenses: number;
  percentOfIncome: number | null;
}

export type FinancialHealthStatus = 'surplus' | 'tight' | 'deficit' | 'expenses_only';

export interface FinancialAnalysis {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expenseRatioPercent: number | null;
  savingsRatePercent: number | null;
  categories: FinancialCategory[];
  highestExpenseCategory: FinancialCategory | null;
  status: FinancialHealthStatus;
  rule503020: {
    needsLimit: number;
    wantsLimit: number;
    savingsTarget: number;
  } | null;
  emergencyFundTargets: {
    threeMonths: number;
    sixMonths: number;
  } | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  analysis?: FinancialAnalysis | null;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  iconName:
    | 'wallet'
    | 'pie-chart'
    | 'piggy-bank'
    | 'trending-up'
    | 'shield-alert'
    | 'umbrella';
}
