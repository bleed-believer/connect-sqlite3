import type { SerializedSession } from '../session-parser/index.js';
import type { DatabaseObject } from './interfaces/index.js';
import type { SessionData } from 'express-session';
import type { Options } from 'better-sqlite3';

import { sanitizeTableName } from './sanitize-table-name.js';
import { SessionParser } from '../session-parser/index.js';
import Database from 'better-sqlite3';

/**
 * Low-level data access layer over a `better-sqlite3` database, storing
 * `express-session` sessions in a single table. All values are
 * serialized/deserialized through {@link SessionParser}.
 */
export class SessionTable {
    #tableName: string;
    #database: DatabaseObject;

    /**
     * @param target - Path to the SQLite database file (or a `Buffer`),
     * forwarded to `better-sqlite3`'s `Database` constructor.
     * @param tableName - Name of the table used to store sessions.
     * @param options - Optional `better-sqlite3` connection options.
     */
    constructor(target: string | Buffer, tableName: string, options?: Options) {
        this.#tableName = sanitizeTableName(tableName);
        this.#database = new Database(target, options);
    }

    /**
     * Creates the sessions table if it does not already exist.
     */
    createTable(): void {
        const query = `--sql
        CREATE TABLE IF NOT EXISTS [${this.#tableName}](
            [sid]       VARCHAR     PRIMARY KEY,
            [path]      VARCHAR     DEFAULT '/',
            [json]      NVARCHAR    NOT NULL,
            [domain]    VARCHAR     NULL,
            [signed]    TINYINT     NULL,
            [secure]    VARCHAR     NULL,
            [expires]   VARCHAR     NULL,
            [httpOnly]  TINYINT     NULL,
            [sameSite]  VARCHAR     NULL,
            [partitioned] TINYINT   NULL,
            [priority]  VARCHAR     NULL
        )`;

        this.#database
            .prepare(query)
            .run();
    }

    /**
     * Deletes every session row whose `expires` timestamp has already
     * passed.
     */
    clearExpired(): void {
        const query = `--sql
        DELETE FROM [${this.#tableName}]
        WHERE
            datetime([${this.#tableName}].[expires]) <= datetime('now')`;

        this.#database
            .prepare(query)
            .run();
    }

    /**
     * Deletes every session row, regardless of expiration.
     */
    clear(): void {
        const query = `--sql
        DELETE FROM [${this.#tableName}]`;

        this.#database
            .prepare(query)
            .run();
    }

    /**
     * Retrieves a single session by its id.
     *
     * @param sid - The session id to look up.
     * @returns The parsed session data, or `null` when no row matches `sid`.
     */
    get(sid: string): SessionData | null {
        const query = `--sql
        SELECT
            [${this.#tableName}].[path],
            [${this.#tableName}].[json],
            [${this.#tableName}].[domain],
            [${this.#tableName}].[signed],
            [${this.#tableName}].[secure],
            [${this.#tableName}].[expires],
            [${this.#tableName}].[httpOnly],
            [${this.#tableName}].[sameSite],
            [${this.#tableName}].[partitioned],
            [${this.#tableName}].[priority]

        FROM [${this.#tableName}]

        WHERE
            [${this.#tableName}].[sid] = ?`;

        const value = this.#database
            .prepare<[ string ], SerializedSession>(query)
            .get(sid);

        return value
        ?   SessionParser.parse(value)
        :   null;
    }

    /**
     * Counts every session row currently stored in the table, including
     * expired ones.
     *
     * @returns The total number of session rows.
     */
    getLength(): number {
        const query = `--sql
        SELECT
            COUNT([${this.#tableName}].[sid]) AS [count]
        
        FROM [${this.#tableName}]`;

        const { count } = this.#database
            .prepare<[], { count: number; }>(query)
            .get() ?? { count: 0 };

        return count;
    }

    /**
     * Retrieves every non-expired session.
     *
     * @returns The parsed session data for all rows whose `expires`
     * timestamp is still in the future.
     */
    getAll(): SessionData[] {
        const query = `--sql
        SELECT
            [${this.#tableName}].[sid],
            [${this.#tableName}].[path],
            [${this.#tableName}].[json],
            [${this.#tableName}].[domain],
            [${this.#tableName}].[signed],
            [${this.#tableName}].[secure],
            [${this.#tableName}].[expires],
            [${this.#tableName}].[httpOnly],
            [${this.#tableName}].[sameSite],
            [${this.#tableName}].[partitioned],
            [${this.#tableName}].[priority]

        FROM [${this.#tableName}]

        WHERE
            [${this.#tableName}].[expires] IS NULL OR
            datetime([${this.#tableName}].[expires]) > datetime('now')`;

        return this.#database
            .prepare<[], SerializedSession>(query)
            .all()
            .map(x => SessionParser.parse(x));
    }

    /**
     * Checks whether a session row with the given id exists.
     *
     * @param sid - The session id to check.
     * @returns `true` when a row with that `sid` exists, `false` otherwise.
     */
    exists(sid: string): boolean {
        const query = `--sql
        SELECT
            COUNT([${this.#tableName}].[sid]) AS [count]
        
        FROM [${this.#tableName}]
        
        WHERE
            [${this.#tableName}].[sid] = ?`;

        const { count } = this.#database
            .prepare<[ string ], { count: number; }>(query)
            .get(sid) ?? { count: 0 };

        return count > 0;
    }

    /**
     * Inserts a new session row. Callers are expected to have checked
     * that no row with the given `sid` already exists (see {@link exists}).
     *
     * @param sid - The session id to store.
     * @param session - The session data to serialize and insert.
     */
    insert(sid: string, session: SessionData): void {
        const query = `--sql
        INSERT INTO [${this.#tableName}] (
            [sid],
            [path],
            [json],
            [domain],
            [signed],
            [secure],
            [expires],
            [httpOnly],
            [sameSite],
            [partitioned],
            [priority]
        ) VALUES
        ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;

        const v = SessionParser.serialize(session);
        this.#database
            .prepare(query)
            .run(
                sid,
                v.path,
                v.json,
                v.domain,
                v.signed,
                v.secure,
                v.expires,
                v.httpOnly,
                v.sameSite,
                v.partitioned,
                v.priority
            );
    }

    /**
     * Updates an existing session row in place. Callers are expected to
     * have checked that a row with the given `sid` already exists (see
     * {@link exists}).
     *
     * @param sid - The session id whose row is updated.
     * @param session - The new session data to serialize and store.
     */
    update(sid: string, session: SessionData): void {
        const query = `--sql
        UPDATE [${this.#tableName}] SET
            [path]     = ?,
            [json]     = ?,
            [domain]   = ?,
            [signed]   = ?,
            [secure]   = ?,
            [expires]  = ?,
            [httpOnly] = ?,
            [sameSite] = ?,
            [partitioned] = ?,
            [priority] = ?

        WHERE
            [sid] = ?`;

        const v = SessionParser.serialize(session);
        this.#database
            .prepare(query)
            .run(
                v.path,
                v.json,
                v.domain,
                v.signed,
                v.secure,
                v.expires,
                v.httpOnly,
                v.sameSite,
                v.partitioned,
                v.priority,
                sid
            );
    }

    /**
     * Deletes a single session row by its id. A no-op when no row with
     * that `sid` exists.
     *
     * @param sid - The session id to delete.
     */
    delete(sid: string): void {
        const query = `--sql
        DELETE FROM [${this.#tableName}]
        WHERE [sid] = ?`;

        this.#database
            .prepare(query)
            .run(sid);
    }
}