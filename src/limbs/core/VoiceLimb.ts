import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { join } from 'path';
import pino from 'pino';
import {
    NeuralLimb,
    Intent,
    Execution
} from './NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';

const unlinkAsync = promisify(fs.unlink);

const logger = pino({ name: 'VoiceLimb' });

export class VoiceLimb implements NeuralLimb {
    readonly id = 'voice_limb';
    readonly type = 'creative' as const;
    readonly capabilities = ['transcribe_mic', 'speak_text', 'whisper_transcribe', 'wake_word_listen'];

    constructor(
        private readonly config: VibeConfig,
        private readonly modelExecutor: ModelExecutor
    ) { }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        return (
            prompt.includes('voice') ||
            prompt.includes('transcribe') ||
            prompt.includes('listen') ||
            prompt.includes('mic') ||
            prompt.includes('speak') ||
            prompt.includes('say')
        );
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        const prompt = intent.prompt.toLowerCase();

        if (prompt.includes('transcribe') || prompt.includes('listen') || prompt.includes('voice')) {
            return this.handleTranscription();
        }

        // TTS: Extract text after "speak" or "say"
        const speakMatch = prompt.match(/(?:speak|say)\s+["']?(.+?)["']?$/i);
        if (speakMatch) {
            const text = speakMatch[1] ?? '';
            const result = await this.speakText(text);
            if (result.ok) {
                return { ok: true, value: { output: `Spoke: "${text}"`, data: { spoken: text } } };
            }
            return { ok: false, error: result.error };
        }

        return { ok: false, error: new Error('Unsupported voice intent') };
    }

    getTools() {
        return [
            {
                name: 'transcribe_mic',
                description: 'Record 5 seconds of audio from the microphone and transcribe it to text.',
                parameters: {
                    type: 'object',
                    properties: {
                        duration: { type: 'number', description: 'Duration in seconds (default 5)' }
                    }
                }
            },
            {
                name: 'speak_text',
                description: 'Speaks the given text aloud using Windows SAPI text-to-speech.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'The text to speak aloud' }
                    },
                    required: ['text']
                }
            },
            {
                name: 'whisper_transcribe',
                description: 'Transcribe audio using Cloudflare Workers AI Whisper model (@cf/openai/whisper).',
                parameters: {
                    type: 'object',
                    properties: {
                        audioBase64: { type: 'string', description: 'Base64-encoded audio data (WAV/MP3/WEBM)' },
                        audioPath: { type: 'string', description: 'Path to local audio file (alternative to base64)' }
                    }
                }
            },
            {
                name: 'wake_word_listen',
                description: 'Listen for a wake word (e.g., "Hey Vibe") and trigger transcription when detected. This is a shim that simulates continuous listening.',
                parameters: {
                    type: 'object',
                    properties: {
                        wakeWord: { type: 'string', description: 'The wake word to listen for (default: "hey vibe")' },
                        timeoutSeconds: { type: 'number', description: 'How long to listen before giving up (default: 30)' }
                    }
                }
            }
        ];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        if (name === 'transcribe_mic') {
            const duration = args.duration || 5;
            const res = await this.recordAndTranscribe(duration);
            if (res.ok) return { ok: true, value: { transcription: res.value } };
            return res;
        }
        if (name === 'speak_text') {
            const text = args.text || '';
            const res = await this.speakText(text);
            if (res.ok) return { ok: true, value: { spoken: text } };
            return res;
        }
        if (name === 'whisper_transcribe') {
            let audioBuffer: Buffer;
            if (args.audioBase64) {
                audioBuffer = Buffer.from(args.audioBase64, 'base64');
            } else if (args.audioPath && fs.existsSync(args.audioPath)) {
                audioBuffer = fs.readFileSync(args.audioPath);
            } else {
                return { ok: false, error: new Error('No audio data provided') };
            }
            const res = await this.transcribeWithWhisper(audioBuffer);
            if (res.ok) return { ok: true, value: { transcription: res.value } };
            return res;
        }
        if (name === 'wake_word_listen') {
            const wakeWord = args.wakeWord || 'hey vibe';
            const timeout = args.timeoutSeconds || 30;
            const res = await this.listenForWakeWord(wakeWord, timeout);
            if (res.ok) return { ok: true, value: res.value };
            return res;
        }
        return { ok: false, error: new Error(`Unknown tool: ${name}`) };
    }

    private async handleTranscription(): Promise<Result<Execution>> {
        const res = await this.recordAndTranscribe(5);
        if (!res.ok) return res;

        return {
            ok: true,
            value: {
                output: `Transcription: "${res.value}"`,
                data: { transcription: res.value }
            }
        };
    }

    private async recordAndTranscribe(seconds: number): Promise<Result<string>> {
        const tmpFile = join(this.config.projectRoot, `tmp_rec_${Date.now()}.wav`);

        try {
            logger.info({ tmpFile, seconds }, 'Starting audio recording via PowerShell');

            // PowerShell script to record audio using winmm.dll (MCI)
            const psScript = `
$path = "${tmpFile}"
$code = @"
using System;
using System.Runtime.InteropServices;
namespace Win32 {
    public class AudioRecorder {
        [DllImport("winmm.dll")]
        public static extern int mciSendString(string command, string buffer, int bufferSize, IntPtr hwndCallback);
    }
}
"@
Add-Type -TypeDefinition $code
[Win32.AudioRecorder]::mciSendString("open new type waveaudio alias recsound", $null, 0, [IntPtr]::Zero)
[Win32.AudioRecorder]::mciSendString("record recsound", $null, 0, [IntPtr]::Zero)
Start-Sleep -Seconds ${seconds}
[Win32.AudioRecorder]::mciSendString("save recsound " + $path, $null, 0, [IntPtr]::Zero)
[Win32.AudioRecorder]::mciSendString("close recsound", $null, 0, [IntPtr]::Zero)
`;

            await new Promise((resolve, reject) => {
                const child = spawn('powershell', ['-Command', psScript]);
                child.on('close', (code) => {
                    if (code === 0) resolve(true);
                    else reject(new Error(`PowerShell exited with code ${code}`));
                });
            });

            if (!fs.existsSync(tmpFile)) {
                return { ok: false, error: new Error('Failed to create audio file') };
            }

            const audioBuffer = fs.readFileSync(tmpFile);
            const transcriptionResult = await this.modelExecutor.transcribeAudio(audioBuffer);

            // Cleanup
            await unlinkAsync(tmpFile).catch(() => { });

            return transcriptionResult;
        } catch (error: any) {
            logger.error({ error }, 'Audio capture fail');
            if (fs.existsSync(tmpFile)) await unlinkAsync(tmpFile).catch(() => { });
            return { ok: false, error };
        }
    }

    /**
     * Text-to-Speech using Windows SAPI via PowerShell
     */
    private async speakText(text: string): Promise<Result<void>> {
        if (!text || text.trim().length === 0) {
            return { ok: false, error: new Error('No text provided to speak') };
        }

        try {
            logger.info({ text: text.substring(0, 50) }, 'Speaking text via SAPI');

            // Sanitize text for PowerShell (escape quotes)
            const sanitizedText = text.replace(/"/g, '`"').replace(/'/g, "''");

            const psScript = `
Add-Type -AssemblyName System.speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.Rate = 1
$speak.Speak("${sanitizedText}")
`;

            await new Promise<void>((resolve, reject) => {
                const child = spawn('powershell', ['-Command', psScript]);
                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`PowerShell TTS exited with code ${code}`));
                });
                child.on('error', reject);
            });

            return { ok: true, value: undefined };
        } catch (error: any) {
            logger.error({ error }, 'TTS failed');
            return { ok: false, error };
        }
    }

    /**
     * Transcribe audio using Cloudflare Workers AI Whisper
     * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars
     */
    private async transcribeWithWhisper(audioBuffer: Buffer): Promise<Result<string>> {
        const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] || this.config.cloudflareAccountId;
        const apiToken = process.env['CLOUDFLARE_API_TOKEN'] || this.config.cloudflareApiToken;

        if (!accountId || !apiToken) {
            logger.warn('Cloudflare credentials not configured, falling back to local transcription');
            return this.modelExecutor.transcribeAudio(audioBuffer);
        }

        try {
            logger.info({ size: audioBuffer.length }, 'Transcribing via Cloudflare Whisper');

            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: audioBuffer
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'Whisper API error');
                return { ok: false, error: new Error(`Whisper API error: ${response.status}`) };
            }

            const result = await response.json() as { result?: { text?: string } };
            const transcription = result.result?.text || '';

            logger.info({ transcription: transcription.substring(0, 50) }, 'Whisper transcription complete');
            return { ok: true, value: transcription };
        } catch (error: any) {
            logger.error({ error }, 'Whisper transcription failed');
            return { ok: false, error };
        }
    }

    /**
     * Wake Word Listener Shim
     * Repeatedly transcribes short audio clips and checks for the wake word.
     */
    private async listenForWakeWord(
        wakeWord: string,
        timeoutSeconds: number
    ): Promise<Result<{ detected: boolean; transcription?: string }>> {
        logger.info({ wakeWord, timeoutSeconds }, 'Starting wake word listener');

        const normalizedWakeWord = wakeWord.toLowerCase().trim();
        const startTime = Date.now();
        const maxDuration = timeoutSeconds * 1000;

        while (Date.now() - startTime < maxDuration) {
            // Record a short clip (2 seconds)
            const result = await this.recordAndTranscribe(2);

            if (result.ok && result.value) {
                const transcript = result.value.toLowerCase();

                if (transcript.includes(normalizedWakeWord)) {
                    logger.info({ transcript }, 'Wake word detected!');

                    // Once detected, record a longer clip for the actual command
                    const commandResult = await this.recordAndTranscribe(5);

                    const response: { detected: boolean; transcription?: string } = { detected: true };
                    if (commandResult.ok && commandResult.value) {
                        response.transcription = commandResult.value;
                    }
                    return { ok: true, value: response };
                }
            }

            // Small delay between checks
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        logger.info('Wake word listener timed out');
        return { ok: true, value: { detected: false } };
    }
}
