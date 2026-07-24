import type { Migration } from './interfaces/index.js';

import { SQLite3Base } from './sqlite3.base.js';

export class SQLite3Migrations {
    #sqlite3: SQLite3Base;

    constructor(sqlite3: SQLite3Base) {
        this.#sqlite3 = sqlite3;
    }

    #createMigrationTable(): void {
        this.#sqlite3.run(
            `--sql
            CREATE TABLE IF NOT EXISTS [migration](
                [name]      VARCHAR     PRIMARY KEY,
                [appliedAt] VARCHAR     NOT NULL
            )`
        );
    }

    #runMigrations(migrations: Migration[]): void {
        const applied = new Set(
            this.#sqlite3
                .all<[], { name: string; }>(
                    `--sql
                    SELECT
                        [migration].[name]

                    FROM [migration]`
                )
                .map(x => x.name)
        );

        const names = new Set(migrations.map(x => x.name));
        for (const name of applied) {
            if (!names.has(name)) {
                throw new Error(
                    `Applied migration "${name}" is missing from the ` +
                    `migration list — did you rename or remove it?`
                );
            }
        }

        for (const migration of migrations) {
            if (applied.has(migration.name)) {
                continue;
            }

            migration.execute(this.#sqlite3);
            this.#sqlite3.run(
                `--sql
                INSERT INTO [migration] (
                    [name],
                    [appliedAt]
                ) VALUES (
                    ?,
                    ?
                )`,
                migration.name,
                new Date().toISOString()
            );
        }
    }

    runMigrations(migrations: Migration[]): void {
        this.#sqlite3.transaction(() => {
            this.#createMigrationTable();
            this.#runMigrations(migrations);
        });
    }
}