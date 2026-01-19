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
export function drawBox(title: string, content: string[], width = 80): void {
    const border = '─'.repeat(width - 2);
    const innerWidth = width - 4;

    process.stdout.write(chalk.cyan(`┌${border}┐\n`));

    // Title Line
    const visibleTitle = stripAnsi(title);
    const titlePadding = ' '.repeat(Math.max(0, innerWidth - visibleTitle.length));
    process.stdout.write(chalk.cyan(`│ `) + chalk.bold.white(title) + titlePadding + chalk.cyan(` │\n`));

    process.stdout.write(chalk.cyan(`├${border}┤\n`));

    content.forEach(line => {
        // We don't wrap yet to keep it simple, or we wrap carefully.
        // For now, let's just fix the padding.
        const visibleLine = stripAnsi(line);
        const padding = ' '.repeat(Math.max(0, innerWidth - visibleLine.length));
        process.stdout.write(chalk.cyan(`│ `) + line + padding + chalk.cyan(` │\n`));
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
    // Basic wrap for messages (uncolored text usually)
    const wrapped = text.match(new RegExp(`.{1,${width}}`, 'g')) || [text];
    wrapped.forEach(line => {
        process.stdout.write(`${line}\n`);
    });
}
