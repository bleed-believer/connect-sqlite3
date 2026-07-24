import type { Migration, SQLite3Object } from '../interfaces/index.js';

export class CreateSessionTable1784908810519 implements Migration {
    name = 'CreateSessionTable1784908810519';

    execute(sqlite3: SQLite3Object): void {
        sqlite3.run(
            `--sql
            CREATE TABLE IF NOT EXISTS [sqlite3-session](
                [sid]               VARCHAR     PRIMARY KEY,
                [json]              NVARCHAR    NOT NULL,
                [path]              VARCHAR     DEFAULT '/',
                [domain]            VARCHAR     NULL,
                [signed]            TINYINT     NULL,
                [secure]            VARCHAR     NULL,
                [expires]           VARCHAR     NULL,
                [httpOnly]          TINYINT     NULL,
                [sameSite]          VARCHAR     NULL,
                [priority]          VARCHAR     NULL,
                [partitioned]       TINYINT     NULL,
                [originalMaxAge]    BIGINT      NULL
            )`
        );
    }
}