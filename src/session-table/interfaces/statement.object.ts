export interface Statement<P extends unknown[], T> {
    /** Executes the statement and returns the first resulting row, if any. */
    get(...p: P): T | undefined;
    /** Executes the statement and returns all resulting rows. */
    all(...p: P): T[];
    /** Executes the statement without returning any rows (e.g. INSERT/UPDATE/DELETE/DDL). */
    run(...p: P): void;
}