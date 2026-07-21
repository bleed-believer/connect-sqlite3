import type { DataTypeDescriptor } from '../../query-builder/index.js';
import type { EntityColumnDescriptor } from './entity-column.descriptor.js';
import type { RelationsOf } from './entity-relations-of.js';
import type { EntityOptions } from './entity.options.js';

/** SQL comparison operators accepted by a {@link FindWhereCondition}. */
export type FindWhereOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like';

type ColumnValue<C extends EntityColumnDescriptor> =
    C['nullable'] extends true
        ?   DataTypeDescriptor[C['type']] | null
        :   DataTypeDescriptor[C['type']];

/** A single `column operator value` comparison used inside a `where` clause. */
export interface FindWhereCondition<T> {
    operator: FindWhereOperator;
    value: T;
}

/**
 * Shape of the `where` option accepted by {@link Entity.find}, inferred
 * from the entity's own generic `O`.
 *
 * Own columns accept a {@link FindWhereCondition} typed after the column's
 * declared `type`; relations accept a nested map of their own columns to
 * {@link FindWhereCondition}s.
 */
export type FindWhere<O extends EntityOptions> = {
    [K in keyof O['column'] | keyof RelationsOf<O>]?:
        K extends keyof RelationsOf<O>
            ?   { [C in keyof RelationsOf<O>[K]['entity']['options']['column']]?:
                    FindWhereCondition<ColumnValue<RelationsOf<O>[K]['entity']['options']['column'][C]>> }
            :   K extends keyof O['column']
                ?   FindWhereCondition<ColumnValue<O['column'][K]>>
                :   never;
};
