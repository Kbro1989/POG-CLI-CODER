import * as vscode from 'vscode';
import { VibeViewerProvider } from './VibeViewerProvider';
import { VibeWSClient } from './wsClient';

let wsClient: VibeWSClient | null = null;

export function activate(context: vscode.ExtensionContext): void {
	console.log('POG-CODER-VIBE is now active!');

	const provider = new VibeViewerProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(VibeViewerProvider.viewType, provider)
	);

	// Connect to local orchestrator (port 8765 by default)
	wsClient = new VibeWSClient(
		8765,
		{
			onPreviewStart: (url: string, type: 'web' | 'terminal') => provider.setPreviewUrl(url, type),
			onState: (state: any) => console.log('Vibe State received', state),
			onLog: (log: any) => provider.addLog(log),
			onFeedbackRequested: (msg: string) => provider.pauseForFeedback(msg),
			onExit: (data: any) => provider.addLog({ projectName: data.projectName, stream: 'system', text: `[SYSTEM] Process exited with code ${data.code}` })
		}
	);
	wsClient.connect();

	// Receive feedback FROM webview and send to Orchestrator
	provider.onDidReceiveFeedback((feedback: string) => {
		wsClient?.sendFeedback(feedback);
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('vibe.refresh', () => {
			provider.refresh();
		})
	);

	context.subscriptions.push({
		dispose: () => wsClient?.dispose()
	});
}

export function deactivate(): void {
	wsClient?.dispose();
}
