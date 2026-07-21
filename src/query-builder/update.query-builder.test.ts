import { UpdateQueryBuilder } from './update.query-builder.js';
import { describe, it } from 'node:test';

describe('UpdateQueryBuilder', () => {
    it('Update a single column', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
        ].join('\n'));
    });

    it('Update multiple columns', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .set('path', '/foo');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/foo' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?,`,
            `[path] = ?`,
        ].join('\n'));
    });

    it('Update with where expression', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.id = ?', 1);

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.id = ?`,
        ].join('\n'));
    });

    it('Update with where expression (OR)', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.path != ?', '/')
            .orWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.path != ?`,
            `OR User.nick like ?`,
        ].join('\n'));
    });

    it('Update with where expression (AND)', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.path != ?', '/')
            .andWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.path != ?`,
            `AND User.nick like ?`,
        ].join('\n'));
    });

    it('Update with a single join', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .join({
                type: 'left',
                target: 'Profile',
                alias: 'Profile',
                on: 'Profile.userId = User.id AND Profile.active = ?',
                parameters: [ 1 ],
            });

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `LEFT JOIN [Profile] AS [Profile] ON Profile.userId = User.id AND Profile.active = ?`,
        ].join('\n'));
    });

    it('Update with multiple joins and where expression', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
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

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', 1, '/' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `INNER JOIN [Profile] ON Profile.userId = User.id`,
            `LEFT JOIN [Team] AS [Team] ON Team.id = User.teamId AND Team.active = ?`,
            `WHERE`,
            `User.path != ?`,
        ].join('\n'));
    });

    it('Keeps parameters aligned with `?` placeholders when where() is called before join()', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
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
        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', 1, '/' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `LEFT JOIN [Profile] AS [Profile] ON Profile.userId = User.id AND Profile.active = ?`,
            `WHERE`,
            `User.path != ?`,
        ].join('\n'));
    });
});
