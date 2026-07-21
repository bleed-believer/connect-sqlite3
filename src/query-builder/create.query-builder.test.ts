import { CreateQueryBuilder } from './create.query-builder.js';
import { describe, it } from 'node:test';

describe('CreateQueryBuilder', () => {
    it('Create a table', (t: it.TestContext) => {
        const qb = new CreateQueryBuilder('User')
            .addColumn('nick',          { type: 'VARCHAR', nullable: false })
            .addColumn('pass',          { type: 'VARCHAR', nullable: false });

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `CREATE TABLE [User](`,
            `[nick] VARCHAR NOT NULL,`,
            `[pass] VARCHAR NOT NULL`,
            `)`,
        ].join('\n'));
    });

    it('Create a table with: primary key', (t: it.TestContext) => {
        const qb = new CreateQueryBuilder('User')
            .addColumn('id',            { type: 'INTEGER', primary: true })
            .addColumn('nick',          { type: 'VARCHAR', nullable: false })
            .addColumn('pass',          { type: 'VARCHAR', nullable: false });

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `CREATE TABLE [User](`,
            `[id] INTEGER PRIMARY KEY,`,
            `[nick] VARCHAR NOT NULL,`,
            `[pass] VARCHAR NOT NULL`,
            `)`,
        ].join('\n'));
    });

    it('Create a table with: primary key; default value', (t: it.TestContext) => {
        const qb = new CreateQueryBuilder('User')
            .addColumn('id',            { type: 'INTEGER', primary: true })
            .addColumn('nick',          { type: 'VARCHAR', nullable: false })
            .addColumn('pass',          { type: 'VARCHAR', nullable: false })
            .addColumn('path',          { type: 'VARCHAR', default: '/' });

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `CREATE TABLE [User](`,
            `[id] INTEGER PRIMARY KEY,`,
            `[nick] VARCHAR NOT NULL,`,
            `[pass] VARCHAR NOT NULL,`,
            `[path] VARCHAR DEFAULT '/'`,
            `)`,
        ].join('\n'));
    });

    it('Create a table with: primary key; default value; foreign key', (t: it.TestContext) => {
        const qb = new CreateQueryBuilder('User')
            .addColumn('id',            { type: 'INTEGER', primary: true })
            .addColumn('userTypeId',    { type: 'INTEGER', foreign: { tableName: 'UserType', columnName: 'id' } })
            .addColumn('nick',          { type: 'VARCHAR', nullable: false })
            .addColumn('pass',          { type: 'VARCHAR', nullable: false })
            .addColumn('path',          { type: 'VARCHAR', default: '/' });

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `CREATE TABLE [User](`,
            `[id] INTEGER PRIMARY KEY,`,
            `[userTypeId] INTEGER,`,
            `[nick] VARCHAR NOT NULL,`,
            `[pass] VARCHAR NOT NULL,`,
            `[path] VARCHAR DEFAULT '/',`,
            `FOREIGN KEY (userTypeId) REFERENCES [UserType]([id])`,
            `)`,
        ].join('\n'));
    });
});