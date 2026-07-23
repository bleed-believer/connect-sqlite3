import { sanitizeTableName } from './sanitize-table-name.js';
import { describe, it } from 'node:test';

describe('sanitizeTableName', () => {
    it('returns valid identifiers unchanged', (t: it.TestContext) => {
        t.assert.strictEqual(sanitizeTableName('sessions'), 'sessions');
        t.assert.strictEqual(sanitizeTableName('_session_table'), '_session_table');
        t.assert.strictEqual(sanitizeTableName('Session123'), 'Session123');
        t.assert.strictEqual(sanitizeTableName('connect-sqlite3-session'), 'connect-sqlite3-session');
    });

    it('rejects names starting with a digit', (t: it.TestContext) => {
        t.assert.throws(() => sanitizeTableName('123sessions'));
    });

    it('rejects names containing bracket-breakout characters', (t: it.TestContext) => {
        t.assert.throws(() => sanitizeTableName('sess] ; DROP TABLE users; --'));
    });

    it('rejects names containing whitespace or quotes', (t: it.TestContext) => {
        t.assert.throws(() => sanitizeTableName('sess ion'));
        t.assert.throws(() => sanitizeTableName('sess"ion'));
        t.assert.throws(() => sanitizeTableName("sess'ion"));
    });

    it('rejects an empty string', (t: it.TestContext) => {
        t.assert.throws(() => sanitizeTableName(''));
    });
});
