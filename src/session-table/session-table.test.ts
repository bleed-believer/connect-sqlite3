import { SessionTable } from './session-table.js';
import { SQLite3 } from '../sqlite3/index.js';

import { after, before, describe, it } from 'node:test';
import { Cookie, type SessionData } from 'express-session';
import { rm } from 'node:fs/promises';

describe(
    'SessionTable',
    { concurrency: false },
    () => {
        const path = './session-table.db';
        const daemonExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

        before(() => rm(path, { force: true }));
        after (() => rm(path, { force: true }));

        it('Create table', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            t.assert.strictEqual(sessionTable.getLength(), 0);
        });

        it('Create a session', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const foo = 'bar';
            const cookie = new Cookie();
            cookie.path = '/joder/chaval';
            cookie.expires = daemonExpires;
            cookie.httpOnly = true;

            sessionTable.set('daemon666', { cookie, foo } as SessionData);
            t.assert.notStrictEqual(sessionTable.get('daemon666'), null);
        });

        it('Get the session "daemon666"', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const { cookie, foo } = sessionTable.get('daemon666') as any ?? {};
            t.assert.strictEqual(cookie?.path, '/joder/chaval');
            t.assert.strictEqual(cookie?.expires?.toJSON(), daemonExpires.toJSON());
            t.assert.strictEqual(cookie?.httpOnly, true);
            t.assert.deepStrictEqual(foo, 'bar');
        });

        it('Update the session "daemon666"', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const session = sessionTable.get('daemon666') as any;
            if (!session) {
                t.assert.fail('This test must gets an existing session');
            }

            session.caca = true;
            sessionTable.set('daemon666', session);

            const { foo, caca } = sessionTable.get('daemon666') as any ?? {};
            t.assert.deepStrictEqual(foo, 'bar');
            t.assert.deepStrictEqual(caca, true);
        });

        it('Delete the session "daemon666"', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            sessionTable.delete('daemon666');
            t.assert.strictEqual(sessionTable.get('daemon666'), null);
        });

        it('Purgue expired sessions', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const ñeee = true;
            const cookie = new Cookie();
            cookie.expires = new Date(2000, 0, 0);

            sessionTable.set('ñee', { ñeee, cookie } as SessionData);
            t.assert.strictEqual(sessionTable.get('ñee'), null);
        });

        it('Purgue a session that expired earlier today', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const today = true;
            const cookie = new Cookie();
            cookie.expires = new Date(Date.now() - 1_000);

            sessionTable.set('today-expired', { today, cookie } as SessionData);
            t.assert.strictEqual(sessionTable.get('today-expired'), null);
        });

        it('getAll() excludes a session that expired earlier today', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const today = true;
            const cookie = new Cookie();
            cookie.expires = new Date(Date.now() - 1_000);

            sessionTable.set('today-expired-2', { today, cookie } as SessionData);
            const all = sessionTable.getAll();
            t.assert.strictEqual(
                all.some(s => (s as any).today === true),
                false
            );
        });

        it('getAll() includes a session with no expiration date', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const noExpiry = true;
            const cookie = new Cookie();

            sessionTable.set('no-expiry', { noExpiry, cookie } as SessionData);
            const all = sessionTable.getAll();
            t.assert.strictEqual(
                all.some(s => (s as any).noExpiry === true),
                true
            );
        });

        it('round-trips the partitioned and priority cookie attributes', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const chips = true;
            const cookie = new Cookie();
            cookie.partitioned = true;
            cookie.priority = 'high';

            sessionTable.set('chips-cookie', { chips, cookie } as SessionData);

            const stored = sessionTable.get('chips-cookie');
            t.assert.strictEqual(stored?.cookie.partitioned, true);
            t.assert.strictEqual(stored?.cookie.priority, 'high');
        });

        it('round-trips originalMaxAge so a reloaded session still touches for the full window', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const rolling = true;
            const cookie = new Cookie();
            cookie.maxAge = 60_000;

            sessionTable.set('rolling-cookie', { rolling, cookie } as SessionData);

            const stored = sessionTable.get('rolling-cookie');
            t.assert.strictEqual(stored?.cookie.originalMaxAge, 60_000);
        });

        it('set() defaults a missing payload to {} instead of throwing', (t: it.TestContext) => {
            const sqlite3 = new SQLite3(path);
            const sessionTable = new SessionTable(sqlite3);
            const cookie = new Cookie();

            t.assert.doesNotThrow(() => {
                sessionTable.set('no-json', { cookie } as SessionData);
            });

            const stored = sessionTable.get('no-json') as any;
            const { cookie: _cookie, ...rest } = stored;
            t.assert.deepStrictEqual(rest, {});
        });
    }
);
