import type { Migration, SQLite3Object } from '../interfaces/index.js';

/**
 * Stores `expires` as an `INTEGER` (milliseconds since the epoch) instead of
 * an ISO string, and indexes it, so the expiration checks can compare it
 * with a bound parameter and use the index.
 *
 * SQLite can't change a column's type, so the table is rebuilt: the rows are
 * copied to a new table, converting `expires`, and the new table takes the
 * old one's name. It runs inside the migrations' transaction, so a failure
 * leaves the old table untouched.
 */
export class ExpiresAsInteger1795178328577 implements Migration {
    name = 'ExpiresAsInteger1795178328577';

    execute(sqlite3: SQLite3Object): void {
        sqlite3.run(
            `--sql
            CREATE TABLE [sqlite3-session-new](
                [sid]               VARCHAR     PRIMARY KEY,
                [json]              NVARCHAR    NOT NULL,
                [path]              VARCHAR     DEFAULT '/',
                [domain]            VARCHAR     NULL,
                [signed]            TINYINT     NULL,
                [secure]            VARCHAR     NULL,
                [expires]           INTEGER     NULL,
                [httpOnly]          TINYINT     NULL,
                [sameSite]          VARCHAR     NULL,
                [priority]          VARCHAR     NULL,
                [partitioned]       TINYINT     NULL,
                [originalMaxAge]    BIGINT      NULL
            )`
        );

        // `julianday()` parses the ISO string, and the arithmetic turns
        // days since the Julian epoch into milliseconds since the Unix
        // epoch. `ROUND` makes the result exact to the millisecond. A text
        // that can't be parsed becomes `0` (long expired) rather than
        // `NULL`, which would mean "never expires".
        sqlite3.run(
            `--sql
            INSERT INTO [sqlite3-session-new] (
                [sid],
                [json],
                [path],
                [domain],
                [signed],
                [secure],
                [expires],
                [httpOnly],
                [sameSite],
                [priority],
                [partitioned],
                [originalMaxAge]
            )
            SELECT
                [sqlite3-session].[sid],
                [sqlite3-session].[json],
                [sqlite3-session].[path],
                [sqlite3-session].[domain],
                [sqlite3-session].[signed],
                [sqlite3-session].[secure],
                CASE
                    WHEN [sqlite3-session].[expires] IS NULL THEN NULL
                    ELSE COALESCE(
                        CAST(
                            ROUND(
                                (julianday([sqlite3-session].[expires]) - 2440587.5)
                                * 86400000
                            ) AS INTEGER
                        ),
                        0
                    )
                END,
                [sqlite3-session].[httpOnly],
                [sqlite3-session].[sameSite],
                [sqlite3-session].[priority],
                [sqlite3-session].[partitioned],
                [sqlite3-session].[originalMaxAge]

            FROM [sqlite3-session]`
        );

        sqlite3.run(
            `--sql
            DROP TABLE [sqlite3-session]`
        );

        sqlite3.run(
            `--sql
            ALTER TABLE [sqlite3-session-new] RENAME TO [sqlite3-session]`
        );

        sqlite3.run(
            `--sql
            CREATE INDEX [ix_sqlite3_session_expires]
            ON [sqlite3-session] ([expires])`
        );
    }
}
