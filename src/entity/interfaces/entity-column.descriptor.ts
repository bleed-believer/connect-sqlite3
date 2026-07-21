import type { ColumnDescriptor } from '../../query-builder/index.js';

export interface EntityColumnDescriptor
extends Omit<ColumnDescriptor, 'primary' | 'foreign'> {
    primary?: boolean;
}