import type { Migration, SQLite3Object } from './interfaces/index.js';

import { describe, it, before, after } from 'node:test';
import { SQLite3Migrations } from './sqlite3.migrations.js';
import { SQLite3Base } from './sqlite3.base.js';
import { rm } from 'node:fs/promises';
import { rmSync } from 'node:fs';

describe(
    'SQLite3Migrations',
    { concurrency: false },
    () => {
        const target = './sqlite3.migrations.db';
        const countTables = (sqlite: SQLite3Object) => sqlite.get<
            [],
            {
                migration:  1 | 0;
                table1:     1 | 0;
                table2:     1 | 0;
                table3:     1 | 0;
                table4:     1 | 0;
            }
        >(
            `--sql
            SELECT
                (
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        )

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'migration'
                ) AS [migration],
                (
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        )

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'table-01'
                ) AS [table1],
                (
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        )

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'table-02'
                ) AS [table2],
                (
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        )

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'table-03'
                ) AS [table3],
                (
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        )

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'table-04'
                ) AS [table4]`
        )!;

        const migration1: Migration = {
            name: 'migration1',
            execute(sqlite3) {
                sqlite3.run(
                    `--sql
                    CREATE TABLE [table-01](
                        [id]    INTEGER     PRIMARY KEY,
                        [name]  VARCHAR
                    )`
                );
            },
        };

        const migration2: Migration = {
            name: 'migration2',
            execute(sqlite3) {
                sqlite3.run(
                    `--sql
                    CREATE TABLE [table-02](
                        [id]    INTEGER     PRIMARY KEY,
                        [name]  VARCHAR
                    )`
                );
            },
        };

        const migration3: Migration = {
            name: 'migration3',
            execute(sqlite3) {
                sqlite3.run(
                    `--sql
                    CREATE TABLE [table-03](
                        [id]    INTEGER     PRIMARY KEY,
                        [name]  VARCHAR
                    )`
                );
            },
        };

        const migration4: Migration = {
            name: 'migration4',
            execute(sqlite3) {
                sqlite3.run(
                    `--sql
                    CREATE TABLE [table-04](
                        [id]    INTEGER     PRIMARY KEY,
                        [name]  VARCHAR
                    )`
                );

                throw new Error('jajaja');
            },
        };

        before(() => rm(target, { force: true }));
        after (() => rm(target, { force: true }));

        it('Create [migration] table', (t: it.TestContext) => {
            const sqlite3 = new SQLite3Base(target);
            const sqlite3Migrations = new SQLite3Migrations(sqlite3);
            sqlite3Migrations.runMigrations([]);

            const count = countTables(sqlite3);
            t.assert.deepStrictEqual(count, {
                migration: 1,
                table1: 0,
                table2: 0,
                table3: 0,
                table4: 0
            });
        });

        it('Execute migrations 1 and 2', (t: it.TestContext) => {
            const sqlite3 = new SQLite3Base(target);
            const sqlite3Migrations = new SQLite3Migrations(sqlite3);
            sqlite3Migrations.runMigrations([ migration1, migration2 ]);

            const count = countTables(sqlite3);
            t.assert.deepStrictEqual(count, {
                migration: 1,
                table1: 1,
                table2: 1,
                table3: 0,
                table4: 0
            });
        });

        it('Execute migrations 3 and 4 (and fails)', (t: it.TestContext) => {
            const sqlite3 = new SQLite3Base(target);
            const sqlite3Migrations = new SQLite3Migrations(sqlite3);
            
            try {
                sqlite3Migrations.runMigrations([
                    migration1,
                    migration2,
                    migration3,
                    migration4
                ]);

                t.assert.fail('The "migration4" must fail');
            } catch (err: any) {
                t.assert.strictEqual(err.message, 'jajaja');

                const count = countTables(sqlite3);
                t.assert.deepStrictEqual(count, {
                    migration: 1,
                    table1: 1,
                    table2: 1,
                    table3: 0,
                    table4: 0
                });
            }
        });

        it('A migration inserted before the last applied one still runs', (t: it.TestContext) => {
            const localTarget = './sqlite3.migrations-insert-before.db';
            rmSync(localTarget, { force: true });

            try {
                let sqlite3 = new SQLite3Base(localTarget);
                let sqlite3Migrations = new SQLite3Migrations(sqlite3);
                sqlite3Migrations.runMigrations([ migration1, migration2 ]);

                const migration1_5: Migration = {
                    name: 'migration1.5',
                    execute(sqlite3) {
                        sqlite3.run(
                            `--sql
                            CREATE TABLE [table-01-5](
                                [id]    INTEGER     PRIMARY KEY,
                                [name]  VARCHAR
                            )`
                        );
                    },
                };

                sqlite3 = new SQLite3Base(localTarget);
                sqlite3Migrations = new SQLite3Migrations(sqlite3);
                sqlite3Migrations.runMigrations([ migration1, migration1_5, migration2 ]);

                const { exists } = sqlite3.get<[], { exists: 1 | 0; }>(
                    `--sql
                    SELECT
                        IIF(
                            COUNT(*) > 0,
                            CAST(1 AS BOOLEAN),
                            CAST(0 AS BOOLEAN)
                        ) AS [exists]

                    FROM [sqlite_schema]

                    WHERE
                        [sqlite_schema].[tbl_name] = 'table-01-5'`
                )!;

                t.assert.strictEqual(exists, 1);
            } finally {
                rmSync(localTarget, { force: true });
            }
        });

        it('A renamed already-applied migration throws instead of skipping or re-running everything', (t: it.TestContext) => {
            const localTarget = './sqlite3.migrations-renamed.db';
            rmSync(localTarget, { force: true });

            try {
                let sqlite3 = new SQLite3Base(localTarget);
                let sqlite3Migrations = new SQLite3Migrations(sqlite3);
                sqlite3Migrations.runMigrations([ migration1, migration2 ]);

                const migration2Renamed: Migration = {
                    name: 'migration2-renamed',
                    execute: migration2.execute,
                };

                sqlite3 = new SQLite3Base(localTarget);
                sqlite3Migrations = new SQLite3Migrations(sqlite3);

                t.assert.throws(
                    () => sqlite3Migrations.runMigrations([ migration1, migration2Renamed ]),
                    /Applied migration "migration2" is missing/
                );
            } finally {
                rmSync(localTarget, { force: true });
            }
        });
    }
);