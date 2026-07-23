import type { Statement } from './statement.object.js';

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
    prepare<P extends unknown[], T>(query: string): Statement<P, T>;

    transaction<P extends unknown[], T>(callback: (...p: P) => T): (...p: P) => T;
}