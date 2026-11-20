# Planned changes: the cost of every request

This file is a work order. Read it whole before you change anything. Remove it
in the commit that finishes the work, or update it if you leave a part open.

## Why

With `express-session` and `rolling: true`, every request that sends a cookie
calls `store.get` and then `store.touch`. Today those two calls cost much more
than they need to. The store works correctly (no session is lost or mixed
up), so the goal is to make it cheaper without changing what it stores.

A consumer measured nothing yet. These findings come from reading the code.

## What's wrong today

1. **Every operation is a write transaction.** `SessionTable.get`, `set`,
   `touch`, `delete`, `getAll` and `getLength`
   (`src/session-table/session-table.ts`) each open a transaction and call
   `SessionQueries.clearExpired()` first. So a plain read (`get`) is a
   `DELETE` plus a `SELECT` inside a write transaction. With `rolling: true`,
   each request runs two write transactions.
2. **That purge scans the whole table.** `clearExpired()`
   (`src/session-table/session-queries.ts`, around line 15) runs
   `DELETE ... WHERE datetime([expires]) <= datetime('now')`:
   - `expires` is a `VARCHAR` holding an ISO string
     (`src/sqlite3/migrations/1784908810519-create-session-table.ts`);
   - there is no index on `expires`;
   - even with an index, wrapping the column in `datetime()` keeps SQLite
     from using it.
   The same applies to the filter in `getAll()` (around line 77).
3. **No WAL.** `SQLite3Base` (`src/sqlite3/sqlite3.base.ts`) opens the database
   with the default rollback journal. Readers and writers block each other,
   and with point 1 even a read is a writer.
4. **`touch` costs two statements and rewrites every column.** `touch` runs
   `getExists(sid)` and then `update(sid, sessionData)`, which writes all 11
   columns. `express-session` only calls `touch` when the session data didn't
   change (with `resave: false`), so only the expiration needs to move.
5. **`set` costs two statements too.** It runs `getExists` and then `insert` or
   `update`, when one `INSERT ... ON CONFLICT (sid) DO UPDATE` is enough.
6. **Minor: the README and `package.json` disagree.** The README says
   `better-sqlite3` is a peer dependency, but `package.json` lists it in
   `dependencies`. Pick one and make the other match.

## What to change

### Storage of the expiration

- Store the expiration as a number: `INTEGER`, in milliseconds since the
  epoch. `NULL` still means "never expires", as today.
- Add an index on it, for example `ix_sqlite3_session_expires`.
- Compare with a bound parameter (`expires <= ?`, passing `Date.now()`), never
  `datetime('now')`. Then the comparison can use the index and tests can
  control the clock (see "Testing").
- Do it in a **new migration**. Never edit
  `1784908810519-create-session-table.ts`: existing databases already ran it,
  and `SQLite3Migrations` throws when an applied migration goes missing from
  the list. The new migration must convert the existing rows, not drop them.
  One way to do it:
  - add a column (for example `expiresAt INTEGER NULL`);
  - fill it from the ISO text with
    `CAST(ROUND((julianday([expires]) - 2440587.5) * 86400000) AS INTEGER)`;
  - create the index on the new column;
  - stop reading and writing the old text column.

  SQLite before 3.35 can't `DROP COLUMN`, and `better-sqlite3` bundles a
  recent SQLite, so you can choose to drop it. Rebuilding the table (create
  the new table, copy the rows, drop the old one, rename) is also fine. Whatever
  you pick, keep `SessionParser`'s round trip of `cookie.expires` exact to the
  millisecond. The existing test "Get the session" checks `expires.toJSON()`.

### Purge on an interval, not on every call

- Remove `clearExpired()` from `get`, `set`, `touch` and `destroy`.
- `get` must still never return an expired session. Filter it in the query:
  `WHERE sid = ? AND (expires IS NULL OR expires > ?)`. That makes `get` a
  single read, with no transaction.
- Run the purge on a timer started by the store
  (`setInterval(...).unref()`, so it never keeps the process alive), with a
  constructor option for the interval. A default of 15 minutes is
  reasonable. Also expose a public method to purge on demand (useful for
  tests and for apps that prefer their own scheduler) and one to stop the
  timer and close the database (`close()`), because today nothing closes it.
- `all` and `length` may keep purging first, or filter the expired rows
  instead. They're rarely called. Either is fine, but say which in the
  README.

### WAL and the cheaper writes

- After opening the database, run `PRAGMA journal_mode = WAL`.
  `PRAGMA synchronous = NORMAL` is the usual companion in WAL mode and safe
  for sessions. Do it in `SQLite3Base` (or in `SQLite3` before the
  migrations). An in-memory database (`':memory:'`) reports `memory` as its
  journal mode, so don't assert `wal` there.
