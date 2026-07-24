import type { SerializedSession } from '../session-parser/index.js';
import type { SQLite3Object } from '../sqlite3/index.js';
import type { SessionData } from 'express-session';
import type { RunResult } from 'better-sqlite3';

import { SessionParser } from '../session-parser/index.js';

export class SessionQueries {
    #sqlite3: SQLite3Object;

    constructor(sqlite3: SQLite3Object) {
        this.#sqlite3 = sqlite3;
    }

    clearExpired(): RunResult {
        return this.#sqlite3.run(
            `--sql
            DELETE FROM [sqlite3-session]
            WHERE
                datetime([sqlite3-session].[expires]) <= datetime('now')`
        );
    }

    clear(): RunResult {
        return this.#sqlite3.run(
            `--sql
            DELETE FROM [sqlite3-session]`
        );
    }

    delete(sid: string): RunResult {
        return this.#sqlite3.run(
            `--sql
            DELETE FROM [sqlite3-session]
            WHERE
                [sqlite3-session].[sid] = ?`,
            sid
        );
    }

    getLength(): number {
        const { length } = this.#sqlite3.get<[], { length: number; }>(
            `--sql
            SELECT
                COUNT([sqlite3-session].[sid]) AS [length]
            
            FROM [sqlite3-session]`
        ) ?? { length: 0 };

        return length;
    }

    getAll(): SessionData[] {
        const raw = this.#sqlite3.all<
            [],
            SerializedSession
        >(
            `--sql
            SELECT
                [sqlite3-session].[sid],
                [sqlite3-session].[path],
                [sqlite3-session].[json],
                [sqlite3-session].[domain],
                [sqlite3-session].[signed],
                [sqlite3-session].[secure],
                [sqlite3-session].[expires],
                [sqlite3-session].[httpOnly],
                [sqlite3-session].[sameSite],
                [sqlite3-session].[priority],
                [sqlite3-session].[partitioned],
                [sqlite3-session].[originalMaxAge]

            FROM [sqlite3-session]

            WHERE
                [sqlite3-session].[expires] IS NULL OR
                datetime([sqlite3-session].[expires]) > datetime('now')`
        );

        return raw.map(x => SessionParser.parse(x));
    }

    getExists(sid: string): boolean {
        const { exists } = this.#sqlite3.get<
            [ sid: string ],
            { exists: 1 | 0; }
        >(
            `--sql
            SELECT
                IIF(
                    COUNT([sqlite3-session].[sid]) > 0,
                    CAST(1 AS BOOLEAN),
                    CAST(0 AS BOOLEAN)
                ) AS [exists]

            FROM [sqlite3-session]

            WHERE
                [sqlite3-session].[sid] = ?`,
            sid
        ) ?? { exists: 0 };

        return exists === 1;
    }

    get(sid: string): SessionData | null {
        const raw = this.#sqlite3.get<
            [ sid: string ],
            SerializedSession
        >(
            `--sql
            SELECT
                [sqlite3-session].[path],
                [sqlite3-session].[json],
                [sqlite3-session].[domain],
                [sqlite3-session].[signed],
                [sqlite3-session].[secure],
                [sqlite3-session].[expires],
                [sqlite3-session].[httpOnly],
                [sqlite3-session].[sameSite],
                [sqlite3-session].[priority],
                [sqlite3-session].[partitioned],
                [sqlite3-session].[originalMaxAge]

            FROM [sqlite3-session]

            WHERE
                [sqlite3-session].[sid] = ?`,
            sid
        );

        return raw
        ?   SessionParser.parse(raw)
        :   null;
    }

    update(sid: string, sessionData: SessionData): RunResult {
        const raw = SessionParser.serialize(sessionData);
        return this.#sqlite3.run(
            `--sql
            UPDATE [sqlite3-session] SET
                [path]              = ?,
                [json]              = ?,
                [domain]            = ?,
                [signed]            = ?,
                [secure]            = ?,
                [expires]           = ?,
                [httpOnly]          = ?,
                [sameSite]          = ?,
                [priority]          = ?,
                [partitioned]       = ?,
                [originalMaxAge]    = ?

            WHERE
                [sid] = ?`,
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

    insert(sid: string, sessionData: SessionData): RunResult {
        const raw = SessionParser.serialize(sessionData);
        return this.#sqlite3.run(
            `--sql
            INSERT INTO [sqlite3-session] (
                [path],
                [json],
                [domain],
                [signed],
                [secure],
                [expires],
                [httpOnly],
                [sameSite],
                [priority],
                [partitioned],
                [originalMaxAge],
                [sid]
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?
            )`,
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
}