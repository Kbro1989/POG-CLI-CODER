/**
 * @license
 * POG-CODER-VIBE
 * Composite Routing Strategy (Chain of Responsibility)
 * Adapted from Google's gemini-cli patterns
 */

import type { RoutingContext, RoutingDecision, RoutingStrategy, TerminalStrategy } from '../types.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * A strategy that attempts a list of child strategies in order (Chain of Responsibility).
 * Each strategy can return null to pass control to the next strategy.
 * The last strategy must be terminal (guaranteed to return a decision).
 */
export class CompositeStrategy implements TerminalStrategy {
    readonly name: string;
    private strategies: [...RoutingStrategy[], TerminalStrategy];
    private logger: Logger;

    /**
     * Initializes the CompositeStrategy.
     * 
     * @param strategies The strategies to try, in order of priority. The last strategy MUST be terminal.
     * @param name The name of this composite configuration (e.g., 'ternary-router', 'composite')
     */
    constructor(
        strategies: [...RoutingStrategy[], TerminalStrategy],
        name: string = 'composite',
    ) {
        if (strategies.length === 0) {
            throw new Error('CompositeStrategy requires at least one strategy');
        }

        this.strategies = strategies;
        this.name = name;
        this.logger = pino({ name: `CompositeStrategy:${name}` });
    }

    async route(context: RoutingContext): Promise<RoutingDecision> {
        const startTime = performance.now();

        // Separate non-terminal strategies from the terminal one for type safety
        const nonTerminalStrategies = this.strategies.slice(0, -1) as RoutingStrategy[];
        const terminalStrategy = this.strategies[this.strategies.length - 1] as TerminalStrategy;

        // Try non-terminal strategies, allowing them to fail gracefully
        for (const strategy of nonTerminalStrategies) {
            try {
                this.logger.debug({ strategy: strategy.name }, 'Trying routing strategy');
                const decision = await strategy.route(context);

                if (decision) {
                    this.logger.info(
                        {
                            strategy: strategy.name,
                            model: decision.model,
                            latencyMs: decision.metadata.latencyMs
                        },
                        'Strategy matched'
                    );
                    return this.finalizeDecision(decision, startTime);
                }

                this.logger.debug({ strategy: strategy.name }, 'Strategy declined (returned null)');
            } catch (error) {
                this.logger.warn(
                    { strategy: strategy.name, error },
                    'Strategy failed with error, continuing to next strategy'
                );
            }
        }

        // If no other strategy matched, execute the terminal strategy
        try {
            this.logger.debug({ strategy: terminalStrategy.name }, 'Executing terminal strategy');
            const decision = await terminalStrategy.route(context);

            this.logger.info(
                {
                    strategy: terminalStrategy.name,
                    model: decision.model,
                    latencyMs: decision.metadata.latencyMs
                },
                'Terminal strategy executed'
            );

            return this.finalizeDecision(decision, startTime);
        } catch (error) {
            this.logger.error(
                { strategy: terminalStrategy.name, error },
                'CRITICAL: Terminal strategy failed - routing cannot proceed'
            );
            throw new Error(
                `CompositeStrategy critical failure: Terminal strategy '${terminalStrategy.name}' failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Enhances the decision metadata with composite information.
     */
    private finalizeDecision(
        decision: RoutingDecision,
        startTime: number,
    ): RoutingDecision {
        const endTime = performance.now();
        const compositeSource = `${this.name}/${decision.metadata.source}`;

        // Use the child's latency if it's meaningful (non-zero),
        // otherwise use total time spent in composite strategy
        const latency = decision.metadata.latencyMs || (endTime - startTime);

        return {
            ...decision,
            metadata: {
                ...decision.metadata,
                source: compositeSource,
                latencyMs: Math.round(latency),
            },
        };
    }
}
