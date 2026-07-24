import type { Migration } from './interfaces/index.js';

import { SQLite3Base } from './sqlite3.base.js';

export class SQLite3Migrations {
    #sqlite3: SQLite3Base;

    constructor(sqlite3: SQLite3Base) {
        this.#sqlite3 = sqlite3;
    }

    #createMigrationTable(): void {
        const query = [
            `CREATE TABLE [migration](`,
            `   [id]    INTEGER     PRIMARY KEY,`,
            `   [name]  VARCHAR     NULL`,
            `)`
        ].join('');

        const { exists } = this.#sqlite3.get<
            [ query: string ],
            { exists: 1 | 0; }
        >(
            `--sql
            SELECT
                IIF(
                    COUNT(*) > 0,
                    CAST(1 AS BOOLEAN),
                    CAST(0 AS BOOLEAN)
                ) AS [exists]
            
            FROM sqlite_schema
            
            WHERE
                sqlite_schema.tbl_name = 'migration'
            AND sqlite_schema.sql = ?`,
            query
        )!;

        if (exists === 0) {
            this.#sqlite3.run(`DROP TABLE IF EXISTS [migration]`);
            this.#sqlite3.run(query);
        }

        const { count } = this.#sqlite3.get<
            [],
            { count: number; }
        >(
            `--sql
            SELECT
                COUNT(*) AS [count]
            
            FROM [migration]`
        )!;

        if (count !== 1) {
            this.#sqlite3.run(
                `--sql
                DELETE FROM [migration]`
            );

            this.#sqlite3.run(
                `--sql
                INSERT INTO [migration]
                ([name])
                VALUES
                (NULL)`
            );
        }
    }

    #runMigrations(migrations: Migration[]): void {
        let { name } = this.#sqlite3.get<[], { name: string | null; }>(
            `--sql
            SELECT
                [migration].[name]
                
            FROM [migration]
            
            LIMIT 1`
        )!;

        let i = typeof name === 'string'
        ?   migrations.findIndex(x => x.name === name)
        :   -1;

        if (i >= 0) {
            i++;
        } else {
            i = 0;
        }

        for (const migration of migrations.slice(i)) {
            migration.execute(this.#sqlite3);
            name = migration.name;
        }

        this.#sqlite3.run(
            `--sql
            UPDATE [migration] SET
                [name] = ?`,
            name
        );
    }

    runMigrations(migrations: Migration[]): void {
        this.#sqlite3.transaction(() => {
            this.#createMigrationTable();
            this.#runMigrations(migrations);
        });
    }
}