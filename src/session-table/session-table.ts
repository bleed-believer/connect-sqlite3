import type { SessionData } from 'express-session';

import { SessionQueries } from './session-queries.js';
import { SessionParser } from '../session-parser/index.js';
import { SQLite3 } from '../sqlite3/index.js';

/**
 * Low-level data access layer over a `better-sqlite3` database, storing
 * `express-session` sessions in a single table. All values are
 * serialized/deserialized through {@link SessionParser}.
 */
export class SessionTable {
    #queries: SessionQueries;
    #sqlite3: SQLite3;

    /**
     * @param sqlite3 - The {@link SQLite3} connection to operate on. Its
     * constructor already ensures the sessions table exists via migrations.
     */
    constructor(sqlite3: SQLite3) {
        this.#sqlite3 = sqlite3;
        this.#queries = new SessionQueries(sqlite3);
    }

    getLength(): number {
        const length = this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            return this.#queries.getLength();
        });

        return length;
    }
    
    getAll(): SessionData[] {
        return this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            return this.#queries.getAll();
        });
    }
    
    get(sid: string): SessionData | null {
        return this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            return this.#queries.get(sid);
        });
    }

    set(sid: string, sessionData: SessionData): void {
        this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            if (this.#queries.getExists(sid)) {
                this.#queries.update(sid, sessionData);
            } else {
                this.#queries.insert(sid, sessionData);
            }
        });
    }

    clear(): void {
        this.#sqlite3.transaction(() => {
            this.#queries.clear();
        });
    }

    delete(sid: string): void {
        this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            this.#queries.delete(sid);
        });
    }

    touch(sid: string, sessionData: SessionData): void {
        this.#sqlite3.transaction(() => {
            this.#queries.clearExpired();
            if (this.#queries.getExists(sid)) {
                this.#queries.update(sid, sessionData);
            }
        });
    }
}