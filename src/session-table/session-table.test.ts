import { SessionTable } from './session-table.js';
import { SQLite3 } from '../sqlite3/index.js';

import { after, afterEach, before, describe, it } from 'node:test';
import { Cookie, type SessionData } from 'express-session';
import { rm } from 'node:fs/promises';

describe(
    'SessionTable',
    { concurrency: false },
    () => {
        const path = './session-table.db';
        const daemonExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
        const removeDatabase = () => Promise.all(
            [ '', '-wal', '-shm' ].map(x => rm(path + x, { force: true }))
        );

        const opened: SQLite3[] = [];
        const open = (now?: () => number) => {
            const sqlite3 = new SQLite3(path);
            opened.push(sqlite3);
            return new SessionTable(sqlite3, now);
        };

        before(removeDatabase);
        afterEach(() => opened.splice(0).forEach(x => x.close()));
        after(removeDatabase);

        it('Create table', (t: it.TestContext) => {
            const sessionTable = open();
            t.assert.strictEqual(sessionTable.getLength(), 0);
        });

        it('Create a session', (t: it.TestContext) => {
            const sessionTable = open();
            const foo = 'bar';
            const cookie = new Cookie();
            cookie.path = '/joder/chaval';
            cookie.expires = daemonExpires;
            cookie.httpOnly = true;

            sessionTable.set('daemon666', { cookie, foo } as SessionData);
            t.assert.notStrictEqual(sessionTable.get('daemon666'), null);
        });

        it('Get the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = open();
            const { cookie, foo } = sessionTable.get('daemon666') as any ?? {};
            t.assert.strictEqual(cookie?.path, '/joder/chaval');
            t.assert.strictEqual(cookie?.expires?.toJSON(), daemonExpires.toJSON());
            t.assert.strictEqual(cookie?.httpOnly, true);
            t.assert.deepStrictEqual(foo, 'bar');
        });

        it('Update the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = open();
            const session = sessionTable.get('daemon666') as any;
            if (!session) {
                t.assert.fail('This test must gets an existing session');
            }

            session.caca = true;
            sessionTable.set('daemon666', session);

            const { foo, caca } = sessionTable.get('daemon666') as any ?? {};
            t.assert.deepStrictEqual(foo, 'bar');
            t.assert.deepStrictEqual(caca, true);
            t.assert.strictEqual(sessionTable.getLength(), 1);
        });

        it('Delete the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = open();
            sessionTable.delete('daemon666');
            t.assert.strictEqual(sessionTable.get('daemon666'), null);
        });

        it('get() doesn\'t return an expired session, without any purge', (t: it.TestContext) => {
            const sessionTable = open();
            const ñeee = true;
            const cookie = new Cookie();
            cookie.expires = new Date(2000, 0, 0);

            sessionTable.set('ñee', { ñeee, cookie } as SessionData);
            t.assert.strictEqual(sessionTable.get('ñee'), null);

            // The row is still there: only the purge deletes it.
            t.assert.strictEqual(sessionTable.purge(), 1);
        });

        it('get() doesn\'t return a session that expired earlier today', (t: it.TestContext) => {
            const sessionTable = open();
            const today = true;
            const cookie = new Cookie();
            cookie.expires = new Date(Date.now() - 1_000);

            sessionTable.set('today-expired', { today, cookie } as SessionData);
            t.assert.strictEqual(sessionTable.get('today-expired'), null);
        });

        it('getAll() excludes a session that expired earlier today', (t: it.TestContext) => {
            const sessionTable = open();
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
            const sessionTable = open();
            const noExpiry = true;
            const cookie = new Cookie();

            sessionTable.set('no-expiry', { noExpiry, cookie } as SessionData);
            const all = sessionTable.getAll();
            t.assert.strictEqual(
                all.some(s => (s as any).noExpiry === true),
                true
            );
        });

        it('purge() deletes only the expired sessions and returns how many', (t: it.TestContext) => {
            let clock = Date.UTC(2030, 0, 1);
            const sessionTable = open(() => clock);
            sessionTable.clear();

            const add = (sid: string, expires?: number) => {
                const cookie = new Cookie();
                if (typeof expires === 'number') {
                    cookie.expires = new Date(expires);
                }

                sessionTable.set(sid, { cookie } as SessionData);
            };

            add('expired-a', clock - 60_000);
            add('expired-b', clock);            // expires exactly now
            add('alive', clock + 60_000);
            add('forever');

            t.assert.strictEqual(sessionTable.purge(), 2);
            t.assert.strictEqual(sessionTable.purge(), 0);
            t.assert.notStrictEqual(sessionTable.get('alive'), null);
            t.assert.notStrictEqual(sessionTable.get('forever'), null);

            // Far in the future, only the session without expiration is left.
            clock += 1000 * 60 * 60 * 24 * 365 * 100;
            t.assert.strictEqual(sessionTable.purge(), 1);
            t.assert.strictEqual(sessionTable.getLength(), 1);
            t.assert.notStrictEqual(sessionTable.get('forever'), null);
        });

        it('round-trips the partitioned and priority cookie attributes', (t: it.TestContext) => {
            const sessionTable = open();
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
            const sessionTable = open();
            const rolling = true;
            const cookie = new Cookie();
            cookie.maxAge = 60_000;

            sessionTable.set('rolling-cookie', { rolling, cookie } as SessionData);

            const stored = sessionTable.get('rolling-cookie');
            t.assert.strictEqual(stored?.cookie.originalMaxAge, 60_000);
        });

        it('set() defaults a missing payload to {} instead of throwing', (t: it.TestContext) => {
            const sessionTable = open();
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
