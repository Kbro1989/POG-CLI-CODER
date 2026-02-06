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

interface RateLimitState {
  count: number;
  firstRequestTime: number;
}

export default {
  async checkRateLimit(request: Request, env: Env, key: string, limit: number = 5, window: number = 60000): Promise<Response | null> {
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

  async handleLiveAudio(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();

    server.accept();

    let speechClient: SpeechClient | null = null;
    let textToSpeechClient: TextToSpeechClient | null = null;
    let recognizeStream: any = null; // Google Cloud Speech-to-Text stream
    let aiClient: GoogleGenerativeAI | null = null; // For interacting with Gemini

    try {
      const credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      speechClient = new SpeechClient({ credentials });
      textToSpeechClient = new TextToSpeechClient({ credentials });
      aiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);

      recognizeStream = speechClient.streamingRecognize({
        config: {
          encoding: 'WEBM_OPUS', // Ensure this matches frontend MediaRecorder mimeType
          sampleRateHertz: 48000, // Ensure this matches frontend audio capture
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        interimResults: true,
      })
        .on('error', (error: Error) => {
          console.error('Speech-to-Text stream error:', error);
          server.send(JSON.stringify({ type: 'error', message: error.message }));
        })
        .on('data', async (data) => {
          const transcription = data.results[0]?.alternatives[0]?.transcript;
          if (transcription && data.results[0].isFinal) {
            console.log('Final Transcription:', transcription);
            server.send(JSON.stringify({ type: 'transcription', text: transcription }));

            if (aiClient) {
              try {
                const model = aiClient.getGenerativeModel({ model: 'gemini-pro' });
                const result = await model.generateContent(transcription);
                const responseText = result.response.text();
                console.log('Gemini Response:', responseText);
                server.send(JSON.stringify({ type: 'model_response', text: responseText }));

                if (textToSpeechClient && responseText) {
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
              } catch (aiError) {
                console.error('Gemini or Text-to-Speech error:', aiError);
                server.send(JSON.stringify({ type: 'error', message: 'AI processing error.' }));
              }
            }
          } else if (transcription) {
            // You can send interim results to frontend here if needed
            // server.send(JSON.stringify({ type: 'interim_transcription', text: transcription }));
          }
        });

      server.addEventListener('message', (event: MessageEvent) => {
        if (recognizeStream && event.data instanceof ArrayBuffer) {
          recognizeStream.write(Buffer.from(event.data));
        }
      });

      server.addEventListener('close', () => {
        console.log('WebSocket connection closed.');
        if (recognizeStream) {
          recognizeStream.end();
        }
        speechClient?.close();
        textToSpeechClient?.close();
      });

      server.addEventListener('error', (error: Event) => {
        console.error('WebSocket error:', error);
        if (recognizeStream) {
          recognizeStream.end();
        }
      });

      return new Response(null, { status: 101, webSocket: client }) as Response;

    } catch (error) {
      console.error("Cloudflare Worker initialization error:", error);
      return new Response(`Worker Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleGenerateVideo(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    interface GenerateVideoRequest {
      prompt: string;
      apiKey?: string;
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { prompt } = (await request.json()) as GenerateVideoRequest;

    const rateLimitResponse = await this.checkRateLimit(request, env, 'generate-video', 1); // 1 request per minute for video
    if (rateLimitResponse) return rateLimitResponse;

    console.log('Received video generation request for prompt:', prompt);

    // Placeholder for Google Cloud Video Generation API integration
    // You will need to research and integrate the appropriate Google Cloud service
    // (e.g., Vertex AI for media, or specialized video APIs) here.

    try {
      // Simulate a long-running operation
      await new Promise(resolve => setTimeout(resolve, 5000));

      const placeholderVideoUri = `https://example.com/generated_video_${Date.now()}.mp4`;
      return new Response(JSON.stringify({ videoUri: placeholderVideoUri }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error("Video generation worker error:", error);
      return new Response(`Video Generation Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleGenerateImage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    interface GenerateImageRequest {
      prompt: string;
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { prompt } = (await request.json()) as GenerateImageRequest;

    const rateLimitResponse = await this.checkRateLimit(request, env, 'generate-image', 5); // 5 requests per minute for images
    if (rateLimitResponse) return rateLimitResponse;

    console.log('Received image generation request for prompt:', prompt);

    try {
      const inputs = { prompt };
      const response = await env.AI.run("@cf/stable-diffusion-xl-base-1.0", inputs);

      return new Response(response, {
        headers: {
          "Content-Type": "image/png",
        },
      });
    } catch (error) {
      console.error("Image generation worker error:", error);
      return new Response(`Image Generation Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleSynthesizeSpeech(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    interface SynthesizeSpeechRequest {
      text: string;
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { text } = (await request.json()) as SynthesizeSpeechRequest;

    const rateLimitResponse = await this.checkRateLimit(request, env, 'synthesize-speech', 10); // 10 requests per minute for speech synthesis
    if (rateLimitResponse) return rateLimitResponse;

    console.log('Received synthesize speech request for text:', text);

    try {
      const inputs = { text };
      const response = await env.AI.run("@cf/deepgram/aura-2-en", inputs);

      return new Response(response, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    } catch (error) {
      console.error("Speech synthesis worker error:", error);
      return new Response(`Speech Synthesis Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleRefactor(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    interface RefactorRequest {
      code: string;
      filename: string;
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { code, filename } = (await request.json()) as RefactorRequest;

    const rateLimitResponse = await this.checkRateLimit(request, env, 'refactor', 10); // 10 requests per minute for refactoring
    if (rateLimitResponse) return rateLimitResponse;

    try {
      // Use a powerful model for refactoring suggestions
      const model = new GoogleGenerativeAI(env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

      const prompt = `
        You are an expert software engineer. Analyze the following code from the file "${filename}" and provide a refactoring suggestion.
        - Your suggestion should improve code quality, readability, and performance.
        - Provide the complete, refactored code.
        - Explain the benefits of your changes.
        - Respond in JSON format with the following structure: { "original": "...", "modified": "...", "explanation": "..." }

        Original Code:
        \`\`\`
        ${code}
        \`\`\`
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return new Response(JSON.stringify({ suggestion: JSON.parse(jsonMatch[0]) }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: "Failed to parse refactoring suggestion." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error("Refactor worker error:", error);
      return new Response(`Refactor Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleExtensions(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/extensions/')[1];

    // In-memory extension store (replace with KV or D1 in production)
    const extensions = [
      { identifier: { id: 'willow.base-tools', uuid: '1' }, metadata: { publisherDisplayName: 'Willow', pinned: true, targetPlatform: 'universal' }, version: '1.0.0' },
      { identifier: { id: 'willow.ai-code-agent', uuid: '2' }, metadata: { publisherDisplayName: 'Willow', pinned: true, targetPlatform: 'local' }, version: '1.2.0' },
      { identifier: { id: 'thirdparty.asset-importer', uuid: '3' }, metadata: { publisherDisplayName: 'Community', pinned: false, targetPlatform: 'universal' }, version: '0.9.0' },
    ];

    switch (request.method) {
      case 'GET':
        return new Response(JSON.stringify(extensions), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
        if (!id) {
          return new Response('Missing extension ID', { status: 400 });
        }
        console.log(`[WORKER] Uninstalling extension: ${id}`);
        // In-memory: no actual deletion, just a success response
        return new Response(JSON.stringify({ success: true, message: `Extension ${id} uninstalled.` }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

  async handleBehaviorTrees(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/behavior-trees/')[1];

    // In-memory behavior tree store (replace with KV or D1 in production)
    let behaviorTrees: any[] = [];

    switch (request.method) {
      case 'GET':
        // In a real app, you would fetch a specific tree by id
        return new Response(JSON.stringify(behaviorTrees), { headers: { 'Content-Type': 'application/json' } });

      case 'POST':
        const tree = await request.json();
        // In a real app, you would save the tree to a database
        console.log('[WORKER] Saving behavior tree:', tree);
        return new Response(JSON.stringify({ success: true, message: 'Behavior tree saved.' }), { headers: { 'Content-Type': 'application/json' } });

      case 'PUT':
        if (!id) {
          return new Response('Missing behavior tree ID', { status: 400 });
        }
        const updatedTree = await request.json();
        // In a real app, you would update the tree in a database
        console.log(`[WORKER] Updating behavior tree ${id}:`, updatedTree);
        return new Response(JSON.stringify({ success: true, message: `Behavior tree ${id} updated.` }), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
        if (!id) {
          return new Response('Missing behavior tree ID', { status: 400 });
        }
        console.log(`[WORKER] Deleting behavior tree: ${id}`);
        // In-memory: no actual deletion, just a success response
        return new Response(JSON.stringify({ success: true, message: `Behavior tree ${id} deleted.` }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

  async handleVision(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!image || !prompt) {
      return new Response('Missing image or prompt', { status: 400 });
    }

    const rateLimitResponse = await this.checkRateLimit(request, env, 'vision', 10); // 10 requests per minute for vision
    if (rateLimitResponse) return rateLimitResponse;

    try {
      const model = new GoogleGenerativeAI(env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-pro-vision' });

      const imageParts = [
        {
          inlineData: {
            data: Buffer.from(await image.arrayBuffer()).toString('base64'),
            mimeType: image.type,
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = result.response.text();

      return new Response(JSON.stringify({ analysis: responseText }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error("Vision worker error:", error);
      return new Response(`Vision Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
  },

  async handleAssets(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/assets/')[1];

    // In-memory asset store (replace with KV/D1 and R2 in production)
    let assets: any[] = [];

    switch (request.method) {
      case 'GET':
        if (id) {
          // In a real app, you would fetch a specific asset by id from R2
          return new Response(JSON.stringify(assets.find(a => a.id === id)), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(assets), { headers: { 'Content-Type': 'application/json' } });

      case 'POST':
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;
        const type = formData.get('type') as string;

        if (!file) {
          return new Response('Missing file', { status: 400 });
        }

        // In a real app, you would upload the file to R2
        console.log(`[WORKER] Uploading asset: ${name}`);

        const newAsset = {
          id: `asset-${Date.now()}`,
          name: name || file.name,
          type: type || 'mesh',
          url: `/api/assets/asset-${Date.now()}`, // Placeholder URL
          status: 'raw',
        };
        assets.push(newAsset);

        return new Response(JSON.stringify(newAsset), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
        if (!id) {
          return new Response('Missing asset ID', { status: 400 });
        }
        console.log(`[WORKER] Deleting asset: ${id}`);
        // In-memory: no actual deletion, just a success response
        return new Response(JSON.stringify({ success: true, message: `Asset ${id} deleted.` }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

  async handleBuild(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const body = await request.json() as { prompt?: string };
    const { prompt } = body;

    console.log(`[WORKER] Build triggered with prompt: ${prompt}`);

    // In a real app, this would trigger a build pipeline
    // For now, just return a success response
    return new Response(JSON.stringify({ success: true, message: 'Build triggered.' }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleTest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const body = await request.json() as { prompt?: string };
    const { prompt } = body;

    console.log(`[WORKER] Test triggered with prompt: ${prompt}`);

    // In a real app, this would trigger a test runner
    // For now, just return a success response
    return new Response(JSON.stringify({ success: true, message: 'Test suite triggered.' }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleWorld(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const body = await request.json() as { config?: any };
    const config = body.config;

    console.log(`[WORKER] World generation triggered with config:`, config);

    // In a real app, this would trigger a world generation algorithm
    // For now, just return a success response with some placeholder data
    const worldData = {
      seed: config?.seed || Math.floor(Math.random() * 999999),
      // ... other generated world data
    };

    return new Response(JSON.stringify({ success: true, worldData }), { headers: { 'Content-Type': 'application/json' } });
  },

  async handleNeural(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/neural/')[1];

    // In-memory neural network store (replace with KV or D1 in production)
    let neuralNetworks: any[] = [];

    switch (request.method) {
      case 'GET':
        if (id) {
          return new Response(JSON.stringify(neuralNetworks.find(n => n.id === id)), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(neuralNetworks), { headers: { 'Content-Type': 'application/json' } });

      case 'POST':
        const network = await request.json();
        console.log('[WORKER] Saving neural network:', network);
        const newNetwork = { ...network, id: `nn-${Date.now()}` };
        neuralNetworks.push(newNetwork);
        return new Response(JSON.stringify(newNetwork), { headers: { 'Content-Type': 'application/json' } });

      case 'PUT':
        if (!id) {
          return new Response('Missing neural network ID', { status: 400 });
        }
        const updatedNetwork = await request.json();
        console.log(`[WORKER] Updating neural network ${id}:`, updatedNetwork);
        return new Response(JSON.stringify({ success: true, message: `Neural network ${id} updated.` }), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
        if (!id) {
          return new Response('Missing neural network ID', { status: 400 });
        }
        console.log(`[WORKER] Deleting neural network: ${id}`);
        return new Response(JSON.stringify({ success: true, message: `Neural network ${id} deleted.` }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

  async handleLogs(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // In-memory log store (replace with a logging service in production)
    let logs: any[] = [];

    switch (request.method) {
      case 'POST':
        const log = await request.json();
        console.log('[WORKER] Received log:', log);
        logs.push(log);
        return new Response(JSON.stringify({ success: true, message: 'Log received.' }), { headers: { 'Content-Type': 'application/json' } });

      case 'GET':
        return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

  async handlePipelines(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/api/pipelines/')[1];

    // In-memory pipeline store (replace with KV or D1 in production)
    let pipelines: any[] = [];

    switch (request.method) {
      case 'GET':
        if (id) {
          return new Response(JSON.stringify(pipelines.find(p => p.id === id)), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(pipelines), { headers: { 'Content-Type': 'application/json' } });

      case 'POST':
        const pipeline = await request.json();
        console.log('[WORKER] Saving pipeline:', pipeline);
        const newPipeline = { ...pipeline, id: `pl-${Date.now()}` };
        pipelines.push(newPipeline);
        return new Response(JSON.stringify(newPipeline), { headers: { 'Content-Type': 'application/json' } });

      case 'PUT':
        if (!id) {
          return new Response('Missing pipeline ID', { status: 400 });
        }
        const updatedPipeline = await request.json();
        console.log(`[WORKER] Updating pipeline ${id}:`, updatedPipeline);
        return new Response(JSON.stringify({ success: true, message: `Pipeline ${id} updated.` }), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
        if (!id) {
          return new Response('Missing pipeline ID', { status: 400 });
        }
        console.log(`[WORKER] Deleting pipeline: ${id}`);
        return new Response(JSON.stringify({ success: true, message: `Pipeline ${id} deleted.` }), { headers: { 'Content-Type': 'application/json' } });

      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },

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
  };

  async handleRsmv(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  const url = new URL(request.url);
  const [_, gameSource, category, id] = url.pathname.split('/').slice(3);

  if(request.method === 'GET') {
  if (gameSource && category) {
    const models = (ALL_MODELS[gameSource] || []).filter(m => m.category === category);
    return new Response(JSON.stringify(models), { headers: { 'Content-Type': 'application/json' } });
  }
  if (gameSource) {
    return new Response(JSON.stringify(ALL_MODELS[gameSource] || []), { headers: { 'Content-Type': 'application/json' } });
  }
}

return new Response('Not Found', { status: 404 });
  },

  async handleGit(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  const body = await request.json() as { command: string, [key: string]: any };
  const { command, ...args } = body;

  console.log(`[WORKER] Git command: ${command}`, args);

  // In a real app, this would use a library like isomorphic-git to interact with a Git repository
  // For now, just return placeholder data
  switch(command) {
      case 'status':
  return new Response(JSON.stringify({ staged: [], unstaged: ['file1.ts', 'file2.ts'] }), { headers: { 'Content-Type': 'application/json' } });
  case 'commit':
  return new Response(JSON.stringify({ success: true, commitId: 'abcdef' }), { headers: { 'Content-Type': 'application/json' } });
  case 'history':
  return new Response(JSON.stringify([{ id: 'abcdef', message: 'Initial commit', timestamp: Date.now() }]), { headers: { 'Content-Type': 'application/json' } });
  default:
        return new Response('Unknown Git command', { status: 400 });
}
  },

  async handleMetrics(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  // In-memory metrics store (replace with KV or D1 in production)
  let tokenMetrics = { used: 0, limit: 100000000 };

  switch(request.method) {
      case 'GET':
  return new Response(JSON.stringify(tokenMetrics), { headers: { 'Content-Type': 'application/json' } });

      case 'POST':
  const body = await request.json() as { used: number };
  const { used } = body;
  tokenMetrics.used += used;
  return new Response(JSON.stringify({ success: true, message: 'Metrics updated.' }), { headers: { 'Content-Type': 'application/json' } });

      default:
  return new Response('Method Not Allowed', { status: 405 });
}
  },

  async handlePreferences(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  // In-memory preference store (replace with KV or D1 in production)
  let preferences = { theme: 'dark', language: 'en' };

  switch(request.method) {
      case 'GET':
  return new Response(JSON.stringify(preferences), { headers: { 'Content-Type': 'application/json' } });

      case 'PUT':
  const updatedPreferences = await request.json();
  preferences = { ...preferences, ...updatedPreferences };
  console.log('[WORKER] Preferences updated:', preferences);
  return new Response(JSON.stringify({ success: true, message: 'Preferences updated.' }), { headers: { 'Content-Type': 'application/json' } });

      default:
  return new Response('Method Not Allowed', { status: 405 });
}
  },

  async handleCloudFs(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/cloud-fs', '');

  // In-memory cloud file system store (replace with R2 in production)
  let cloudFiles: Record<string, string> = {};

  switch(request.method) {
      case 'GET':
  if (path) {
    const content = cloudFiles[path];
    if (content !== undefined) {
      return new Response(content, { headers: { 'Content-Type': 'text/plain' } });
    } else {
      return new Response('File not found', { status: 404 });
    }
  }
  return new Response(JSON.stringify(Object.keys(cloudFiles)), { headers: { 'Content-Type': 'application/json' } });

      case 'POST': // For writing files
  const fileContent = await request.text();
  cloudFiles[path] = fileContent;
  console.log(`[WORKER] Cloud file written: ${path}`);
  return new Response(JSON.stringify({ success: true, message: `File ${path} written to cloud.` }), { headers: { 'Content-Type': 'application/json' } });

      case 'DELETE':
  if (path && cloudFiles[path] !== undefined) {
    delete cloudFiles[path];
    console.log(`[WORKER] Cloud file deleted: ${path}`);
    return new Response(JSON.stringify({ success: true, message: `File ${path} deleted from cloud.` }), { headers: { 'Content-Type': 'application/json' } });
  } else {
    return new Response('File not found', { status: 404 });
  }

      default:
  return new Response('Method Not Allowed', { status: 405 });
}
  },

  async handleRemoteTerminal(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  if(request.method !== 'POST') {
  return new Response('Method Not Allowed', { status: 405 });
}

const { command, cwd } = (await request.json()) as { command: string; cwd?: string };

console.log(`[WORKER] Remote terminal command: ${command} in ${cwd || 'default directory'}`);

// In a real application, this would execute the command on a remote machine
// and stream back the output. For this example, we'll return a mock response.
const mockOutput = `Executing: ${command}\nMock output for: ${command}\n(Simulated remote execution)`;

return new Response(JSON.stringify({ output: mockOutput }), {
  headers: { 'Content-Type': 'application/json' },
});
  },

  async handleDownloadProject(request: Request, env: Env, ctx: ExecutionContext): Promise < Response > {
  if(request.method !== 'GET') {
  return new Response('Method Not Allowed', { status: 405 });
}

// In a real implementation, this would collect all project files
// For this example, we'll return a mock project structure
const projectFiles = {
  'README.md': '# My AI Game Project\n\nThis is an awesome game built with AI!',
  'package.json': JSON.stringify({
    name: 'ai-game-project',
    version: '1.0.0',
    scripts: {
      start: 'node server.js'
    },
    dependencies: {
      'express': '^4.18.0'
    }
  }, null, 2),
  'server.js': 'const express = require(\'express\');\nconst app = express();\n\napp.get(\'/\', (req, res) => {\n  res.send(\'Hello, AI Game!\');\n});\n\napp.listen(3000, () => {\n  console.log(\'Server running on port 3000\');\n});'
};

// In a real implementation, you would create a zip file and return it
// For this example, we'll return the files as JSON
return new Response(JSON.stringify(projectFiles), {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="project-files.json"'
  },
});
  },
}
