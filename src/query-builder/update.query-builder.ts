import type { QueryBuilder } from './interfaces/query-builder.js';

/**
 * Builds an `UPDATE` statement.
 *
 * Instances are immutable: every chainable method returns a new builder
 * rather than mutating the current one, so intermediate builders can be
 * safely reused and shared.
 *
 * @example
 * ```ts
 * const qb = new UpdateQueryBuilder('User')
 *     .set('nick', 'foo')
 *     .where('User.id = ?', 1);
 *
 * qb.getQuery();
 * qb.getParameters();
 * ```
 */
export class UpdateQueryBuilder implements QueryBuilder {
    #tableName: string;
    #set: string[] = [];
    #setParameters: unknown[] = [];
    #where: string[] = [];
    #whereParameters: unknown[] = [];

    /**
     * @param tableName Name of the table to update.
     */
    constructor(tableName: string) {
        this.#tableName = tableName;
    }

    /**
     * Returns a new builder with an additional `[column] = ?` assignment
     * appended to the `SET` clause.
     *
     * @param column Name of the column to assign.
     * @param value Value bound to the assignment's `?` placeholder.
     */
    set(column: string, value: unknown): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#set = [ ...this.#set, `[${column}] = ?` ];
        qb.#setParameters = [ ...this.#setParameters, value ];
        qb.#where = this.#where.slice();
        qb.#whereParameters = this.#whereParameters.slice();
        return qb;
    }

    /**
     * Returns a new builder with the `WHERE` clause replaced by the given
     * expression, discarding any conditions set by previous calls to
     * `where`, `andWhere` or `orWhere`.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    where(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#set = this.#set.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ expression ];
        qb.#whereParameters = parameters.slice();
        return qb;
    }

    /**
     * Returns a new builder with an `AND`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link UpdateQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    andWhere(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#set = this.#set.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ ...this.#where, `AND ${expression}` ];
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        return qb;
    }

    /**
     * Returns a new builder with an `OR`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link UpdateQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    orWhere(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#set = this.#set.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ ...this.#where, `OR ${expression}` ];
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        return qb;
    }

    /**
     * Returns the parameters bound to the `?` placeholders of the built
     * query, in order: first the `SET` assignments, then the `WHERE`
     * conditions.
     */
    getParameters(): unknown[] {
        return [ ...this.#setParameters, ...this.#whereParameters ];
    }

    /**
     * Builds the `UPDATE` statement, including the `WHERE` clause if one
     * has been set.
     */
    getQuery(): string {
        const query = [
            `UPDATE [${this.#tableName}]`,
            `SET`,
            this.#set.join(',\n'),
        ];

        if (this.#where.length > 0)
            query.push('WHERE', ...this.#where);

        return query.join('\n');
    }
}
