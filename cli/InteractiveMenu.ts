import readline from 'readline';
import chalk from 'chalk';

interface MenuItem {
    label: string;
    value: string;
    description?: string;
}

export class InteractiveMenu {
    private selectedIndex: number = 0;
    private isActive: boolean = false;
    private resolvePromise: ((value: string | null) => void) | null = null;
    private readonly pageSize: number = 10;

    constructor(
        private items: MenuItem[],
        _rl: any // Unused but passed for API compatibility
    ) { }

    public async show(): Promise<string | null> {
        this.isActive = true;
        this.selectedIndex = 0;

        // Hijack stdin
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        } else {
            // Cannot run interactive menu without TTY
            return null;
        }
        process.stdin.resume();
        readline.emitKeypressEvents(process.stdin);

        process.stdin.on('keypress', this.handleInput);

        // Initial render
        this.render();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    private handleInput = (_str: string, key: readline.Key) => {
        if (!this.isActive) return;

        if (key.name === 'up') {
            this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
            this.render();
        } else if (key.name === 'down') {
            this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
            this.render();
        } else if (key.name === 'return' || key.name === 'enter') {
            this.forceCleanup();
            const selectedItem = this.items[this.selectedIndex];
            if (this.resolvePromise && selectedItem) {
                this.resolvePromise(selectedItem.value);
            }
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
            this.forceCleanup();
            if (this.resolvePromise) {
                this.resolvePromise(null);
            }
        }
    };

    private render(): void {
        const startIdx = Math.max(0, this.selectedIndex - Math.floor(this.pageSize / 2));
        const endIdx = Math.min(this.items.length, startIdx + this.pageSize);

        let output = '\n' + chalk.bold.cyan('⚡ SELECT COMMAND (Arrow Keys + Enter, Esc to cancel)') + '\n';
        output += chalk.gray('──────────────────────────────────────────────────────────────────────────────') + '\n';

        for (let i = startIdx; i < endIdx; i++) {
            const item = this.items[i];
            if (!item) continue;

            if (i === this.selectedIndex) {
                output += chalk.bgBlue.bold.white(` > ${item.label.padEnd(20)} `) +
                    chalk.bgBlue.cyan(` ${item.description || ''} `) + '\n';
            } else {
                output += chalk.white(`   ${item.label.padEnd(20)} `) +
                    chalk.gray(` ${item.description || ''} `) + '\n';
            }
        }

        output += chalk.gray('──────────────────────────────────────────────────────────────────────────────');

        // Clear screen and draw
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        process.stdout.write(output);
    }

    private forceCleanup(): void {
        this.isActive = false;
        process.stdin.removeListener('keypress', this.handleInput);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        // Final screen clear to restore prompt context
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
    }
}
