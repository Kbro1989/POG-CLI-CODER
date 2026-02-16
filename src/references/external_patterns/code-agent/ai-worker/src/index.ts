/// <reference types="@cloudflare/workers-types" />
import { SpeechClient } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from 'buffer'; // Cloudflare Workers provide a Node.js-compatible Buffer

export interface Env {
  GOOGLE_APPLICATION_CREDENTIALS_JSON: string;
  GEMINI_API_KEY: string;
  AI: any; // Cloudflare Workers AI binding
  RATE_LIMITER: DurableObjectNamespace; // Durable Object for rate limiting
}

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  count?: number;
  limit?: number;
  window?: number;
  firstRequestTime?: number;
}

/* 
interface _RateLimitState {
  count: number;
  firstRequestTime: number;
}
*/
// RateLimitState type is defined but not used here, keeping context.
// type RateLimitState = _RateLimitState;

// Mock data for RSMV models
const RUNESCAPE_MODELS = [
  // Items
  { id: 4151, name: 'Abyssal whip', category: 'items', gameSource: 'runescape', vertexCount: 342, materialCount: 2, tags: ['weapon', 'melee', 'slayer'], examine: 'A weapon from the abyss.' },
  { id: 11694, name: 'Armadyl godsword', category: 'items', gameSource: 'runescape', vertexCount: 1024, materialCount: 3, tags: ['weapon', 'melee', 'godsword'], examine: 'A very powerful godsword.' },
];
const MORROWIND_MODELS = [
  { id: 1, name: 'Frost Atronach', category: 'npcs', gameSource: 'morrowind', vertexCount: 3200, materialCount: 4, boneCount: 24, tags: ['daedra', 'summon'], filePath: 'Meshes/Atronach_Frost.nif' },
];
const FALLOUT_MODELS = [
  { id: 1, name: 'Securitron', category: 'npcs', gameSource: 'fallout', vertexCount: 4500, materialCount: 6, boneCount: 28, tags: ['robot', 'vegas'], description: 'Mr. House\'s robotic army.' },
];
const ALL_MODELS: Record<string, any[]> = {
  runescape: RUNESCAPE_MODELS,
  morrowind: MORROWIND_MODELS,
  fallout: FALLOUT_MODELS,
  all: [...RUNESCAPE_MODELS, ...MORROWIND_MODELS, ...FALLOUT_MODELS]
};

