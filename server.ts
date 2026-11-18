import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, type Content } from '@google/genai';
import {
  analyzeFinancialText,
  buildFinancialPromptContext,
} from './src/utils/financeCalculator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

const FINANIA_SYSTEM_INSTRUCTION = `Você é o FinanIA, um agente inteligente especializado em educação financeira e organização de finanças pessoais no contexto brasileiro.

Diretrizes fundamentais de atuação:
1. Idioma e tom: Responda sempre em português do Brasil, com linguagem acolhedora, clara, objetiva e didática, evitando jargões desnecessários (e explicando termos técnicos quando citá-los).
2. Cálculos e precisão: Quando a mensagem incluir o bloco "[DADOS FINANCEIROS VALIDADOS PELO MÓDULO TYPESCRIPT]", utilize EXATAMENTE aqueles totais, saldos, percentuais e categorias calculados. Nunca altere ou arredonde incorretamente esses valores. Se o usuário informar novos números na conversa sem que o bloco apareça, faça os cálculos passo a passo com rigor matemático.
3. Análise de orçamento e gastos:
   - Destaque receita total, despesas totais, saldo disponível (ou déficit) e percentual de comprometimento da renda.
   - Aponte explicitamente qual categoria concentra o maior volume de gastos.
   - Apresente comparações educativas (como a referência 50-30-20) e sugestões práticas e realistas de ajuste.
4. Educação financeira e investimentos:
   - Explique conceitos como reserva de emergência, juros compostos, inflação, liquidez, CDB, Tesouro Direto (Selic, IPCA+), LCI/LCA e estratégias de quitação de dívidas (método Bola de Neve e método Avalanche) de forma acessível.
   - NUNCA prometa retornos financeiros, rentabilidades garantidas nem recomende ativos específicos (ações, FIIs ou criptomoedas específicas) como garantia de lucro. Deixe claro o caráter educativo.
5. Formatação em Markdown:
   - Organize as respostas com títulos curtos (###), listas com marcadores, negrito nos números principais e tabelas Markdown sempre que apresentar resumo de orçamento, comparação de cenários ou planos por etapas.
6. Continuidade: Quando faltarem informações importantes para personalizar melhor a orientação (como valor da renda, prazo da meta, taxa de juros da dívida ou composição familiar), faça de 1 a 3 perguntas objetivas ao final para continuar ajudando.`;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  const errObj = error as { status?: number; message?: string; code?: number };
  const rawMessage = errObj?.message ?? String(error ?? '');
  const statusCode = typeof errObj?.status === 'number' ? errObj.status : 500;

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return {
      status: 403,
      message:
        'A chave da API Gemini configurada não tem permissão ou é inválida. Verifique a configuração em Settings > Secrets.',
    };
  }

  if (rawMessage.includes('RESOURCE_EXHAUSTED') || statusCode === 429) {
    return {
      status: 429,
      message:
        'O limite de solicitações da API Gemini foi atingido temporariamente. Aguarde alguns instantes e tente novamente.',
    };
  }

  if (rawMessage.includes('NOT_FOUND') || statusCode === 404) {
    return {
      status: 404,
      message:
        'O modelo de IA solicitado não foi encontrado ou está indisponível no momento.',
    };
  }

  return {
    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message:
      'Não foi possível concluir a resposta com a inteligência artificial no momento. Tente novamente em instantes.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'A variável GEMINI_API_KEY não está configurada no ambiente do servidor. Configure sua chave no painel Settings > Secrets para ativar o FinanIA.',
      });
      return;
    }

    const body = req.body as { messages?: IncomingMessage[] };
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      res.status(400).json({ error: 'Envie pelo menos uma mensagem para iniciar a conversa.' });
      return;
    }

    const validMessages = messages.filter(
      (msg): msg is IncomingMessage =>
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
    );

    if (validMessages.length === 0) {
      res.status(400).json({ error: 'O conteúdo da mensagem não pode estar vazio.' });
      return;
    }

    const latestMessage = validMessages[validMessages.length - 1];
    if (latestMessage.role !== 'user') {
      res.status(400).json({ error: 'A última mensagem deve ser do usuário.' });
      return;
    }

    // Executa o módulo de cálculo e validação financeira em TypeScript na mensagem atual
    const analysis = analyzeFinancialText(latestMessage.content);
    const enhancedLatestPrompt = analysis
      ? `${latestMessage.content}\n\n${buildFinancialPromptContext(analysis)}`
      : latestMessage.content;

    const history: Content[] = validMessages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const chat = ai.chats.create({
        model: MODEL_NAME,
        config: {
          systemInstruction: FINANIA_SYSTEM_INSTRUCTION,
        },
        history,
      });

      const stream = await chat.sendMessageStream({
        message: enhancedLatestPrompt,
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      if (analysis) {
        res.write(`data: ${JSON.stringify({ type: 'analysis', analysis })}\n\n`);
      }

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Erro na chamada Gemini API:', error);
      const formatted = formatGeminiError(error);

      if (!res.headersSent) {
        res.status(formatted.status).json({ error: formatted.message });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: formatted.message })}\n\n`
        );
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Aplicação não compilada.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinanIA servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor FinanIA:', err);
  process.exit(1);
});
