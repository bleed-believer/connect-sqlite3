import type { SerializedSession } from '../session-parser/index.js';
import type { RunResult, Statement } from 'better-sqlite3';
import type { SQLite3Object } from '../sqlite3/index.js';
import type { SessionData } from 'express-session';

import { SessionParser } from '../session-parser/index.js';

type Now = number;
type Expires = number | null;
type SessionRow = SerializedSession & { sid: string; };

/**
 * Every statement the store runs. Each one is prepared once, in the
 * constructor, and reused on every call.
 *
 * The expiration checks compare `[expires]` (milliseconds since the
 * epoch, or `NULL` for "never expires") with a bound `now`, so they can use
 * the `ix_sqlite3_session_expires` index.
 */
export class SessionQueries {
    #purge:     Statement<[ now: Now ]>;
    #clear:     Statement<[]>;
    #delete:    Statement<[ sid: string ]>;
    #getLength: Statement<[ now: Now ], number>;
    #getAll:    Statement<[ now: Now ], SerializedSession>;
    #get:       Statement<[ sid: string, now: Now ], SerializedSession>;
    #upsert:    Statement<[ row: SessionRow ]>;
    #touch:     Statement<[ expires: Expires, sid: string, now: Now ]>;

    constructor(sqlite3: SQLite3Object) {
        this.#purge = sqlite3.prepare(
            `--sql
            DELETE FROM [sqlite3-session]
            WHERE
                [sqlite3-session].[expires] <= ?`
        );

        this.#clear = sqlite3.prepare(
            `--sql
            DELETE FROM [sqlite3-session]`
        );

        this.#delete = sqlite3.prepare(
            `--sql
            DELETE FROM [sqlite3-session]
            WHERE
                [sqlite3-session].[sid] = ?`
        );

        this.#getLength = sqlite3.prepare<[ now: Now ], number>(
            `--sql
            SELECT
                COUNT(*) AS [length]

            FROM [sqlite3-session]

            WHERE
                [sqlite3-session].[expires] IS NULL OR
                [sqlite3-session].[expires] > ?`
        ).pluck();

        this.#getAll = sqlite3.prepare(
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
                [sqlite3-session].[expires] IS NULL OR
                [sqlite3-session].[expires] > ?`
        );

        this.#get = sqlite3.prepare(
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
                [sqlite3-session].[sid] = ? AND (
                    [sqlite3-session].[expires] IS NULL OR
                    [sqlite3-session].[expires] > ?
                )`
        );

        this.#upsert = sqlite3.prepare(
            `--sql
            INSERT INTO [sqlite3-session] (
                [sid],
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
                [originalMaxAge]
            ) VALUES (
                @sid,
                @path,
                @json,
                @domain,
                @signed,
                @secure,
                @expires,
                @httpOnly,
                @sameSite,
                @priority,
                @partitioned,
                @originalMaxAge
            )
            ON CONFLICT ([sid]) DO UPDATE SET
                [path]              = [excluded].[path],
                [json]              = [excluded].[json],
                [domain]            = [excluded].[domain],
                [signed]            = [excluded].[signed],
                [secure]            = [excluded].[secure],
                [expires]           = [excluded].[expires],
                [httpOnly]          = [excluded].[httpOnly],
                [sameSite]          = [excluded].[sameSite],
                [priority]          = [excluded].[priority],
                [partitioned]       = [excluded].[partitioned],
                [originalMaxAge]    = [excluded].[originalMaxAge]`
        );

        // An expired row that the purge hasn't deleted yet counts as
        // missing: a touch must not bring it back.
        this.#touch = sqlite3.prepare(
            `--sql
            UPDATE [sqlite3-session] SET
                [expires] = ?

            WHERE
                [sqlite3-session].[sid] = ? AND (
                    [sqlite3-session].[expires] IS NULL OR
                    [sqlite3-session].[expires] > ?
                )`
        );
    }

    /** Deletes every session that expired at or before `now`. */
    purge(now: Now): RunResult {
        return this.#purge.run(now);
    }

    clear(): RunResult {
        return this.#clear.run();
    }

    delete(sid: string): RunResult {
        return this.#delete.run(sid);
    }

    /** Counts the sessions that haven't expired at `now`. */
    getLength(now: Now): number {
        return this.#getLength.get(now) ?? 0;
    }

    /** Returns the sessions that haven't expired at `now`. */
    getAll(now: Now): SessionData[] {
        return this.#getAll
            .all(now)
            .map(x => SessionParser.parse(x));
    }

    /** Returns the session, or `null` if it's missing or expired at `now`. */
    get(sid: string, now: Now): SessionData | null {
        const raw = this.#get.get(sid, now);
        return raw
        ?   SessionParser.parse(raw)
        :   null;
    }

    /** Inserts the session, or replaces every column of an existing one. */
    upsert(sid: string, sessionData: SessionData): RunResult {
        const raw = SessionParser.serialize(sessionData);
        return this.#upsert.run({ ...raw, sid });
    }

    /**
     * Sets the expiration of a session that exists and hasn't expired at
     * `now`. Changes nothing otherwise.
     */
    touch(sid: string, expires: Expires, now: Now): RunResult {
        return this.#touch.run(expires, sid, now);
    }
}
