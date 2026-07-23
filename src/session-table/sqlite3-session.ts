import type { DatabaseObject, Statement } from './interfaces/index.js';
import type { SerializedSession } from '../session-parser/index.js';
import { sanitizeTableName } from './sanitize-table-name.js';

export class SQLite3Session {
    #tableName: string;
    #database: DatabaseObject;

    constructor(database: DatabaseObject, tableName: string) {
        this.#tableName = sanitizeTableName(tableName);
        this.#database = database;
    }

    transaction<T>(callback: () => T) {
        return this.#database.transaction(callback)();
    }

    createStatement(): Pick<Statement<[], void>, 'run'> {
        return this.#database.prepare(
            `--sql
            CREATE TABLE IF NOT EXISTS [${this.#tableName}](
                [sid]           VARCHAR     PRIMARY KEY,
                [json]          NVARCHAR    NOT NULL,
                [path]          VARCHAR     DEFAULT '/',
                [domain]        VARCHAR     NULL,
                [signed]        TINYINT     NULL,
                [secure]        VARCHAR     NULL,
                [expires]       VARCHAR     NULL,
                [httpOnly]      TINYINT     NULL,
                [sameSite]      VARCHAR     NULL,
                [priority]      VARCHAR     NULL,
                [partitioned]   TINYINT     NULL
            )`
        );
    }

    clearExpiredStatement(): Pick<Statement<[], void>, 'run'> {
        return this.#database.prepare(
            `--sql
            DELETE FROM [${this.#tableName}]
            WHERE
                datetime([${this.#tableName}].[expires]) <= datetime('now')`
        );
    }

    clearStatement(): Pick<Statement<[], void>, 'run'> {
        return this.#database.prepare(
            `--sql
            DELETE FROM [${this.#tableName}]`
        );
    }

    deleteStatement(): Pick<Statement<[ sid: string ], void>, 'run'> {
        return this.#database.prepare(
            `--sql
            DELETE FROM [${this.#tableName}]
            WHERE
                [${this.#tableName}].[sid] = ?`
        );
    }

    getLengthStatement(): Pick<Statement<[], { count: number; }>, 'get'> {
        return this.#database.prepare(
            `--sql
            SELECT
                COUNT([${this.#tableName}].[sid]) AS [count]
            
            FROM [${this.#tableName}]`
        );
    }

    getAllStatement(): Pick<Statement<[], SerializedSession>, 'all'> {
        return this.#database.prepare(
            `--sql
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
                [${this.#tableName}].[priority],
                [${this.#tableName}].[partitioned]

            FROM [${this.#tableName}]

            WHERE
                [${this.#tableName}].[expires] IS NULL OR
                datetime([${this.#tableName}].[expires]) > datetime('now')`
        );
    }

    getExistsStatement(): Pick<Statement<[ sid: string ], { exists: 0 | 1; }>, 'get'> {
        return this.#database.prepare(
            `--sql
            SELECT
                IIF(
                    COUNT([${this.#tableName}].[sid]) > 0,
                    CAST(1 AS BOOLEAN),
                    CAST(0 AS BOOLEAN)
                ) AS [exists]

            FROM [${this.#tableName}]

            WHERE
                [${this.#tableName}].[sid] = ?`
        );
    }

    getStatement(): Pick<Statement<[ sid: string ], SerializedSession>, 'get'> {
        return this.#database.prepare(
            `--sql
            SELECT
                [${this.#tableName}].[path],
                [${this.#tableName}].[json],
                [${this.#tableName}].[domain],
                [${this.#tableName}].[signed],
                [${this.#tableName}].[secure],
                [${this.#tableName}].[expires],
                [${this.#tableName}].[httpOnly],
                [${this.#tableName}].[sameSite],
                [${this.#tableName}].[priority],
                [${this.#tableName}].[partitioned]

            FROM [${this.#tableName}]

            WHERE
                [${this.#tableName}].[sid] = ?`
        );
    }

    updateStatement(): Pick<Statement<
        [
            path:           SerializedSession['path'],
            json:           SerializedSession['json'],
            domain:         SerializedSession['domain'],
            signed:         SerializedSession['signed'],
            secure:         SerializedSession['secure'],
            expires:        SerializedSession['expires'],
            httpOnly:       SerializedSession['httpOnly'],
            sameSite:       SerializedSession['sameSite'],
            priority:       SerializedSession['priority'],
            partitioned:    SerializedSession['partitioned'],
            sid:            string,
        ],
        void
    >, 'run'> {
        return this.#database.prepare(
            `--sql
            UPDATE [${this.#tableName}] SET
                [path]          = ?,
                [json]          = ?,
                [domain]        = ?,
                [signed]        = ?,
                [secure]        = ?,
                [expires]       = ?,
                [httpOnly]      = ?,
                [sameSite]      = ?,
                [priority]      = ?,
                [partitioned]   = ?

            WHERE
                [sid] = ?`
        );
    }

    insertStatement(): Pick<Statement<
        [
            path:           SerializedSession['path'],
            json:           SerializedSession['json'],
            domain:         SerializedSession['domain'],
            signed:         SerializedSession['signed'],
            secure:         SerializedSession['secure'],
            expires:        SerializedSession['expires'],
            httpOnly:       SerializedSession['httpOnly'],
            sameSite:       SerializedSession['sameSite'],
            priority:       SerializedSession['priority'],
            partitioned:    SerializedSession['partitioned'],
            sid:            string,
        ],
        void
    >, 'run'> {
        return this.#database.prepare(
            `--sql
            INSERT INTO [${this.#tableName}] (
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
                [sid]
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )`
        );
    }
}