/**
 * Maps each supported SQLite column type name to the TypeScript type of the
 * values that can be assigned to it (e.g. as a `default` value in a
 * {@link ColumnDescriptor}).
 */
export interface DataTypeDescriptor {
    INT:        number;
    INTEGER:    number;
    FLOAT:      number;
    NUMERIC:    number;

    BOOLEAN:    boolean;

    TEXT:       string;
    CHAR:       string;
    VARCHAR:    string;
    NVARCHAR:   string;
}