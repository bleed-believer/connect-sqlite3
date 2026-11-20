import { SQLite3Migrations } from './sqlite3.migrations.js';
import { SQLite3Base } from './sqlite3.base.js';

import { CreateSessionTable1784908810519 } from './migrations/1784908810519-create-session-table.js';
import { ExpiresAsInteger1795178328577 } from './migrations/1795178328577-expires-as-integer.js';

export class SQLite3 extends SQLite3Base {
    constructor(target: string | Buffer, verbose?: boolean) {
        super(target, verbose);

        const migrations = new SQLite3Migrations(this);
        migrations.runMigrations([
            new CreateSessionTable1784908810519(),
            new ExpiresAsInteger1795178328577(),
        ]);
    }
}
