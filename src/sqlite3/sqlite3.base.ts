import type { Database, RunResult, Statement } from 'better-sqlite3';
import type { SQLite3Object } from './interfaces/index.js';

import SQLite3Database from 'better-sqlite3';

export class SQLite3Base implements SQLite3Object {
    #database: Database;

    /** `true` until {@link close} is called. */
    get open(): boolean {
        return this.#database.open;
    }

    constructor(target: string | Buffer, verbose?: boolean) {
        this.#database = new SQLite3Database(target, {
            verbose(message, ...args) {
                if (verbose) {
                    console.info(message, args);
                }
            }
        });

        // With WAL, readers don't block the writer (nor the other way
        // around), and `synchronous = NORMAL` skips the `fsync` on every
        // commit, which is safe in WAL mode: a power loss can drop the
        // last commits, but never corrupts the database. An in-memory
        // database (`':memory:'` or a `Buffer`) keeps its `memory` journal.
        this.#database.pragma('journal_mode = WAL');
        this.#database.pragma('synchronous = NORMAL');
    }

    prepare<P extends unknown[], T = unknown>(query: string): Statement<P, T> {
        return this.#database.prepare<P, T>(query);
    }

    run<P extends unknown[]>(query: string, ...args: P): RunResult {
        return this.#database
            .prepare<P>(query)
            .run(...args);
    }

    get<P extends unknown[], T>(query: string, ...args: P): T | undefined {
        return this.#database
            .prepare<P, T>(query)
            .get(...args);
    }

    all<P extends unknown[], T>(query: string, ...args: P): T[] {
        return this.#database
            .prepare<P, T>(query)
            .all(...args);
    }

    transaction<T>(callback: () => T): T {
        return this.#database.transaction(callback)();
    }

    /** Closes the database. Calling it again does nothing. */
    close(): void {
        if (this.#database.open) {
            this.#database.close();
        }
    }
}
