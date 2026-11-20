import type { SQLite3StoreOptions } from './sqlite3-store.options.js';

import { after, afterEach, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

import { createSession, toPromise } from './sqlite3-store.mock.js';
import { SQLite3Store } from './sqlite3-store.js';

describe(
    'SQLite3Store',
    { concurrency: false },
    () => {
        const path = './sqlite3-store.db';
        const removeDatabase = () => Promise.all(
            [ '', '-wal', '-shm' ].map(x => rm(path + x, { force: true }))
        );

        const opened: SQLite3Store[] = [];
        const open = (options?: boolean | SQLite3StoreOptions) => {
            const store = new SQLite3Store(path, options);
            opened.push(store);
            return store;
        };

        before(removeDatabase);
        afterEach(() => opened.splice(0).forEach(x => x.close()));
        after(removeDatabase);

        it('Create some sessions', async (t: it.TestContext) => {
            const store = open();
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
            const store = open();
            const [ session ] = await toPromise(store, s => s.get)('k666') as any;

            t.assert.deepStrictEqual(session?.foo, 'kek');
        });

        it('Change session "k333" value', async (t: it.TestContext) => {
            const store = open();
            const [ session ] = await toPromise(store, s => s.get)('k333') as any;

            if (!session) {
                t.assert.fail('The session "k333" doesn\'t exists');
            }

            session.perreo = 'ijoeputa';
            await toPromise(store, s => s.set)('k333', session);
        });

        it('Get session "k333" to check the update', async (t: it.TestContext) => {
            const store = open();
            const [ session ] = await toPromise(store, s => s.get)('k333') as any;

            t.assert.deepStrictEqual(session?.perreo, 'ijoeputa');
        });

        it('Touch existing session "k666" only moves its expiration', async (t: it.TestContext) => {
            const store = open();
            const [ session ] = await toPromise(store, s => s.get)('k666') as any;

            if (!session) {
                t.assert.fail('The session "k666" doesn\'t exists');
            }

            const expires = new Date(Date.now() + 120_000);
            session.touched = true;
            session.cookie.expires = expires;
            await toPromise(store, s => s.touch)('k666', session);

            const [ updated ] = await toPromise(store, s => s.get)('k666') as any;
            t.assert.strictEqual(updated?.cookie.expires?.getTime(), expires.getTime());
            t.assert.strictEqual(updated?.touched, undefined);
            t.assert.strictEqual(updated?.foo, 'kek');
        });

        it('Touch a non-existing session does nothing', async (t: it.TestContext) => {
            const store = open();
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

        it('Remove "k333" session', async (t: it.TestContext) => {
            const store = open();
            await toPromise(store, s => s.destroy)('k333');

            const [ session ] = await toPromise(store, s => s.get)('k333');
            t.assert.strictEqual(session, null);

            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.strictEqual(length, 2);
        });

        it('Remove all sessions', async (t: it.TestContext) => {
            const store = open();
            await toPromise(store, s => s.clear)();

            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.strictEqual(length, 0);
        });

        it('Touch keeps a session alive past its old expiration', async (t: it.TestContext) => {
            let clock = Date.UTC(2030, 0, 1);
            const store = open({ now: () => clock, purgeIntervalMs: 0 });
            const get = toPromise(store, s => s.get);
            const session = createSession({
                json: { foo: 'rolling' },
                expires: new Date(clock + 1_000)
            });

            await toPromise(store, s => s.set)('k-rolling', session);

            clock += 800;
            session.cookie.expires = new Date(clock + 1_000);
            await toPromise(store, s => s.touch)('k-rolling', session);

            // Past the first expiration, before the new one.
            clock += 500;
            const [ alive ] = await get('k-rolling') as any;
            t.assert.strictEqual(alive?.foo, 'rolling');

            // Past the new expiration.
            clock += 600;
            const [ expired ] = await get('k-rolling');
            t.assert.strictEqual(expired, null);

            // A touch doesn't bring back a session that already expired.
            session.cookie.expires = new Date(clock + 1_000);
            await toPromise(store, s => s.touch)('k-rolling', session);
            const [ stillExpired ] = await get('k-rolling');
            t.assert.strictEqual(stillExpired, null);
        });

        it('all() and length() skip expired sessions without deleting them', async (t: it.TestContext) => {
            const store = open({ purgeIntervalMs: 0 });
            await toPromise(store, s => s.clear)();
            await toPromise(store, s => s.set)('k-old', createSession({
                json: { foo: 'old' },
                expires: new Date(Date.now() - 1_000)
            }));

            await toPromise(store, s => s.set)('k-new', createSession({
                json: { foo: 'new' },
                maxAge: 30_000
            }));

            const [ all ] = await toPromise(store, s => s.all)() as any;
            const [ length ] = await toPromise(store, s => s.length)();
            t.assert.deepStrictEqual(all.map((x: any) => x.foo), [ 'new' ]);
            t.assert.strictEqual(length, 1);
            t.assert.strictEqual(store.purge(), 1);
        });

        it('The timer purges the expired sessions', async (t: it.TestContext) => {
            t.mock.timers.enable({ apis: [ 'setInterval' ] });

            const store = open({ purgeIntervalMs: 1_000 });
            const purge = t.mock.method(store, 'purge');
            await toPromise(store, s => s.set)('k-expired', createSession({
                json: { foo: 'expired' },
                expires: new Date(Date.now() - 1_000)
            }));

            t.mock.timers.tick(999);
            t.assert.strictEqual(purge.mock.callCount(), 0);

            t.mock.timers.tick(1);
            t.assert.strictEqual(purge.mock.callCount(), 1);
            t.assert.strictEqual(purge.mock.calls[0]?.result, 1);
        });

        it('close() stops the timer and closes the database', async (t: it.TestContext) => {
            t.mock.timers.enable({ apis: [ 'setInterval' ] });

            const store = open({ purgeIntervalMs: 1_000 });
            const purge = t.mock.method(store, 'purge');

            t.mock.timers.tick(1_000);
            t.assert.strictEqual(purge.mock.callCount(), 1);

            store.close();
            t.mock.timers.tick(10_000);
            t.assert.strictEqual(purge.mock.callCount(), 1);

            // Closing twice is fine, and the other methods report an error.
            t.assert.doesNotThrow(() => store.close());
            await t.assert.rejects(toPromise(store, s => s.get)('k999'));
        });

        it('An open store doesn\'t keep the process alive', (t: it.TestContext) => {
            const fixture = fileURLToPath(
                new URL('./sqlite3-store.exit.fixture.ts', import.meta.url)
            );

            const child = spawnSync(
                process.execPath,
                [ '--import', '@bleed-believer/cli', fixture ],
                { timeout: 20_000, encoding: 'utf-8' }
            );

            t.assert.strictEqual(child.signal, null, 'The process didn\'t exit on its own');
            t.assert.strictEqual(child.status, 0, child.stderr);
        });

        it('Still accepts a boolean as the second argument', (t: it.TestContext) => {
            t.assert.doesNotThrow(() => open(false));
        });

        it('Rejects an invalid purge interval', (t: it.TestContext) => {
            for (const purgeIntervalMs of [ -1, NaN, Infinity, 2 ** 31 ]) {
                t.assert.throws(
                    () => open({ purgeIntervalMs }),
                    RangeError
                );
            }
        });
    }
);
