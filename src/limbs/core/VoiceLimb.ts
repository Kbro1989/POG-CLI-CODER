import { BaseLimb } from './BaseLimb.js';
import { z } from 'zod';
import { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { YaoState } from '../../core/HexagramManager.js';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { join } from 'path';
import type { Intent, TernaryDecision } from './NeuralLimb.js';

const unlinkAsync = promisify(fs.unlink);

/**
 * VoiceLimb - Audio and Speech Intelligence for Sovereign AI
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class VoiceLimb extends BaseLimb {
    readonly id = 'voice_limb';
    readonly type = 'creative' as const;
    private readonly activeProcesses: Set<ChildProcess> = new Set();

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
                schema: z.object({
                    duration: z.number().optional().default(5)
                }),
                handler: async (args: Record<string, unknown>) => {
                    const duration = (args['duration'] as number) || 5;
                    this.logger.info({ duration }, 'Manual mic transcription request');
                    const res = await this.recordAndTranscribe(duration);
                    if (res.ok) {
                        await this.pinPulse(YaoState.YoungYang, 'Speech Captured');
                        return { ok: true, value: { transcription: res.value } };
                    }
                    await this.pinPulse(YaoState.YoungYin, 'Speech Capture Failed');
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
                schema: z.object({
                    text: z.string()
                }),
                handler: async (args: Record<string, unknown>) => {
                    const text = args['text'] as string;
                    const res = await this.speakText(text || '');
                    if (res.ok) {
                        await this.pinPulse(YaoState.OldYang, 'Speech Emitted');
                        return { ok: true, value: { spoken: text } };
                    }
                    await this.pinPulse(YaoState.OldYin, 'Speech Emission Failed');
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
                handler: async (args: Record<string, unknown>) => {
                    const audioBase64 = args['audioBase64'] as string | undefined;
                    const audioPath = args['audioPath'] as string | undefined;

                    let audioBuffer: Buffer;
                    if (audioBase64) {
                        audioBuffer = Buffer.from(audioBase64, 'base64');
                    } else if (audioPath && fs.existsSync(audioPath)) {
                        audioBuffer = fs.readFileSync(audioPath);
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
                handler: async (args: Record<string, unknown>) => {
                    const wakeWord = (args['wakeWord'] as string) || 'hey vibe';
                    const timeoutSeconds = (args['timeoutSeconds'] as number) || 30;
                    const res = await this.listenForWakeWord(wakeWord, timeoutSeconds);
                    if (res.ok) return { ok: true, value: res.value };
                    return res;
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = this.getUserIntent(intent).toLowerCase();

        // 'Yang' (Escalate / Optimal): Explicit voice or speech triggers
        if (p.includes('voice') || p.includes('speak') || p.includes('transcribe') || p.includes('record')) {
            return 'Yang';
        }

        // 'YinYang' (Balanced / Neutral): Match capability keywords but not as direct as 'Yang'
        if (this.spine.getCapabilities().some(cap => p.includes(cap.toLowerCase()))) {
            return 'YinYang';
        }

        // 'Yin' (De-escalate / Skip): No match
        return 'Yin';
    }

    private async recordAndTranscribe(seconds: number): Promise<Result<string>> {
        const tmpFile = join(this.config.projectRoot, `tmp_rec_${Date.now()}.wav`);
        let child: ChildProcess | undefined;
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
            return await new Promise<Result<string>>((resolve) => {
                child = spawn('powershell', ['-Command', psScript]);
                this.activeProcesses.add(child);

                child.on('close', async (code) => {
                    if (child) this.activeProcesses.delete(child);
                    if (code === 0) {
                        if (!fs.existsSync(tmpFile)) {
                            resolve({ ok: false, error: new Error('Failed to create audio file') });
                            return;
                        }
                        const audioBuffer = fs.readFileSync(tmpFile);
                        const transcriptionResult = await this.modelExecutor.transcribeAudio(audioBuffer);
                        await unlinkAsync(tmpFile).catch(() => { });
                        resolve(transcriptionResult);
                    } else {
                        resolve({ ok: false, error: new Error(`PowerShell exited with code ${code}`) });
                    }
                });

                child.on('error', (err) => {
                    if (child) this.activeProcesses.delete(child);
                    resolve({ ok: false, error: err });
                });
            });
        } catch (error: unknown) {
            this.logger.error({ error }, 'Audio capture fail');
            if (fs.existsSync(tmpFile)) await unlinkAsync(tmpFile).catch(() => { });
            return { ok: false, error: error as Error };
        } finally {
            if (child && child.exitCode === null) {
                child.kill();
            }
        }
    }

    private async speakText(text: string): Promise<Result<void>> {
        if (!text || text.trim().length === 0) return { ok: false, error: new Error('No text provided to speak') };
        let child: ChildProcess | undefined;
        try {
            this.logger.info({ text: text.substring(0, 50) }, 'Speaking text via SAPI');
            const sanitizedText = text.replace(/"/g, '`"').replace(/'/g, "''");
            const psScript = `Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = 1; $speak.Speak("${sanitizedText}")`;

            return await new Promise<Result<void>>((resolve) => {
                child = spawn('powershell', ['-Command', psScript]);
                this.activeProcesses.add(child);

                child.on('close', (code) => {
                    if (child) this.activeProcesses.delete(child);
                    if (code === 0) resolve({ ok: true, value: undefined });
                    else resolve({ ok: false, error: new Error(`PowerShell TTS exited with code ${code}`) });
                });

                child.on('error', (err) => {
                    if (child) this.activeProcesses.delete(child);
                    resolve({ ok: false, error: err });
                });
            });
        } catch (error: unknown) {
            this.logger.error({ error }, 'TTS failed');
            return { ok: false, error: error as Error };
        } finally {
            if (child && child.exitCode === null) {
                child.kill();
            }
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
        } catch (error: unknown) {
            this.logger.error({ error }, 'Whisper transcription failed');
            return { ok: false, error: error as Error };
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

    /**
     * Proper Close: Ensures all active PowerShell processes are terminated.
     */
    public override async close(): Promise<void> {
        this.logger.info({ activeProcesses: this.activeProcesses.size }, 'Cleaning up VoiceLimb resources...');
        for (const child of this.activeProcesses) {
            if (child.exitCode === null) {
                child.kill();
            }
        }
        this.activeProcesses.clear();
    }
}
