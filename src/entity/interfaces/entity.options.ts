import type { EntityColumnDescriptor } from './entity-column.descriptor.js';
import type { EntityRelationDescriptor } from './entity-relation.descriptor.js';

export interface EntityOptions {
    name: string;
    column: Record<string, EntityColumnDescriptor>;
    relations?: Record<string, EntityRelationDescriptor<any>>;
}