import type { JoinDescriptor } from './interfaces/join-descriptor.js';
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
    #whereParameters: unknown[] = [];
    #joinParameters: unknown[][] = [];
    #tableName: string;
    #where: string[] = [];
    #join: Omit<JoinDescriptor, 'parameters'>[] = [];

    /**
     * @param tableName Name of the table to delete rows from.
     */
    constructor(tableName: string) {
        this.#tableName = tableName;
    }

    /**
     * Returns a new builder with the `JOIN` clauses replaced by the given
     * descriptor, discarding any joins set by previous calls to
     * {@link DeleteQueryBuilder.join} or {@link DeleteQueryBuilder.addJoin}.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    join(descriptor: JoinDescriptor): DeleteQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#whereParameters = this.#whereParameters.slice();
        qb.#joinParameters = [ parameters?.slice() ?? [] ];
        qb.#where = this.#where.slice();
        qb.#join = [ rest ];
        return qb;
    }

    /**
     * Returns a new builder with the given join appended to the ones
     * already set.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    addJoin(descriptor: JoinDescriptor): DeleteQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#whereParameters = this.#whereParameters.slice();
        qb.#joinParameters = [ ...this.#joinParameters, parameters?.slice() ?? [] ];
        qb.#where = this.#where.slice();
        qb.#join = [ ...this.#join, rest ];
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
    where(expression: string, ...parameters: unknown[]): DeleteQueryBuilder {
        const qb = new DeleteQueryBuilder(this.#tableName);
        qb.#where = [ expression ];
        qb.#whereParameters = parameters.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#join = this.#join.slice();
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
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#where = [ ...this.#where, `AND ${expression}` ];
        qb.#join = this.#join.slice();
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
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#where = [ ...this.#where, `OR ${expression}` ];
        qb.#join = this.#join.slice();
        return qb;
    }

    /**
     * Returns the parameters bound to the `?` placeholders of the built
     * query, in order: first the `JOIN` conditions, then the `WHERE`
     * conditions.
     */
    getParameters(): unknown[] {
        return [ ...this.#joinParameters.flat(), ...this.#whereParameters ];
    }

    /**
     * Builds the `DELETE` statement, including the `JOIN` and `WHERE`
     * clauses if any have been set.
     */
    getQuery(): string {
        const query = [ `DELETE FROM [${this.#tableName}]` ];

        for (const j of this.#join) {
            const target = typeof j.alias === 'string'
                ?   `[${j.target}] AS [${j.alias}]`
                :   `[${j.target}]`;

            query.push(`${j.type.toUpperCase()} JOIN ${target} ON ${j.on}`);
        }

        if (this.#where.length > 0)
            query.push('WHERE', ...this.#where);

        return query.join('\n');
    }
}
