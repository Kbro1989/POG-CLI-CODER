import { BaseLimb } from './BaseLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { join } from 'path';

const unlinkAsync = promisify(fs.unlink);

/**
 * VoiceLimb - Audio and Speech Intelligence for Sovereign AI
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class VoiceLimb extends BaseLimb {
    readonly id = 'voice_limb';
    readonly type = 'creative' as const;

    constructor(
        config: VibeConfig,
        private readonly modelExecutor: ModelExecutor
    ) {
        super(config);
        this.registerVoiceTools();
    }

    private registerVoiceTools(): void {
        this.registerTools([
            {
                name: 'transcribe_mic',
                description: 'Record 5 seconds of audio from the microphone and transcribe it to text.',
                parameters: {
                    type: 'object',
                    properties: {
                        duration: { type: 'number', description: 'Duration in seconds (default 5)' }
                    }
                },
                handler: async (args: any) => {
                    const res = await this.recordAndTranscribe(args['duration'] || 5);
                    if (res.ok) return { ok: true, value: { transcription: res.value } };
                    return res;
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
                },
                handler: async (args: any) => {
                    const res = await this.speakText(args['text'] || '');
                    if (res.ok) return { ok: true, value: { spoken: args['text'] } };
                    return res;
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
                },
                handler: async (args: any) => {
                    let audioBuffer: Buffer;
                    if (args['audioBase64']) {
                        audioBuffer = Buffer.from(args['audioBase64'], 'base64');
                    } else if (args['audioPath'] && fs.existsSync(args['audioPath'])) {
                        audioBuffer = fs.readFileSync(args['audioPath']);
                    } else {
                        return { ok: false, error: new Error('No audio data provided') };
                    }
                    const res = await this.transcribeWithWhisper(audioBuffer);
                    if (res.ok) return { ok: true, value: { transcription: res.value } };
                    return res;
                }
            },
            {
                name: 'wake_word_listen',
                description: 'Listen for a wake word (e.g., "Hey Vibe") and trigger transcription when detected.',
                parameters: {
                    type: 'object',
                    properties: {
                        wakeWord: { type: 'string', description: 'The wake word to listen for (default: "hey vibe")' },
                        timeoutSeconds: { type: 'number', description: 'How long to listen before giving up (default: 30)' }
                    }
                },
                handler: async (args: any) => {
                    const res = await this.listenForWakeWord(args['wakeWord'] || 'hey vibe', args['timeoutSeconds'] || 30);
                    if (res.ok) return { ok: true, value: res.value };
                    return res;
                }
            }
        ]);
    }

    private async recordAndTranscribe(seconds: number): Promise<Result<string>> {
        const tmpFile = join(this.config.projectRoot, `tmp_rec_${Date.now()}.wav`);
        try {
            this.logger.info({ tmpFile, seconds }, 'Starting audio recording via PowerShell');
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

            if (!fs.existsSync(tmpFile)) return { ok: false, error: new Error('Failed to create audio file') };
            const audioBuffer = fs.readFileSync(tmpFile);
            const transcriptionResult = await this.modelExecutor.transcribeAudio(audioBuffer);
            await unlinkAsync(tmpFile).catch(() => { });
            return transcriptionResult;
        } catch (error: any) {
            this.logger.error({ error }, 'Audio capture fail');
            if (fs.existsSync(tmpFile)) await unlinkAsync(tmpFile).catch(() => { });
            return { ok: false, error };
        }
    }

    private async speakText(text: string): Promise<Result<void>> {
        if (!text || text.trim().length === 0) return { ok: false, error: new Error('No text provided to speak') };
        try {
            this.logger.info({ text: text.substring(0, 50) }, 'Speaking text via SAPI');
            const sanitizedText = text.replace(/"/g, '`"').replace(/'/g, "''");
            const psScript = `Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = 1; $speak.Speak("${sanitizedText}")`;
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
            this.logger.error({ error }, 'TTS failed');
            return { ok: false, error };
        }
    }

    private async transcribeWithWhisper(audioBuffer: Buffer): Promise<Result<string>> {
        const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] || this.config.cloudflareAccountId;
        const apiToken = process.env['CLOUDFLARE_API_TOKEN'] || this.config.cloudflareApiToken;
        if (!accountId || !apiToken) return this.modelExecutor.transcribeAudio(audioBuffer);

        try {
            const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/octet-stream' },
                body: audioBuffer
            });
            if (!response.ok) return { ok: false, error: new Error(`Whisper API error: ${response.status}`) };
            const result = await response.json() as { result?: { text?: string } };
            return { ok: true, value: result.result?.text || '' };
        } catch (error: any) {
            this.logger.error({ error }, 'Whisper transcription failed');
            return { ok: false, error };
        }
    }

    private async listenForWakeWord(wakeWord: string, timeoutSeconds: number): Promise<Result<{ detected: boolean; transcription?: string }>> {
        this.logger.info({ wakeWord, timeoutSeconds }, 'Starting wake word listener');
        const normalizedWakeWord = wakeWord.toLowerCase().trim();
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutSeconds * 1000) {
            const result = await this.recordAndTranscribe(2);
            if (result.ok && result.value?.toLowerCase().includes(normalizedWakeWord)) {
                this.logger.info('Wake word detected!');
                const commandResult = await this.recordAndTranscribe(5);
                const finalResult: { detected: boolean; transcription?: string } = { detected: true };
                if (commandResult.ok && commandResult.value) {
                    finalResult.transcription = commandResult.value;
                }
                return { ok: true, value: finalResult };
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return { ok: true, value: { detected: false } };
    }
}
