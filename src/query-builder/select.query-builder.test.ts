import { SelectQueryBuilder } from './select.query-builder.js';
import { describe, it } from 'node:test';

describe('SelectQueryBuilder', () => {
    it('Select fixed values', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `666 as [foo]`,
                `999 as [bar]`,
            );

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `666 as [foo],`,
            `999 as [bar]`,
        ].join('\n'));
    });

    it('Select from table', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User');

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
        ].join('\n'));
    });

    it('Select from table with pagination', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .limit(10)
            .skip(50);

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `LIMIT 10`,
            `SKIP 50`,
        ].join('\n'));
    });

    it('Select from table and where expression (OR)', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .where('User.path != ?', '/')
            .orWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `OR User.nick like ?`,
        ].join('\n'));
    });

    it('Select from table and where expression (AND)', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .where('User.path != ?', '/')
            .andWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `AND User.nick like ?`,
        ].join('\n'));
    });
});