import type { SessionData } from 'express-session';
import type { Options } from 'better-sqlite3';

import { sanitizeTableName } from './sanitize-table-name.js';
import { SQLite3Session } from './sqlite3-session.js';
import { SessionParser } from '../session-parser/index.js';
import Database from 'better-sqlite3';

/**
 * Low-level data access layer over a `better-sqlite3` database, storing
 * `express-session` sessions in a single table. All values are
 * serialized/deserialized through {@link SessionParser}.
 */
export class SessionTable {
    #sqlite3: SQLite3Session;

    /**
     * @param target - Path to the SQLite database file (or a `Buffer`),
     * forwarded to `better-sqlite3`'s `Database` constructor.
     * @param tableName - Name of the table used to store sessions.
     * @param options - Optional `better-sqlite3` connection options.
     */
    constructor(target: string | Buffer, tableName: string, options?: Options) {
        this.#sqlite3 = new SQLite3Session(
            new Database(target, options),
            sanitizeTableName(tableName)
        );
    }

    getLength(): number {
        const raw = this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();
            return this.#sqlite3.getLengthStatement().get();
        });

        return raw?.count ?? 0;
    }
    
    getAll(): SessionData[] {
        const raw = this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();
            return this.#sqlite3.getAllStatement().all();
        });

        return raw.map(x => SessionParser.parse(x));
    }
    
    get(sid: string): SessionData | null {
        const raw = this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();
            return this.#sqlite3.getStatement().get(sid);
        });

        return raw
        ?   SessionParser.parse(raw)
        :   null;
    }

    set(sid: string, sessionData: SessionData): void {
        const raw = SessionParser.serialize(sessionData);
        const arg = [
            raw.path,
            raw.json,
            raw.domain,
            raw.signed,
            raw.secure,
            raw.expires,
            raw.httpOnly,
            raw.sameSite,
            raw.priority,
            raw.partitioned,
            raw.originalMaxAge,
            sid
        ] as const;

        this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();

            const { exists } = this.#sqlite3
                .getExistsStatement()
                .get(sid) ?? { exists: 0 };

            if (exists === 1) {
                this.#sqlite3.updateStatement().run(...arg);
            } else {
                this.#sqlite3.insertStatement().run(...arg);
            }
        });
    }

    clear(): void {
        this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();
            this.#sqlite3.clearStatement().run();
        });
    }

    delete(sid: string): void {
        this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();
            this.#sqlite3.deleteStatement().run(sid);
        });
    }

    touch(sid: string, sessionData: SessionData): void {
        const raw = SessionParser.serialize(sessionData);
        this.#sqlite3.transaction(() => {
            this.#sqlite3.createStatement().run();
            this.#sqlite3.clearExpiredStatement().run();

            const { exists } = this.#sqlite3
                .getExistsStatement()
                .get(sid) ?? { exists: 0 };

            if (exists === 1) {
                this.#sqlite3.updateStatement().run(
                    raw.path,
                    raw.json,
                    raw.domain,
                    raw.signed,
                    raw.secure,
                    raw.expires,
                    raw.httpOnly,
                    raw.sameSite,
                    raw.priority,
                    raw.partitioned,
                    raw.originalMaxAge,
                    sid
                );
            }
        });
    }
}