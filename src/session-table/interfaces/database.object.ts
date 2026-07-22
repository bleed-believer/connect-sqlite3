/**
 * Minimal subset of the `better-sqlite3` `Database` API consumed by
 * {@link SessionTable}. Exists so a fake/in-memory implementation can be
 * injected in place of a real database instance for testing.
 */
export interface DatabaseObject {
    /**
     * Prepares a SQL statement for execution.
     *
     * @param query - The SQL statement to prepare.
     * @returns A prepared statement exposing `get`, `all`, and `run`.
     */
    prepare<P extends unknown[], T>(query: string): {
        /** Executes the statement and returns the first resulting row, if any. */
        get(...p: P): T | undefined;
        /** Executes the statement and returns all resulting rows. */
        all(...p: P): T[];
        /** Executes the statement without returning any rows (e.g. INSERT/UPDATE/DELETE/DDL). */
        run(...p: P): void;
    };
}