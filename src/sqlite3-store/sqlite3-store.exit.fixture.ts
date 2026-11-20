/**
 * Opens a store and never closes it. `sqlite3-store.test.ts` runs this file
 * in a child process to check that the purge timer doesn't keep the
 * process alive.
 */
import { SQLite3Store } from './sqlite3-store.js';

new SQLite3Store(':memory:', { purgeIntervalMs: 50 });
