/** Options for the `SQLite3Store` constructor. */
export interface SQLite3StoreOptions {
    /** When `true`, logs every SQL statement executed against the database. */
    verbose?: boolean;

    /**
     * How often, in milliseconds, the expired sessions are deleted. Defaults
     * to 15 minutes. `0` disables the timer, for apps that prefer to call
     * `purge()` on their own schedule. The timer never keeps the process
     * alive.
     */
    purgeIntervalMs?: number;

    /** Returns the current time in milliseconds. Defaults to `Date.now`. Meant for tests. */
    now?: () => number;
}
