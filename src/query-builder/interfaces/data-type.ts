import type { DataTypeDescriptor } from './data-type.descriptor.js';

/**
 * Union of the SQLite column type names supported by {@link CreateQueryBuilder}.
 *
 * Derived from the keys of {@link DataTypeDescriptor}, which also maps each
 * type name to the TypeScript type of the values it accepts.
 */
export type DataType = keyof DataTypeDescriptor;