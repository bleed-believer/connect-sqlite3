import type { RunResult } from 'better-sqlite3';

export interface SQLite3Object {
    run<P extends unknown[]>(query: string, ...args: P): RunResult;
    get<P extends unknown[], T>(query: string, ...args: P): T | undefined;
    all<P extends unknown[], T>(query: string, ...args: P): T[];
    transaction<T>(callback: () => T): T;
}