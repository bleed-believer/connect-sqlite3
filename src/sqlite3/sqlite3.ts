import { SQLite3Migrations } from './sqlite3.migrations.js';
import { SQLite3Base } from './sqlite3.base.js';

import { CreateSessionTable1784908810519 } from './migrations/1784908810519-create-session-table.js';

export class SQLite3 extends SQLite3Base {
    constructor(target: string | Buffer, verbose?: boolean) {
        super(target, verbose);

        const migrations = new SQLite3Migrations(this);
        migrations.runMigrations([
            new CreateSessionTable1784908810519(),
        ]);
    }
}