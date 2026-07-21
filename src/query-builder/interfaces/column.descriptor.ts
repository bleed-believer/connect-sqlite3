import type { DataTypeDescriptor } from './data-type.descriptor.js';
import type { DataType } from './data-type.js';

/**
 * Describes a single column passed to
 * {@link CreateQueryBuilder.addColumn}.
 *
 * `type` selects one of the supported {@link DataType}s, and the type of
 * `default` is narrowed accordingly through {@link DataTypeDescriptor}.
 * A column may declare either `primary` (and no `foreign`) or a `foreign`
 * key reference (and no `primary`), but not both.
 */
export type ColumnDescriptor = {
    [K in DataType]: {
        /** SQLite type name used for the `CREATE TABLE` column definition. */
        type: K;
        /**
         * Default value, emitted as a `DEFAULT` clause.
         *
         * A plain value is rendered as an escaped SQL literal. A function
         * may be passed instead to emit a raw SQL expression verbatim
         * (e.g. `() => 'CURRENT_TIMESTAMP'`) — its return value is written
         * as-is, without quoting or escaping.
         */
        default?: DataTypeDescriptor[K] | (() => string);
        /** Whether the column accepts `NULL`. Omit to leave it unspecified. */
        nullable?: boolean;
        /** Whether the column auto-increments (only meaningful on an `INTEGER` primary key). */
        autoIncrement?: boolean;
    } & (
        {
            /** Marks this column as the table's primary key. */
            primary?: true;
            foreign?: never;
        } |
        {
            primary?: false;
            /** Foreign key reference, emitted as a `FOREIGN KEY ... REFERENCES` clause. */
            foreign?: {
                /** Name of the referenced table. */
                tableName: string;
                /** Name of the referenced column. */
                columnName: string;
            };
        }
    )
}[DataType]