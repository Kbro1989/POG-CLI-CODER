import * as vscode from 'vscode';

export class VibeViewerProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'vibe.viewer';
	private _view?: vscode.WebviewView;
	private _onDidReceiveFeedback = new vscode.EventEmitter<string>();
	public readonly onDidReceiveFeedback = this._onDidReceiveFeedback.event;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): void {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((data: any) => {
			switch (data.type) {
				case 'refresh':
					{
						vscode.window.showInformationMessage('Refreshing Vibe state...');
						break;
					}
				case 'user-feedback':
					{
						this._onDidReceiveFeedback.fire(data.data);
						break;
					}
			}
		});
	}

	public refresh(): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'refresh' });
		}
	}

	public setPreviewUrl(url: string, outputType: 'web' | 'terminal'): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'preview-set-url', url, outputType });
		}
	}

	public addLog(log: { projectName: string; stream: string; text: string }): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'preview-log', log });
		}
	}

	public pauseForFeedback(message: string): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'await-feedback', message });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Vibe Viewer</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 0; margin: 0; overflow: hidden; background: #1e1e1e; color: #ccc; }
					.header { background: #252526; padding: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
					.status { color: #00ff00; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
					.controls button { background: #333; color: white; border: 1px solid #444; padding: 4px 12px; cursor: pointer; border-radius: 4px; font-size: 11px; }
					.controls button:hover { background: #444; }
					#preview-container { width: 100vw; height: calc(100vh - 40px); background: #fff; position: relative; }
					iframe { width: 100%; height: 100%; border: none; }
					
					/* Log View */
					#log-container { width: 100vw; height: calc(100vh - 40px); background: #000; overflow-y: auto; padding: 10px; box-sizing: border-box; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px; }
					.log-entry { margin-bottom: 2px; line-height: 1.4; border-left: 2px solid transparent; padding-left: 4px; }
					.log-stdout { color: #eee; }
					.log-stderr { color: #ff5555; border-left-color: #ff5555; }
					.log-system { color: #55ff55; font-style: italic; }

					/* Feedback Overlay */
					#feedback-overlay { position: absolute; bottom: 20px; left: 20px; right: 20px; background: rgba(30, 30, 30, 0.95); border: 1px solid #007acc; padding: 15px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 1000; display: none; }
					#feedback-msg { margin-bottom: 10px; color: #007acc; font-weight: bold; font-size: 13px; }
					.feedback-input-group { display: flex; gap: 8px; }
					#feedback-input { flex-grow: 1; background: #252526; border: 1px solid #444; color: white; padding: 6px; border-radius: 4px; }
					#feedback-send { background: #007acc; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; }
					
					.welcome { padding: 40px 20px; text-align: center; }
					.hidden { display: none; }
					h1 { color: #fff; font-size: 18px; margin-bottom: 8px; }
					p { font-size: 13px; color: #888; }
				</style>
			</head>
			<body>
				<div class="header">
					<div id="sys-status" class="status">● System Active</div>
					<div class="controls">
						<button id="home-btn">🏠 Home</button>
						<button id="refresh">🔄 Reset</button>
					</div>
				</div>

				<div id="welcome-screen" class="welcome">
					<h1>🎯 POG-CODER-VIBE</h1>
					<p>Universal Interactive Console</p>
					<div style="margin-top: 60px; color: #555; border: 1px dashed #333; padding: 20px; border-radius: 8px;">
						Awaiting intent deployment...
					</div>
				</div>

				<div id="preview-screen" class="hidden">
					<div id="preview-container">
						<iframe id="preview-iframe" src=""></iframe>
						<div id="log-container" class="hidden"></div>
					</div>
					
					<div id="feedback-overlay">
						<div id="feedback-msg">Awaiting Input...</div>
						<div class="feedback-input-group">
							<input type="text" id="feedback-input" placeholder="Type correction or guidance...">
							<button id="feedback-send">Send Feedback</button>
						</div>
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					const welcome = document.getElementById('welcome-screen');
					const preview = document.getElementById('preview-screen');
					const iframe = document.getElementById('preview-iframe');
					const logs = document.getElementById('log-container');
					const feedbackOverlay = document.getElementById('feedback-overlay');
					const feedbackInput = document.getElementById('feedback-input');
					const feedbackMsg = document.getElementById('feedback-msg');

					function addLog(text, stream) {
						const div = document.createElement('div');
						div.className = 'log-entry log-' + stream;
						div.textContent = text;
						logs.appendChild(div);
						logs.scrollTop = logs.scrollHeight;
					}

					document.getElementById('refresh').addEventListener('click', () => {
						logs.innerHTML = '';
						addLog('[SYSTEM] Console reset.', 'system');
						vscode.postMessage({ type: 'refresh' });
					});

					document.getElementById('home-btn').addEventListener('click', () => {
						welcome.classList.remove('hidden');
						preview.classList.add('hidden');
					});

					document.getElementById('feedback-send').addEventListener('click', () => {
						const val = feedbackInput.value;
						if (val) {
							vscode.postMessage({ type: 'user-feedback', data: val });
							feedbackInput.value = '';
							feedbackOverlay.style.display = 'none';
							addLog('[USER] Feedback sent: ' + val, 'system');
						}
					});

					feedbackInput.addEventListener('keypress', (e) => {
						if (e.key === 'Enter') document.getElementById('feedback-send').click();
					});

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.type) {
							case 'preview-set-url':
								welcome.classList.add('hidden');
								preview.classList.remove('hidden');
								if (message.outputType === 'terminal') {
									iframe.classList.add('hidden');
									logs.classList.remove('hidden');
								} else if (message.url) {
									iframe.src = message.url;
									iframe.classList.remove('hidden');
									logs.classList.add('hidden');
								}
								break;
							case 'preview-log':
								welcome.classList.add('hidden');
								preview.classList.remove('hidden');
								addLog(message.log.text, message.log.stream);
								break;
							case 'await-feedback':
								feedbackOverlay.style.display = 'block';
								feedbackMsg.textContent = message.message;
								feedbackInput.focus();
								break;
						}
					});
				</script>
			</body>
			</html>`;
	}
}
