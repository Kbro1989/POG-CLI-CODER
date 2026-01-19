import * as vscode from 'vscode';
import { WebSocket } from 'ws';

export class VibeWSClient {
    private ws: WebSocket | null = null;
    private retryCount = 0;
    private readonly maxRetries = 10;

    constructor(
        private readonly port: number,
        private readonly callbacks: {
            onPreviewStart: (url: string, type: 'web' | 'terminal') => void;
            onState: (state: any) => void;
            onLog: (log: any) => void;
            onFeedbackRequested: (message: string) => void;
            onExit: (data: any) => void;
        }
    ) { }

    connect(): void {
        const url = `ws://localhost:${this.port}`;
        console.log(`[VibeWS] Connecting to ${url}...`);

        try {
            this.ws = new WebSocket(url);

            this.ws.on('open', () => {
                console.log('[VibeWS] Connected');
                this.retryCount = 0;
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    switch (message.type) {
                        case 'previewStarted':
                            this.callbacks.onPreviewStart(message.data.url, message.data.type || 'web');
                            break;
                        case 'preview_log':
                            this.callbacks.onLog(message.data);
                            break;
                        case 'preview_exit':
                            this.callbacks.onExit(message.data);
                            break;
                        case 'awaitingFeedback':
                            this.callbacks.onFeedbackRequested(message.data.message);
                            break;
                        case 'state':
                            this.callbacks.onState(message.data);
                            break;
                    }
                } catch (e) {
                    console.error('[VibeWS] Failed to parse message', e);
                }
            });

            this.ws.on('close', () => {
                console.log('[VibeWS] Connection closed');
                this.reconnect();
            });

            this.ws.on('error', (err) => {
                console.error('[VibeWS] Error', err);
                this.ws?.close();
            });

        } catch (e) {
            console.error('[VibeWS] Connection failed', e);
            this.reconnect();
        }
    }

    public sendFeedback(text: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'user_feedback', data: text }));
        }
    }

    private reconnect(): void {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`[VibeWS] Retrying in 5s (Attempt ${this.retryCount}/${this.maxRetries})...`);
            setTimeout(() => this.connect(), 5000);
        }
    }

    dispose(): void {
        this.ws?.close();
    }
}
