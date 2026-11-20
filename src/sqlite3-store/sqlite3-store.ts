import type { SQLite3StoreOptions } from './sqlite3-store.options.js';
import type { SessionData } from 'express-session';

import { SessionTable } from '../session-table/index.js';
import { SQLite3 } from '../sqlite3/index.js';
import { Store } from 'express-session';

/** Default for {@link SQLite3StoreOptions.purgeIntervalMs}: 15 minutes. */
const DEFAULT_PURGE_INTERVAL_MS = 15 * 60 * 1000;

/** The longest delay `setInterval` accepts (about 24.8 days). */
const MAX_PURGE_INTERVAL_MS = 2 ** 31 - 1;

/**
 * `express-session` compatible {@link Store} backed by a SQLite table via
 * `better-sqlite3`. The underlying table is created (via migrations) as
 * soon as the store is constructed.
 *
 * Reads never return an expired session. The expired rows are deleted by a
 * timer (see {@link SQLite3StoreOptions.purgeIntervalMs}) or by calling
 * {@link purge}.
 */
export class SQLite3Store extends Store {
    #sqlite3: SQLite3;
    #sessionTable: SessionTable;
    #timer: NodeJS.Timeout | null = null;

    /**
     * @param target - Path to the SQLite database file (or a `Buffer`),
     * forwarded to `better-sqlite3`'s `Database` constructor.
     * @param options - The store options. A `boolean` is still accepted
     * here and means `{ verbose }`.
     */
    constructor(target: string | Buffer, options?: boolean | SQLite3StoreOptions) {
        super();

        const {
            verbose,
            purgeIntervalMs = DEFAULT_PURGE_INTERVAL_MS,
            now = Date.now
        } = typeof options === 'boolean'
        ?   { verbose: options }
        :   options ?? {};

        if (
            !Number.isFinite(purgeIntervalMs) ||
            purgeIntervalMs < 0 ||
            purgeIntervalMs > MAX_PURGE_INTERVAL_MS
        ) {
            throw new RangeError(
                `"purgeIntervalMs" must be a number from 0 to ` +
                `${MAX_PURGE_INTERVAL_MS}, received ${purgeIntervalMs}.`
            );
        }

        this.#sqlite3 = new SQLite3(target, verbose);
        this.#sessionTable = new SessionTable(this.#sqlite3, now);

        if (purgeIntervalMs > 0) {
            this.#timer = setInterval(() => this.#purgeOnTimer(), purgeIntervalMs);
            this.#timer.unref();
        }
    }

    #purgeOnTimer(): void {
        try {
            this.purge();
        } catch (err) {
            // Nobody called this, so there's no callback to report to. An
            // `error` event with no listener would crash the process, so
            // it's only emitted when someone listens. Either way, the next
            // tick tries again.
            if (this.listenerCount('error') > 0) {
                this.emit('error', err);
            }
        }
    }

    /**
     * Deletes every expired session now. The store already does this on a
     * timer; call it when you need it to happen at a specific moment, or
     * when the timer is disabled (`purgeIntervalMs: 0`). Sessions without an
     * expiration are never deleted.
     *
     * @returns How many sessions were deleted.
     */
    purge(): number {
        return this.#sessionTable.purge();
    }

    /**
     * Stops the purge timer and closes the database. Calling it again does
     * nothing. Any other method called afterwards reports an error.
     */
    close(): void {
        if (this.#timer) {
            clearInterval(this.#timer);
            this.#timer = null;
        }

        this.#sqlite3.close();
    }

    /**
     * Returns every session that hasn't expired. Expired rows are filtered
     * out, not deleted.
     *
     * @param callback - Called with an error, or with all session objects
     * on success.
     */
    all(callback: (err: any, obj?: SessionData[] | null) => void): void {
        try {
            const data = this.#sessionTable.getAll();
            callback(null, data);
        } catch (err) {
            if (callback) {
                callback(err, null);
            } else {
                throw err;
            }
        }
    }

    /**
     * Deletes every stored session.
     *
     * @param callback - Called with an error, if any, once the table has
     * been cleared.
     */
    clear(callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.clear();
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Moves an existing session's expiration to `session.cookie.expires`.
     * Only the expiration is written: `express-session` calls `touch` when
     * the session data didn't change. A no-op when no session with the
     * given `sid` exists, or when it already expired — it is never created.
     *
     * @param sid - The session id to refresh.
     * @param session - The session whose cookie holds the new expiration.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    touch(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.touch(sid, session);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Retrieves a single session by its id. An expired session is reported
     * as not found, even if the purge hasn't deleted it yet.
     *
     * @param sid - The session id to retrieve.
     * @param callback - Called with an error, or with the session data
     * (or `null` when not found) on success.
     */
    get(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
        try {
            const session = this.#sessionTable.get(sid);
            callback(null, session);
        } catch (err) {
            if (callback) {
                callback(err, null);
            } else {
                throw err;
            }
        }
    }

    /**
     * Stores a session, inserting it if it doesn't exist yet or replacing
     * it otherwise.
     *
     * @param sid - The session id to store.
     * @param session - The session data to persist.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.set(sid, session);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Counts the sessions that haven't expired. Expired rows are filtered
     * out, not deleted.
     *
     * @param callback - Called with an error, or with the number of
     * sessions on success.
     */
    length(callback: (err: any, length?: number) => void): void {
        try {
            const length = this.#sessionTable.getLength();
            callback?.(null, length);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Deletes a single session by its id. A no-op when no session with
     * that `sid` exists.
     *
     * @param sid - The session id to delete.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    destroy(sid: string, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.delete(sid);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }
}
