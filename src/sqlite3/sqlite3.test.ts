import { after, before, describe, it } from 'node:test';
import { rm } from 'node:fs/promises';

import { CreateSessionTable1784908810519 } from './migrations/1784908810519-create-session-table.js';
import { SessionTable } from '../session-table/index.js';
import { SQLite3Migrations } from './sqlite3.migrations.js';
import { SQLite3Base } from './sqlite3.base.js';
import { SQLite3 } from './sqlite3.js';

describe(
    'SQLite3',
    { concurrency: false },
    () => {
        const path = './sqlite3.db';
        const removeDatabase = () => Promise.all(
            [ '', '-wal', '-shm' ].map(x => rm(path + x, { force: true }))
        );

        before(removeDatabase);
        after(removeDatabase);

        it('Opens a file database in WAL mode', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            try {
                const mode = sqlite3.get<[], { journal_mode: string; }>(
                    `PRAGMA journal_mode`
                );

                t.assert.strictEqual(mode?.journal_mode, 'wal');
            } finally {
                sqlite3.close();
            }
        });

        it('The new migration converts the existing ISO "expires" to the same millisecond', async (t: it.TestContext) => {
            await removeDatabase();

            // A database created by the first migration only, as 0.1.0 left it.
            const old = new SQLite3Base(path);
            new SQLite3Migrations(old).runMigrations([
                new CreateSessionTable1784908810519()
            ]);

            const expires = new Date(Date.UTC(2099, 6, 6, 12, 34, 56, 789));
            const insert = (sid: string, expires: string | null) => old.run(
                `--sql
                INSERT INTO [sqlite3-session] (
                    [sid],
                    [json],
                    [path],
                    [expires],
                    [originalMaxAge]
                ) VALUES (?, ?, ?, ?, ?)`,
                sid,
                `{"foo":"${sid}"}`,
                '/somewhere',
                expires,
                30_000
            );

            insert('with-expires', expires.toISOString());
            insert('without-expires', null);
            insert('garbage-expires', 'not a date');
            old.close();

            const sqlite3 = new SQLite3(path);
            try {
                const rows = sqlite3.all<[], { sid: string; expires: unknown; type: string; }>(
                    `--sql
                    SELECT
                        [sqlite3-session].[sid],
                        [sqlite3-session].[expires],
                        typeof([sqlite3-session].[expires]) AS [type]

                    FROM [sqlite3-session]

                    ORDER BY [sqlite3-session].[sid]`
                );

                t.assert.deepStrictEqual(rows, [
                    // Can't be parsed: becomes expired, not immortal.
                    { sid: 'garbage-expires', expires: 0, type: 'integer' },
                    { sid: 'with-expires', expires: expires.getTime(), type: 'integer' },
                    { sid: 'without-expires', expires: null, type: 'null' }
                ]);

                // The rest of the row survives, and reads back as before.
                const session = new SessionTable(sqlite3).get('with-expires') as any;
                t.assert.strictEqual(session?.foo, 'with-expires');
                t.assert.strictEqual(session?.cookie.path, '/somewhere');
                t.assert.strictEqual(session?.cookie.expires?.toJSON(), expires.toJSON());
                t.assert.strictEqual(session?.cookie.originalMaxAge, 30_000);
            } finally {
                sqlite3.close();
            }
        });

        it('The expiration checks use the index', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            try {
                const plan = sqlite3
                    .all<[ number ], { detail: string; }>(
                        `--sql
                        EXPLAIN QUERY PLAN
                        DELETE FROM [sqlite3-session]
                        WHERE
                            [sqlite3-session].[expires] <= ?`,
                        Date.now()
                    )
                    .map(x => x.detail)
                    .join('\n');

                t.assert.match(plan, /ix_sqlite3_session_expires/);
            } finally {
                sqlite3.close();
            }
        });
    }
);
