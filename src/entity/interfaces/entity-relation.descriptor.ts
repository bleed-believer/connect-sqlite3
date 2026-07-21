import type { EntityColumnDescriptor } from './entity-column.descriptor.js';
import type { JoinDescriptor } from '../../query-builder/index.js';
import type { EntityOptions } from './entity.options.js';

export interface EntityRelationDescriptor<E extends { options: EntityOptions } = { options: EntityOptions }> {
    type: JoinDescriptor['type'];
    entity: E;
    column: (e: E['options']['column']) => EntityColumnDescriptor;
}
