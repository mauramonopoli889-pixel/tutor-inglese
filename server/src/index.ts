import Anthropic from '@anthropic-ai/sdk';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

// Small backend that keeps the API key off the phone. The app sends a compact learner briefing;
// the server decides nothing pedagogical, it only lets Claude speak and correct within those limits.
const client = new Anthropic();
const MODEL = process.env.TUTOR_MODEL ?? 'claude-opus-5-5';
const PORT = Number(process.env.PORT ?? 8787);

type Turn = { role: 'tutor' | 'learner'; text: string };

type ConverseBody = {
  level: string;
  learnerName?: string;
  brief?: string;
  scenario?: { title: string; role: string; mission: string } | null;
  history: Turn[];
};

type ExplainBody = {
  level: string;
  unitTitle: string;
  explanation: string;
  mode: 'simpler' | 'example' | 'italian';
  tried?: string[];
  interests?: string[];
};

const LEVEL_RULES: Record<string, string> = {
  A0: 'Use only very common words and sentences of 3-7 words. Present tense of be/have/like. Ask one simple question at a time.',
  A1: 'Use short sentences (5-10 words), everyday vocabulary, present simple, can, there is. Past simple only with very common verbs.',
  A2: 'Use simple sentences, past simple, going to, comparatives. Explain any less common word inline.',
  B1: 'Speak naturally but clearly. Use common phrasal verbs and present perfect.',
  B2: 'Speak naturally, including idioms and longer sentences.',
};

const conversationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'replyItalian', 'corrections', 'missionComplete'],
  properties: {
    reply: { type: 'string', description: 'Your next line in English, in character.' },
    replyItalian: { type: 'string', description: 'Italian translation of reply.' },
    missionComplete: { type: 'boolean' },
    corrections: {
      type: 'array',
      description: "Only for the learner's LAST message. Empty if it was correct and natural.",
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['said', 'better', 'why', 'grade'],
        properties: {
          said: { type: 'string' },
          better: { type: 'string' },
          why: { type: 'string', description: 'One or two short sentences in simple Italian, comparing with Italian when useful.' },
          grade: { type: 'string', enum: ['major', 'minor'] },
        },
      },
    },
  },
} as const;

function systemFor(body: ConverseBody): string {
  const level = LEVEL_RULES[body.level] ?? LEVEL_RULES.A1;
  const scene = body.scenario
    ? `You are role-playing as ${body.scenario.role} in the scene "${body.scenario.title}". The learner's mission: ${body.scenario.mission}. Stay in character and move the scene forward. Set missionComplete to true once the mission is clearly done.`
    : 'This is a free conversation ("Parla con me"). Be a warm, curious conversation partner. Ask about the learner\'s life and interests. missionComplete is always false.';
  return [
    'You are Sam, a friendly English tutor for an Italian speaker. The goal is that they can hold a conversation without panic.',
    scene,
    `Learner level: ${body.level}. ${level}`,
    body.brief ? `What you know about this learner (use it, do not recite it): ${body.brief}` : '',
    'Never interrupt the conversation to teach. Reply naturally to the meaning of what they said. If their sentence had a mistake, you may naturally reuse the correct form in your reply (recast), but do not point it out in the reply.',
    'Put corrections only in the corrections field: "major" when the error changes the meaning or blocks understanding, "minor" when it is understandable but not natural. Ignore capitalisation and punctuation. Do not correct things above their level unless they are wrong.',
    'If the learner writes in Italian or seems stuck, help gently in English with two short options they could say.',
    'Keep your reply to at most two sentences.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function converse(body: ConverseBody) {
  const messages: Anthropic.Beta.BetaMessageParam[] = body.history.map((t) => ({
    role: t.role === 'tutor' ? 'assistant' : 'user',
    content: t.text,
  }));
  if (!messages.length || messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(The learner opens the app and is ready to start.)' });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Conversation needs quick turns more than deep reasoning.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: conversationSchema } },
    system: [{ type: 'text', text: systemFor(body), cache_control: { type: 'ephemeral' } }],
    messages,
  });
  return parseJson(response);
}

const explainSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'exampleEn', 'exampleIt'],
  properties: {
    text: { type: 'string', description: 'The explanation in Italian, 2-4 short sentences.' },
    exampleEn: { type: 'string' },
    exampleIt: { type: 'string' },
  },
} as const;

async function explain(body: ExplainBody) {
  const ask = {
    simpler: 'The learner pressed "Non ho capito". Explain again with even simpler words and a DIFFERENT approach from the ones already tried (an everyday image, a direct comparison with Italian, or one tiny step at a time).',
    example: 'The learner pressed "Fammi un esempio". Give one new, concrete example from their life and a one-line note on why it works.',
    italian: 'The learner pressed "Spiegamelo in italiano". Explain the rule fully in plain Italian, without grammar jargon.',
  }[body.mode];
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 1500,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: explainSchema } },
    system: 'You are a patient English teacher for Italian speakers. Write for an adult, never childish. No academic grammar terms unless you explain them.',
    messages: [
      {
        role: 'user',
        content: [
          `Topic: ${body.unitTitle} (level ${body.level}).`,
          `Explanation the learner already saw: ${body.explanation}`,
          body.tried?.length ? `Approaches already tried: ${body.tried.join(' | ')}` : '',
          body.interests?.length ? `Learner interests: ${body.interests.join(', ')}` : '',
          ask,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  });
  return parseJson(response);
}

function parseJson(response: Anthropic.Beta.BetaMessage): unknown {
  if (response.stop_reason === 'refusal') throw new HttpError(422, 'refused');
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) throw new HttpError(502, 'empty response');
  return JSON.parse(text);
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 200_000) throw new HttpError(413, 'body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': process.env.ALLOWED_ORIGIN ?? '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL });
    if (req.method !== 'POST') throw new HttpError(404, 'not found');
    const body = await readBody(req);
    if (req.url === '/api/converse') {
      const b = body as ConverseBody;
      if (!Array.isArray(b.history) || typeof b.level !== 'string') throw new HttpError(400, 'history and level are required');
      return send(res, 200, await converse(b));
    }
    if (req.url === '/api/explain') {
      const b = body as ExplainBody;
      if (typeof b.unitTitle !== 'string' || typeof b.explanation !== 'string' || typeof b.mode !== 'string') throw new HttpError(400, 'unitTitle, explanation and mode are required');
      return send(res, 200, await explain(b));
    }
    throw new HttpError(404, 'not found');
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'rate limited' });
    if (err instanceof Anthropic.APIError) return send(res, 502, { error: `upstream ${err.status}` });
    if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid json' });
    console.error(err);
    return send(res, 500, { error: 'internal error' });
  }
}).listen(PORT, () => console.log(`Tutor server on http://localhost:${PORT} (model ${MODEL})`));
