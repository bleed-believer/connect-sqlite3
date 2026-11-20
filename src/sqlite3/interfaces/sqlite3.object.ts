import type { RunResult, Statement } from 'better-sqlite3';

export interface SQLite3Object {
    /**
     * Compiles `query` once, so the returned statement can be executed
     * many times without parsing the SQL again.
     */
    prepare<P extends unknown[], T = unknown>(query: string): Statement<P, T>;
    run<P extends unknown[]>(query: string, ...args: P): RunResult;
    get<P extends unknown[], T>(query: string, ...args: P): T | undefined;
    all<P extends unknown[], T>(query: string, ...args: P): T[];
    transaction<T>(callback: () => T): T;
}
