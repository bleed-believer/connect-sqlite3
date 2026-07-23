const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Validates that `input` is safe to splice directly into a bracket-quoted
 * SQL identifier (`[${input}]`), since `better-sqlite3` offers no way to
 * bind identifiers as query parameters.
 *
 * @param input - The candidate table name.
 * @returns `input` unchanged, once validated.
 * @throws {Error} When `input` contains a character (e.g. `]`, whitespace,
 * quotes) that could break out of bracket quoting or otherwise isn't safe
 * in an identifier.
 */
export function sanitizeTableName(input: string): string {
    if (!TABLE_NAME_PATTERN.test(input)) {
        throw new Error(
            `Invalid table name "${input}": it must start with a letter ` +
            'or underscore, and contain only letters, digits, underscores ' +
            'and hyphens.'
        );
    }

    return input;
}
