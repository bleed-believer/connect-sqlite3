import { after, before, describe, it } from 'node:test';
import { rm } from 'node:fs/promises';

import { createSession, toPromise } from './sqlite3-store.mock.js';
import { SQLite3Store } from './sqlite3-store.js';

describe(
    'SQLite3Store',
    { concurrency: false },
    () => {
        const path = './sqlite3-store.db';
        const name = 'sqlite3-store-session';

        before(() => rm(path, { force: true }));
        after (() => rm(path, { force: true }));

        it('Create some sessions', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            store.set('k999', createSession({
                json: { foo: 'bar' },
                path: '/',
                maxAge: 30_000
            }));

            store.set('k666', createSession({
                json: { foo: 'kek' },
                path: '/joder',
                maxAge: 30_000
            }));

            store.set('k333', createSession({
                json: { foo: 'nya' },
                path: '/joder/chaval',
                maxAge: 30_000
            }));

            const amount = await new Promise<number>((resolve, reject) => {
                store.length((err, v) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(v ?? 0);
                    }
                });
            });

            t.assert.strictEqual(amount, 3);
        });

        it('Get session "k666"', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            const [ session ] = await toPromise(store, s => s.get)('k666');

            t.assert.deepStrictEqual(session?.json, { foo: 'kek' });
        });

        it('Change session "k333" value', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            const [ session ] = await toPromise(store, s => s.get)('k333');

            if (!session) {
                t.assert.fail('The session "k333" doesn\'t exists');
            }

            session.json = { perreo: 'ijoeputa' };
            await toPromise(store, s => s.set)('k333', session);
        });

        it('Get session "k333" to check the update', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            const [ session ] = await toPromise(store, s => s.get)('k333');

            t.assert.deepStrictEqual(session?.json, { perreo: 'ijoeputa' });
        });

        it('Touch existing session "k666" updates its data', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            const [ session ] = await toPromise(store, s => s.get)('k666');

            if (!session) {
                t.assert.fail('The session "k666" doesn\'t exists');
            }

            session.json = { touched: true };
            await toPromise(store, s => s.touch)('k666', session);

            const [ updated ] = await toPromise(store, s => s.get)('k666');
            t.assert.deepStrictEqual(updated?.json, { touched: true });
        });

        it('Touch a non-existing session does nothing', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            const session = createSession({
                json: { foo: 'ghost' },
                path: '/',
                maxAge: 30_000
            });

            await toPromise(store, s => s.touch)('k000', session);

            const [ missing ] = await toPromise(store, s => s.get)('k000');
            t.assert.strictEqual(missing, null);

            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.strictEqual(length, 3);
        });

        it('Remove "k999" session', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            await toPromise(store, s => s.destroy)('k333');

            const [ session ] = await toPromise(store, s => s.get)('k333');
            t.assert.strictEqual(session, null);

            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.strictEqual(length, 2);
        });

        it('Remove all sessions', async (t: it.TestContext) => {
            const store = new SQLite3Store(path, name);
            await toPromise(store, s => s.clear)();

            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.strictEqual(length, 0);
        });
    }
)