export default {
  async checkRateLimit(_request: Request, env: Env, key: string, limit: number = 5, window: number = 60000): Promise<Response | null> {
    const id = env.RATE_LIMITER.idFromName(key);
    const stub = env.RATE_LIMITER.get(id);
    const response = await stub.fetch(`http://rate-limiter/${key}?limit=${limit}&window=${window}`);
    const result = (await response.json()) as RateLimitResult;
    if (!result.allowed) {
      return new Response(JSON.stringify({ error: result.message }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    return null; // Request allowed
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/live-audio') {
      return this.handleLiveAudio(request, env, ctx);
    }
    if (url.pathname === '/generate-video') {
      return this.handleGenerateVideo(request, env, ctx);
    }
    if (url.pathname === '/generate-image') {
      return this.handleGenerateImage(request, env, ctx);
    }
    if (url.pathname === '/synthesize-speech') {
      return this.handleSynthesizeSpeech(request, env, ctx);
    }
    if (url.pathname === '/api/refactor') {
      return this.handleRefactor(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/extensions')) {
      return this.handleExtensions(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/behavior-trees')) {
      return this.handleBehaviorTrees(request, env, ctx);
    }
    if (url.pathname === '/api/vision') {
      return this.handleVision(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/assets')) {
      return this.handleAssets(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/build')) {
      return this.handleBuild(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/test')) {
      return this.handleTest(request, env, ctx);
    }
    if (url.pathname === '/api/world') {
      return this.handleWorld(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/neural')) {
      return this.handleNeural(request, env, ctx);
    }
    if (url.pathname === '/api/logs') {
      return this.handleLogs(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/pipelines')) {
      return this.handlePipelines(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/cloud-fs')) {
      return this.handleCloudFs(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/rsmv')) {
      return this.handleRsmv(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/git')) {
      return this.handleGit(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/tasks')) {
      return this.handleTasks(request, env, ctx);
    }
    if (url.pathname === '/api/metrics') {
      return this.handleMetrics(request, env, ctx);
    }
    if (url.pathname === '/api/preferences') {
      return this.handlePreferences(request, env, ctx);
    }
    if (url.pathname === '/api/terminal-history') {
      return this.handleTerminalHistory(request, env, ctx);
    }
    if (url.pathname === '/api/remote-terminal') {
      return this.handleRemoteTerminal(request, env, ctx);
    }
    if (url.pathname === '/api/download-project') {
      return this.handleDownloadProject(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },

  async handleLiveAudio(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();
    try {
      const credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      const speechClient = new SpeechClient({ credentials });
      const textToSpeechClient = new TextToSpeechClient({ credentials });
      const aiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const recognizeStream = speechClient.streamingRecognize({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        interimResults: true,
      })
        .on('error', (error: Error) => {
          console.error('Speech-to-Text stream error:', error);
          server.send(JSON.stringify({ type: 'error', message: error.message }));
        })
        .on('data', async (data: any) => {
          const transcription = data.results[0]?.alternatives[0]?.transcript;
          if (transcription && data.results[0].isFinal) {
            server.send(JSON.stringify({ type: 'transcription', text: transcription }));
            const model = aiClient.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent(transcription);
            const responseText = result.response.text();
            server.send(JSON.stringify({ type: 'model_response', text: responseText }));
            if (responseText) {
              const [synthesizeResponse] = await textToSpeechClient.synthesizeSpeech({
                input: { text: responseText },
                voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
                audioConfig: { audioEncoding: 'MP3' },
              });
              if (synthesizeResponse.audioContent) {
                const audioBase64 = Buffer.from(synthesizeResponse.audioContent as Uint8Array).toString('base64');
                server.send(JSON.stringify({ type: 'speech', audio: audioBase64 }));
              }
            }
          }
        });

      server.addEventListener('message', (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          recognizeStream.write(Buffer.from(event.data));
        }
      });
      server.addEventListener('close', () => {
        recognizeStream.end();
        speechClient.close();
        textToSpeechClient.close();
      });
      return new Response(null, { status: 101, webSocket: client } as any);
    } catch (error) {
      return new Response(`Worker Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleGenerateVideo(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { prompt } = (await request.json()) as { prompt: string };
    const rateLimit = await this.checkRateLimit(request, env, 'generate-video', 1);
    if (rateLimit) return rateLimit;
    console.log(`[VIDEO] Generating video for prompt: ${prompt}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return new Response(JSON.stringify({ videoUri: `https://example.com/video_${Date.now()}.mp4` }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleGenerateImage(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { prompt } = (await request.json()) as { prompt: string };
    const rateLimit = await this.checkRateLimit(request, env, 'generate-image', 5);
    if (rateLimit) return rateLimit;
    const response = await env.AI.run("@cf/stable-diffusion-xl-base-1.0", { prompt });
    return new Response(response, { headers: { "Content-Type": "image/png" } });
  },

  async handleSynthesizeSpeech(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { text } = (await request.json()) as { text: string };
    const rateLimit = await this.checkRateLimit(request, env, 'synthesize-speech', 10);
    if (rateLimit) return rateLimit;
    const response = await env.AI.run("@cf/deepgram/aura-2-en", { text });
    return new Response(response, { headers: { "Content-Type": "audio/mpeg" } });
  },

  async handleRefactor(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { code, filename } = (await request.json()) as { code: string; filename: string };
    const rateLimit = await this.checkRateLimit(request, env, 'refactor', 10);
    if (rateLimit) return rateLimit;
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(`Refactor this code from ${filename}:\n${code}`);
    return new Response(JSON.stringify({ suggestion: result.response.text() }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleExtensions(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/extensions/')[1];
    if (request.method === 'GET') {
      return new Response(JSON.stringify([{ id: 'willow.base-tools' }]), { headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'DELETE' && id) {
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleBehaviorTrees(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const method = request.method;
    if (method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (method === 'POST') return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleVision(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const formData = await request.formData();
    const image = formData.get('image') as unknown as File;
    const prompt = formData.get('prompt') as string;
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-pro-vision' });
    const result = await model.generateContent([prompt, { inlineData: { data: Buffer.from(await image.arrayBuffer()).toString('base64'), mimeType: image.type } }]);
    return new Response(JSON.stringify({ analysis: result.response.text() }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleAssets(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'POST') return new Response(JSON.stringify({ id: 'new-asset' }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleBuild(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { prompt } = (await request.json()) as { prompt?: string };
    console.log('Build:', prompt);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleTest(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { prompt } = (await request.json()) as { prompt?: string };
    console.log('Test:', prompt);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleWorld(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { config } = (await request.json()) as { config?: any };
    return new Response(JSON.stringify({ success: true, worldData: { seed: config?.seed || 123 } }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleNeural(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'POST') return new Response(JSON.stringify({ id: 'nn-1' }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleLogs(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'POST') return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handlePipelines(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'POST') return new Response(JSON.stringify({ id: 'pl-1' }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleCloudFs(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    if (request.method === 'POST') return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    return new Response('Method Not Allowed', { status: 405 });
  },

  async handleRsmv(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const [_, gameSource] = url.pathname.split('/').slice(3);
    const source = gameSource || 'runescape';
    console.log(`[RSMV] Fetching models for source: ${source}`);
    return new Response(JSON.stringify(ALL_MODELS[source] || []), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleGit(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { command } = (await request.json()) as { command: string };
    return new Response(JSON.stringify({ success: true, command }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleTasks(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    return new Response(JSON.stringify([{ id: '1', title: 'Task 1' }]), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleMetrics(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify({ used: 0 }), { headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handlePreferences(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') return new Response(JSON.stringify({ theme: 'dark' }), { headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleTerminalHistory(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleRemoteTerminal(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { command } = (await request.json()) as { command: string };
    return new Response(JSON.stringify({ output: `Executed ${command}` }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleDownloadProject(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    return new Response(JSON.stringify({ 'README.md': '# Project' }), { headers: { 'Content-Type': 'application/json' } });
  },
}
