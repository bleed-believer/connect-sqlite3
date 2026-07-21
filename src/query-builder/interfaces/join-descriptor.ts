export interface JoinDescriptor {
    type: 'inner' | 'left' | 'right' | 'full';
    target: string;
    alias?: string;
    /** SQL boolean expression for the `ON` clause, using `?` placeholders for parameters. */
    on: string;
    /** Values bound to the `?` placeholders in `on`, in order. */
    parameters?: unknown[];
}