- `touch(sid, session)`: one statement,
  `UPDATE ... SET expires = ? WHERE sid = ?`, taking the expiration from
  `session.cookie.expires`. Keep today's rule that it never creates a missing
  session (an `UPDATE` already does nothing then). Decide whether
  `originalMaxAge` must be updated too: `express-session` doesn't change it on
  a touch, so it shouldn't need to be.
- `set(sid, session)`: one statement,
  `INSERT INTO ... VALUES (...) ON CONFLICT (sid) DO UPDATE SET ...`. It needs
  SQLite 3.24 or later, which `better-sqlite3` 12 bundles.
- `destroy(sid)`: one `DELETE`, with no purge and no transaction.
- Prepare each statement once (in the constructor) instead of calling
  `prepare` on every call. `SQLite3Base.run/get/all` prepare every time today.

### Constructor and options

Today it's `new SQLite3Store(target, verbose?)`. To add the purge interval
(and a clock for the tests) without breaking current callers, accept an
options object as the second argument while still accepting a `boolean`
there. Or keep the positional `verbose` and add a third `options` argument.
Either way, current calls like `new SQLite3Store('./sessions.db')` must keep
working. A suggested shape:

```ts
interface SQLite3StoreOptions {
    verbose?: boolean;
    /** How often the expired sessions are deleted. Defaults to 15 minutes. */
    purgeIntervalMs?: number;
    /** Current time in ms. Defaults to `Date.now`. Meant for tests. */
    now?: () => number;
}
```

## Testing

- The tests use `node:test` and a file database per suite
  (`./session-table.db`, ignored by git). Keep that style.
- Update the tests that encode the behavior that changes:
  - `sqlite3-store.test.ts` "Touch existing session ... updates its data": a
    touch now only moves the expiration;
  - the README note that every method purges first.
- Add tests for:
  - `get` doesn't return an expired session, without any purge having run;
  - `touch` moves the expiration (with an injected clock: the session
    survives past its old expiration);
  - the purge deletes only expired rows (and none with `expires IS NULL`),
    and returns how many it deleted;
  - the new migration converts an existing ISO `expires` to the same
    millisecond, with a database created by the old migration only;
  - `close()` stops the timer (the test process must exit on its own).

## Out of scope

- Moving from `better-sqlite3` to `node:sqlite`. It's possible on Node 24
  (no flag, no warning, types in `@types/node`) and would remove the native
  dependency, but it's a separate decision and a breaking change for the
  `Buffer` target.
- Sharing sessions between several processes or machines. A SQLite file is
  per host by nature.
- Making the store asynchronous. `better-sqlite3` is synchronous by design.
  Each operation becomes a single indexed statement, so the time it blocks
  the event loop is small. See "About an asynchronous store" below.

### About an asynchronous store

Switching to `node:sqlite` doesn't make the store asynchronous either. On
Node 24 it only offers `DatabaseSync` and `StatementSync`. Its only function
that returns a `Promise` is `backup()`, so every query still runs on the main
thread, as with `better-sqlite3`.

The only way to keep the queries off the event loop is to run SQLite in a
`worker_thread`. The worker opens the database (with either library), and
the main thread sends it each operation with `postMessage`. The public API
wouldn't change, because `express-session` stores already use callbacks.

It isn't worth it for this store yet:

- **Cost.** After the changes above, `get` and `touch` are a single statement
  on an index or the primary key and take a few microseconds. Sending a
  message to a worker and getting the answer back, which copies the session
  data both ways, usually costs more than that. Each request would take
  longer in total, even though the main thread would be free.
- **No parallelism.** SQLite allows a single writer at a time, so the worker
  still runs the operations one after another. It only moves the work off
  the main thread.
- **What blocks today is something else.** It's the write transaction on
  every call and the `fsync` of each commit with the default journal. WAL,
  `synchronous = NORMAL` and reads without a transaction remove most of that
  time.
- **More to maintain.** The worker's lifecycle and errors, a `close()` that
  also ends the worker, and the `Buffer` target, which would have to be
  copied to the worker.

After this work, measure the event loop delay under load (for example with
`perf_hooks.monitorEventLoopDelay()`). If the blocking still shows, move to
a worker, and use `node:sqlite` in it to drop the native dependency. Release
that as its own breaking version, not as part of `0.2.0`.

## Release

These are compatible changes for callers, but they change the stored format
through a migration. Publish them as a minor version (`0.2.0`) and mention
the migration and the new options in the README.
