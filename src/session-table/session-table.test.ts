import { SessionTable } from './session-table.js';

import { after, before, describe, it } from 'node:test';
import { Cookie } from 'express-session';
import { rm } from 'node:fs/promises';

describe(
    'SessionTable',
    { concurrency: false },
    () => {
        const path = './session-table.db';
        const name = 'connect-sqlite3-session';

        before(() => rm(path, { force: true }));
        after (() => rm(path, { force: true }));

        it('Create table', (_: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            sessionTable.createTable();
        });

        it('Create a session', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { foo: 'bar' };
            const cookie = new Cookie();
            cookie.path = '/joder/chaval';
            cookie.expires = new Date(2000, 0, 1);
            cookie.httpOnly = true;

            sessionTable.insert('daemon666', { cookie, json });
            t.assert.strictEqual(sessionTable.exists('daemon666'), true);
        });

        it('Get the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const { cookie, json } = sessionTable.get('daemon666') ?? {};
            t.assert.strictEqual(cookie?.path, '/joder/chaval');
            t.assert.strictEqual(cookie?.expires?.toJSON(), new Date(2000, 0, 1)?.toJSON());
            t.assert.strictEqual(cookie?.httpOnly, true);
            t.assert.deepStrictEqual(json, { foo: 'bar' });
        });

        it('Update the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const session = sessionTable.get('daemon666');
            if (!session) {
                t.assert.fail('This test must gets an existing session');
            }

            session.json['caca'] = true;
            sessionTable.update('daemon666', session);

            const { json } = sessionTable.get('daemon666') ?? {};
            t.assert.deepStrictEqual(json, {
                foo: 'bar',
                caca: true
            });
        });

        it('Delete the session "daemon666"', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            sessionTable.delete('daemon666');
            t.assert.strictEqual(sessionTable.exists('daemon666'), false);
        });
        

        it('Purgue expired sessions', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { ñeee: true };
            const cookie = new Cookie();
            cookie.expires = new Date(2000, 0, 0);

            sessionTable.insert('ñee', { json, cookie });
            t.assert.strictEqual(sessionTable.exists('ñee'), true);

            sessionTable.clearExpired();
            t.assert.strictEqual(sessionTable.exists('ñee'), false);
        });

        it('Purgue a session that expired earlier today', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { today: true };
            const cookie = new Cookie();
            cookie.expires = new Date(Date.now() - 1_000);

            sessionTable.insert('today-expired', { json, cookie });
            t.assert.strictEqual(sessionTable.exists('today-expired'), true);

            sessionTable.clearExpired();
            t.assert.strictEqual(sessionTable.exists('today-expired'), false);
        });

        it('getAll() excludes a session that expired earlier today', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { today: true };
            const cookie = new Cookie();
            cookie.expires = new Date(Date.now() - 1_000);

            sessionTable.insert('today-expired-2', { json, cookie });
            const all = sessionTable.getAll();
            t.assert.strictEqual(
                all.some(s => s.json['today'] === true),
                false
            );
        });

        it('getAll() includes a session with no expiration date', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { noExpiry: true };
            const cookie = new Cookie();

            sessionTable.insert('no-expiry', { json, cookie });
            const all = sessionTable.getAll();
            t.assert.strictEqual(
                all.some(s => s.json['noExpiry'] === true),
                true
            );
        });

        it('round-trips the partitioned and priority cookie attributes', (t: it.TestContext) => {
            const sessionTable = new SessionTable(path, name);
            const json = { chips: true };
            const cookie = new Cookie();
            cookie.partitioned = true;
            cookie.priority = 'high';

            sessionTable.insert('chips-cookie', { json, cookie });

            const stored = sessionTable.get('chips-cookie');
            t.assert.strictEqual(stored?.cookie.partitioned, true);
            t.assert.strictEqual(stored?.cookie.priority, 'high');
        });
    }
);