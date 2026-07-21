import { DeleteQueryBuilder } from './delete.query-builder.js';
import { describe, it } from 'node:test';

describe('DeleteQueryBuilder', () => {
    it('Delete from table', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User');

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
        ].join('\n'));
    });

    it('Delete from table with where expression', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .where('User.id = ?', 1);

        t.assert.deepStrictEqual(qb.getParameters(), [ 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `WHERE`,
            `User.id = ?`,
        ].join('\n'));
    });

    it('Delete from table with where expression (OR)', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .where('User.path != ?', '/')
            .orWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `OR User.nick like ?`,
        ].join('\n'));
    });

    it('Delete from table with where expression (AND)', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .where('User.path != ?', '/')
            .andWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `AND User.nick like ?`,
        ].join('\n'));
    });
});
