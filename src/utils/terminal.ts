/**
 * Terminal Utility - Descriptive Selection & Ternary Logic
 * 
 * Implements high-fidelity terminal interactions using raw readline.
 * Follows the POG project's ternary decision pattern (-1, 0, +1).
 */

import readline from 'readline';
import chalk from 'chalk';

export interface SelectionItem<T> {
    readonly value: T;
    readonly label: string;
    readonly description?: string;
}

/**
 * Descriptive Radio Button Selection
 * 
 * Uses ternary logic for state management:
 * - -1: Selection Cancelled
 * -  0: Active Selection In Progress
 * - +1: Selection Confirmed
 */
export async function select<T>(
    title: string,
    items: SelectionItem<T>[],
    initialIndex = 0
): Promise<T | null> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    let activeIndex = initialIndex;
    let state: -1 | 0 | 1 = 0; // Ternary state
    void state; // Mark as used for TSC

    return new Promise((resolve) => {
        const render = () => {
            // Move cursor to start of section
            readline.cursorTo(process.stdout, 0);
            readline.clearScreenDown(process.stdout);

            process.stdout.write(`${chalk.bold(title)}\n\n`);

            items.forEach((item, index) => {
                const isSelected = index === activeIndex;
                const prefix = isSelected ? chalk.green(' ● ') : ' ○ ';
                const label = isSelected ? chalk.green(item.label) : item.label;

                process.stdout.write(`${prefix}${label}\n`);
                if (item.description) {
                    process.stdout.write(`    ${chalk.gray(item.description)}\n`);
                }
            });

            process.stdout.write(`\n${chalk.gray('(Use arrow keys to navigate, Enter to select, Esc/q to cancel)')}\n`);
        };

        const cleanup = () => {
            rl.close();
            process.stdin.removeListener('keypress', handleKey);
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
        };

        const handleKey = (_str: string, key: { name: string; ctrl: boolean }) => {
            if (key.ctrl && key.name === 'c') {
                state = -1;
                cleanup();
                resolve(null);
                return;
            }

            switch (key.name) {
                case 'up':
                    activeIndex = (activeIndex - 1 + items.length) % items.length;
                    render();
                    break;
                case 'down':
                    activeIndex = (activeIndex + 1) % items.length;
                    render();
                    break;
                case 'return': {
                    state = 1;
                    const item = items[activeIndex];
                    cleanup();
                    resolve(item ? item.value : null);
                    break;
                }
                case 'escape':
                case 'q':
                    state = -1;
                    cleanup();
                    resolve(null);
                    break;
            }
        };

        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on('keypress', handleKey);

        render();
    });
}

/**
 * Utility to strip ANSI codes for length calculation
 */
