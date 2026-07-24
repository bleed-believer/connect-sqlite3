import type { Database, RunResult } from 'better-sqlite3';
import type { SQLite3Object } from './interfaces/index.js';

import SQLite3Database from 'better-sqlite3';

export class SQLite3Base implements SQLite3Object {
    #database: Database;

    constructor(target: string | Buffer, verbose?: boolean) {
        this.#database = new SQLite3Database(target, {
            verbose(message, ...args) {
                if (verbose) {
                    console.info(message, args);
                }
            }
        });
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
}