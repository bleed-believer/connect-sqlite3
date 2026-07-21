import type { QueryBuilder } from './interfaces/query-builder.js';

/**
 * Builds a `DELETE` statement.
 *
 * Instances are immutable: every chainable method returns a new builder
 * rather than mutating the current one, so intermediate builders can be
 * safely reused and shared.
 *
 * @example
 * ```ts
 * const qb = new DeleteQueryBuilder('User')
 *     .where('User.id = ?', 1);
 *
 * qb.getQuery();
 * qb.getParameters();
 * ```
 */
export class DeleteQueryBuilder implements QueryBuilder {
    #tableName: string;
    #where: string[] = [];
    #whereParameters: unknown[] = [];

    /**
     * @param tableName Name of the table to delete rows from.
     */
    constructor(tableName: string) {
        this.#tableName = tableName;
    }

    /**
     * Returns a new builder with the `WHERE` clause replaced by the given
     * expression, discarding any conditions set by previous calls to
     * `where`, `andWhere` or `orWhere`.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    where(expression: string, ...parameters: unknown[]): DeleteQueryBuilder {
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#where = [ expression ];
        qb.#whereParameters = parameters.slice();
        return qb;
    }

    /**
     * Returns a new builder with an `AND`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link DeleteQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    andWhere(expression: string, ...parameters: unknown[]): DeleteQueryBuilder {
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#where = [ ...this.#where, `AND ${expression}` ];
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        return qb;
    }

    /**
     * Returns a new builder with an `OR`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link DeleteQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    orWhere(expression: string, ...parameters: unknown[]): DeleteQueryBuilder {
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#where = [ ...this.#where, `OR ${expression}` ];
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        return qb;
    }

    /**
     * Returns the parameters bound to the `?` placeholders of the `WHERE`
     * clause built by {@link DeleteQueryBuilder.getQuery}.
     */
    getParameters(): unknown[] {
        return this.#whereParameters.slice();
    }

    /**
     * Builds the `DELETE` statement, including the `WHERE` clause if one
     * has been set.
     */
    getQuery(): string {
        const query = [ `DELETE FROM [${this.#tableName}]` ];

        if (this.#where.length > 0)
            query.push('WHERE', ...this.#where);

        return query.join('\n');
    }
}