function stripAnsi(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Draws a professional box with a title and content
 */
export function drawBox(title: string, content: string[], width?: number): void {
    const terminalWidth = process.stdout.columns || 80;
    const boxWidth = width || Math.min(terminalWidth - 2, 80);
    const border = '─'.repeat(boxWidth - 2);
    const innerWidth = boxWidth - 4;

    process.stdout.write(chalk.cyan(`┌${border}┐\n`));

    // Title Line
    const visibleTitle = stripAnsi(title);
    const titlePadding = ' '.repeat(Math.max(0, innerWidth - visibleTitle.length));
    process.stdout.write(chalk.cyan(`│ `) + chalk.bold.white(title) + titlePadding + chalk.cyan(` │\n`));

    process.stdout.write(chalk.cyan(`├${border}┤\n`));

    content.forEach(line => {
        // Handle multiline wrapping
        const visibleLine = stripAnsi(line);
        if (visibleLine.length > innerWidth) {
            const chunks = line.match(new RegExp(`.{1,${innerWidth}}`, 'g')) || [line];
            chunks.forEach(chunk => {
                const visibleChunk = stripAnsi(chunk);
                const padding = ' '.repeat(Math.max(0, innerWidth - visibleChunk.length));
                process.stdout.write(chalk.cyan(`│ `) + chunk + padding + chalk.cyan(` │\n`));
            });
        } else {
            const padding = ' '.repeat(Math.max(0, innerWidth - visibleLine.length));
            process.stdout.write(chalk.cyan(`│ `) + line + padding + chalk.cyan(` │\n`));
        }
    });

    process.stdout.write(chalk.cyan(`└${border}┘\n`));
}

/**
 * Draws a chat-style message bubble
 */
export function drawMessage(role: 'USER' | 'POG' | 'SYSTEM', text: string, width = 70): void {
    const color = role === 'USER' ? chalk.blue : role === 'POG' ? chalk.green : chalk.yellow;
    const label = role === 'USER' ? '👤 YOU' : role === 'POG' ? '🤖 POG' : '⚙️  SYS';

    process.stdout.write(`\n${color.bold(label)}:\n`);
    const maxWidth = Math.min(process.stdout.columns - 4 || width, width);
    const wrapped = text.match(new RegExp(`.{1,${maxWidth}}`, 'g')) || [text];
    wrapped.forEach(line => {
        process.stdout.write(`${line}\n`);
    });
}

/**
 * Draws a professional Sovereign Status Report (Table)
 */
export function drawSovereignReport(title: string, data: Record<string, string | number>): void {
    const entries = Object.entries(data);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 0);
    const content = entries.map(([k, v], i) => {
        const key = chalk.cyan(k.padEnd(maxKeyLen));
        const value = i % 2 === 0 ? chalk.white(v) : chalk.gray(v);
        return `${chalk.gray('  ● ')}${key} ${chalk.gray('➜')} ${value}`;
    });

    drawBox(`👑 ${title}`, content);
}

/**
 * Renders the persistent Sovereign Status Line at the bottom of the screen
 */
export function drawSovereignFooter(stats: {
    substrate: string;
    extension: string;
    edge: string;
    session: string;
    errors: number;
}): void {
    const width = process.stdout.columns || 80;
    const substrateColor = stats.substrate.includes('ACTIVE') ? chalk.green : chalk.red;
    const extColor = stats.extension === 'ACTIVE' ? chalk.green : chalk.red;
    const edgeColor = stats.edge === 'ACTIVE' ? chalk.green : chalk.red;
    const errorColor = stats.errors > 0 ? chalk.bold.red : chalk.gray;

    const line = [
        chalk.cyan('🏰 ') + substrateColor(stats.substrate.split(' ')[0]),
        chalk.cyan('🔌 ') + extColor(stats.extension),
        chalk.cyan('🌩️ ') + edgeColor(stats.edge),
        chalk.cyan('💾 ') + chalk.gray(stats.session.substring(0, 8)),
        stats.errors > 0 ? errorColor(`\u2716 ${stats.errors} ERRORS (Ctrl+F12)`) : chalk.gray('✔ READY')
    ].join(chalk.gray(' | '));

    const visibleLine = stripAnsi(line);
    const padding = ' '.repeat(Math.max(0, width - visibleLine.length - 2));

    // Use absolute positioning if possible, but for simple REPL we just print
    process.stdout.write(`\n${chalk.bgBlack.white(' ')}${line}${padding}${chalk.bgBlack.white(' ')}\n`);
}

/**
 * Renders the collapsed/detailed reports panel
 */
export function drawDetailedReports(reports: { type: string, content: string }[]): void {
    if (reports.length === 0) {
        drawBox('📋 DETAILED REPORTS', [chalk.gray('No reports captured.')]);
        return;
    }

    const content = reports.map(r => {
        const icon = r.type === 'error' ? chalk.red('✖') : chalk.blue('ℹ');
        const color = r.type === 'error' ? chalk.red : chalk.white;
        return `${icon} ${chalk.bold(r.type.toUpperCase())}: ${color(r.content)}`;
    });

    drawBox('📋 DETAILED REPORTS (Ctrl+F12 to close)', content);
}
