import type { SQLite3Object } from './sqlite3.object.js';

export interface Migration {
    readonly name: string;

    execute(sqlite3: SQLite3Object): void;
}