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

    it('Delete from table with a single join', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .join({
                type: 'left',
                target: 'Profile',
                alias: 'Profile',
                on: 'Profile.userId = User.id AND Profile.active = ?',
                parameters: [ 1 ],
            });

        t.assert.deepStrictEqual(qb.getParameters(), [ 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `LEFT JOIN [Profile] AS [Profile] ON Profile.userId = User.id AND Profile.active = ?`,
        ].join('\n'));
    });

    it('Delete from table with multiple joins and where expression', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .join({
                type: 'inner',
                target: 'Profile',
                on: 'Profile.userId = User.id',
            })
            .addJoin({
                type: 'left',
                target: 'Team',
                alias: 'Team',
                on: 'Team.id = User.teamId AND Team.active = ?',
                parameters: [ 1 ],
            })
            .where('User.path != ?', '/');

        t.assert.deepStrictEqual(qb.getParameters(), [ 1, '/' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `INNER JOIN [Profile] ON Profile.userId = User.id`,
            `LEFT JOIN [Team] AS [Team] ON Team.id = User.teamId AND Team.active = ?`,
            `WHERE`,
            `User.path != ?`,
        ].join('\n'));
    });

    it('Keeps parameters aligned with `?` placeholders when where() is called before join()', (t: it.TestContext) => {
        const qb = new DeleteQueryBuilder('User')
            .where('User.path != ?', '/')
            .join({
                type: 'left',
                target: 'Profile',
                alias: 'Profile',
                on: 'Profile.userId = User.id AND Profile.active = ?',
                parameters: [ 1 ],
            });

        // The JOIN clause is rendered before the WHERE clause regardless of
        // call order, so its parameter must come before the WHERE one too.
        t.assert.deepStrictEqual(qb.getParameters(), [ 1, '/' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `DELETE FROM [User]`,
            `LEFT JOIN [Profile] AS [Profile] ON Profile.userId = User.id AND Profile.active = ?`,
            `WHERE`,
            `User.path != ?`,
        ].join('\n'));
    });
});
