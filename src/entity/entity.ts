import type {
    EntityRelationDescriptor,
    OperatorDescriptor,
    EntityOptions,
    FindOptions,
    FindResult,
    FindSelect
} from './interfaces/index.js';
import type { ColumnDescriptor, JoinDescriptor } from '../query-builder/index.js';

import { CreateQueryBuilder, SelectQueryBuilder } from '../query-builder/index.js';

function isOperatorDescriptor(value: unknown): value is OperatorDescriptor<unknown> {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { expression?: unknown }).expression === 'function';
}

export class Entity<O extends EntityOptions> {
    static relation<E extends { options: EntityOptions }>(
        entity: E,
        options: Omit<EntityRelationDescriptor<E>, 'entity'>
    ): EntityRelationDescriptor<E> {
        return {
            entity,
            type: options.type,
            column: options.column
        };
    }

    /**
     * Recovers the column name targeted by a relation's `column` callback:
     * the callback returns one of the related entity's column
     * descriptors, so the name is found by identity within its columns.
     */
    #resolveRelationColumn(rel: EntityRelationDescriptor<Entity<EntityOptions>>): string {
        const columns = rel.entity.options.column;
        const target = rel.column(columns);
        const entry = Object.entries(columns).find(([ , v ]) => v === target);
        if (!entry)
            throw new Error(`Could not resolve the referenced column for relation targeting [${rel.entity.options.name}]`);

        return entry[0];
    }

    #buildSelectClauses(
        select: Record<string, boolean | Record<string, boolean>>,
        relations: Record<string, EntityRelationDescriptor<Entity<EntityOptions>>>
    ): string[] {
        const clauses: string[] = [];
        for (const [ key, value ] of Object.entries(select)) {
            if (value === true) {
                clauses.push(`[${this.#options.name}].[${key}] AS [${key}]`);
                continue;
            }

            const rel = relations[key];
            if (!value || !rel)
                continue;

            for (const [ nestedKey, nestedValue ] of Object.entries(value)) {
                if (nestedValue)
                    clauses.push(`[${rel.entity.options.name}].[${nestedKey}] AS [${key}.${nestedKey}]`);
            }
        }
        return clauses;
    }

    #buildWhereClauses(
        where: Record<string, OperatorDescriptor<unknown> | Record<string, OperatorDescriptor<unknown>>>,
        relations: Record<string, EntityRelationDescriptor<Entity<EntityOptions>>>
    ): { expression: string; values: unknown[] }[] {
        const clauses: { expression: string; values: unknown[] }[] = [];
        for (const [ key, condition ] of Object.entries(where)) {
            if (isOperatorDescriptor(condition)) {
                clauses.push({
                    expression: condition.expression(`[${this.#options.name}].[${key}]`),
                    values: condition.values
                });
                continue;
            }

            const rel = relations[key];
            if (!rel)
                continue;

            for (const [ nestedKey, nestedCondition ] of Object.entries(condition)) {
                clauses.push({
                    expression: nestedCondition.expression(`[${rel.entity.options.name}].[${nestedKey}]`),
                    values: nestedCondition.values
                });
            }
        }
        return clauses;
    }

    #unflattenRow(row: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [ key, value ] of Object.entries(row)) {
            const dot = key.indexOf('.');
            if (dot === -1) {
                result[key] = value;
                continue;
            }

            const relationKey = key.slice(0, dot);
            const columnKey = key.slice(dot + 1);
            const nested = (result[relationKey] ??= {}) as Record<string, unknown>;
            nested[columnKey] = value;
        }
        return result;
    }

    #options: O;
    get options(): O {
        return this.#options;
    }

    constructor(options: O) {
        this.#options = options;
    }

    createTable(
        database: {
            prepare(q: string): {
                run(): void;
            };
        }
    ): Entity<O> {
        const relations = (this.#options.relations ?? {}) as
            Record<string, EntityRelationDescriptor<Entity<EntityOptions>>>;

        const columns = Object.entries(this.#options.column);
        const primaryColumns = columns.filter(([ , c ]) => c.primary);
        const restColumns = columns.filter(([ , c ]) => !c.primary);

        let qb = new CreateQueryBuilder(this.#options.name);
        for (const [ key, descriptor ] of primaryColumns)
            qb = qb.addColumn(key, { ...descriptor, primary: true } as ColumnDescriptor);

        for (const [ key, rel ] of Object.entries(relations)) {
            const targetColumn = this.#resolveRelationColumn(rel);
            const targetDescriptor = rel.entity.options.column[targetColumn]!;
            qb = qb.addColumn(`${key}Id`, {
                type: targetDescriptor.type,
                foreign: {
                    tableName: rel.entity.options.name,
                    columnName: targetColumn
                }
            } as ColumnDescriptor);
        }

        for (const [ key, descriptor ] of restColumns)
            qb = qb.addColumn(key, descriptor as ColumnDescriptor);

        database.prepare(qb.getQuery()).run();
        return this;
    }

    find<Select extends FindSelect<O> = FindSelect<O>>(
        database: {
            prepare<P extends unknown[], T>(q: string): {
                all(...p: P): T[];
            };
        },
        options?: Omit<FindOptions<O>, 'select'> & { select?: Select }
    ): FindResult<O, Select>[] {
        const relations = (this.#options.relations ?? {}) as
            Record<string, EntityRelationDescriptor<Entity<EntityOptions>>>;

        const select = (options?.select
            ?? Object.fromEntries(Object.keys(this.#options.column).map(k => [ k, true ]))
        ) as Record<string, boolean | Record<string, boolean>>;

        const [ firstSelect, ...restSelect ] = this.#buildSelectClauses(select, relations);
        let qb = new SelectQueryBuilder()
            .select(firstSelect!, ...restSelect)
            .from(this.#options.name);

        const relationOptions = (options?.relations ?? {}) as Record<string, boolean | JoinDescriptor['type']>;
        for (const [ key, flag ] of Object.entries(relationOptions)) {
            const rel = relations[key];
            if (!flag || !rel)
                continue;

            qb = qb.addJoin({
                type: typeof flag === 'string' ? flag : 'left',
                target: rel.entity.options.name,
                on: `[${rel.entity.options.name}].[${this.#resolveRelationColumn(rel)}] `
                    + `= [${this.#options.name}].[${key}Id]`
            });
        }

        const where = (options?.where ?? {}) as Record<string,
            OperatorDescriptor<unknown> | Record<string, OperatorDescriptor<unknown>>>;

        const [ firstWhere, ...restWhere ] = this.#buildWhereClauses(where, relations);
        if (firstWhere) {
            qb = qb.where(firstWhere.expression, ...firstWhere.values);
            for (const clause of restWhere)
                qb = qb.andWhere(clause.expression, ...clause.values);
        }

        if (typeof options?.pagination?.take === 'number')
            qb = qb.limit(options.pagination.take);

        if (typeof options?.pagination?.skip === 'number')
            qb = qb.skip(options.pagination.skip);

        const rows = database
            .prepare<unknown[], Record<string, unknown>>(qb.getQuery())
            .all(...qb.getParameters());

        return rows.map(row => this.#unflattenRow(row)) as FindResult<O, Select>[];
    }
}