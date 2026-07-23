import { describe, it, before, after } from 'node:test';
import { SQLite3Session } from './sqlite3-session.js';
import { rm } from 'node:fs/promises';
import Database from 'better-sqlite3';

describe(
    'SQLite3Session',
    { concurrency: false },
    () => {
        const path = './database.db';
        const name = 'sqlite3-session';
        const date = new Date();

        before(() => rm(path, { force: true }));
        after (() => rm(path, { force: true }));

        it('Create table', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            session
                .createStatement()
                .run();

            const { count } = database
                .prepare<[ string ], { count: number; }>(
                    `--sql
                    SELECT
                        COUNT(sqlite_schema.name) AS count
                    
                    FROM sqlite_schema
                    
                    WHERE
                        sqlite_schema.tbl_name = ?
                    AND sqlite_schema.type = 'table'`
                )
                .all(name)[0];

            t.assert.strictEqual(count, 1);
        });

        it('Insert session', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            session
                .insertStatement()
                .run(
                    '/',
                    JSON.stringify({ foo: 'bar' }),
                    null,
                    null,
                    null,
                    date.toISOString(),
                    1,
                    null,
                    null,
                    null,
                    'k666',
                );

            const data = database
                .prepare(
                    `--sql
                    SELECT
                        *
                    
                    FROM [${name}]`
                )
                .get();

            t.assert.deepStrictEqual(data, {
                sid: 'k666',
                json: '{"foo":"bar"}',
                path: '/',
                domain: null,
                signed: null,
                secure: null,
                expires: date.toISOString(),
                httpOnly: 1,
                sameSite: null,
                priority: null,
                partitioned: null
            });
        });

        it('Update session', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            session
                .updateStatement()
                .run(
                    '/',
                    JSON.stringify({ foo: 'bak' }),
                    null,
                    null,
                    null,
                    date.toISOString(),
                    1,
                    null,
                    null,
                    null,
                    'k666',
                );

            const data = database
                .prepare(
                    `--sql
                    SELECT
                        *
                    
                    FROM [${name}]
                    
                    WHERE
                        [${name}].sid = ?`
                )
                .get('k666');

            t.assert.deepStrictEqual(data, {
                sid: 'k666',
                json: '{"foo":"bak"}',
                path: '/',
                domain: null,
                signed: null,
                secure: null,
                expires: date.toISOString(),
                httpOnly: 1,
                sameSite: null,
                priority: null,
                partitioned: null
            });
        });

        it('Get session', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            const data = session
                .getStatement()
                .get('k666');

            t.assert.deepStrictEqual(data, {
                path: '/',
                json: '{"foo":"bak"}',
                domain: null,
                signed: null,
                secure: null,
                expires: date.toISOString(),
                httpOnly: 1,
                sameSite: null,
                priority: null,
                partitioned: null
            });
        });

        it('Get exists', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            const found    = session.getExistsStatement().get('k666');
            const notFound = session.getExistsStatement().get('ghost');

            t.assert.strictEqual(found?.exists, 1);
            t.assert.strictEqual(notFound?.exists, 0);
        });

        it('Get length', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            const { count } = session.getLengthStatement().get() ?? { count: 0 };

            t.assert.strictEqual(count, 1);
        });

        it('Get all', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
            const past   = new Date(Date.now() - 1000 * 60 * 60 * 24);

            session
                .insertStatement()
                .run(
                    '/', JSON.stringify({ foo: 'future' }), null, null, null,
                    future.toISOString(), 1, null, null, null, 'future',
                );

            session
                .insertStatement()
                .run(
                    '/', JSON.stringify({ foo: 'expired' }), null, null, null,
                    past.toISOString(), 1, null, null, null, 'expired',
                );

            session
                .insertStatement()
                .run(
                    '/', JSON.stringify({ foo: 'forever' }), null, null, null,
                    null, 1, null, null, null, 'forever',
                );

            const jsons = session
                .getAllStatement()
                .all()
                .map(x => x.json);

            t.assert.ok(jsons.includes(JSON.stringify({ foo: 'future' })));
            t.assert.ok(jsons.includes(JSON.stringify({ foo: 'forever' })));
            t.assert.ok(!jsons.includes(JSON.stringify({ foo: 'expired' })));
        });

        it('Clear expired sessions', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            session
                .clearExpiredStatement()
                .run();

            const sids = database
                .prepare<[], { sid: string; }>(
                    `--sql
                    SELECT [sid] FROM [${name}]`
                )
                .all()
                .map(x => x.sid);

            t.assert.ok(!sids.includes('expired'));
            t.assert.ok(sids.includes('future'));
            t.assert.ok(sids.includes('forever'));
        });

        it('Clear all sessions', (t: it.TestContext) => {
            const database = new Database(path);
            const session = new SQLite3Session(database, name);

            session
                .clearStatement()
                .run();

            const { count } = session.getLengthStatement().get() ?? { count: 0 };

            t.assert.strictEqual(count, 0);
        });
    }
);