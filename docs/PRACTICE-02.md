# Practice visible test runner

Implementation note for the production baseline at `36601fe`.

## Supported problems

`src/lib/practice/contracts.ts` defines the callable functions and 10 visible cases:

- Reverse a String: 3 cases
- Find the Largest Number: 2 cases
- Count Frequencies: 2 cases
- Valid Brackets: 3 cases

Run is disabled if a problem's description, constraints, or starter code differs from its reviewed contract (ignoring CRLF line endings). New problems need an explicit contract.

Two Number Sum is disabled because its first example has two valid pairs despite promising exactly one. Merge Sorted Lists is disabled until linked-list input/output adapters are defined. Both need review before enabling Run.

## Execution

Practice keeps separate Python and JavaScript drafts in React state. Drafts reset on reload or navigation. It owns its runner and does not use shared-room Yjs state or runner singletons.

Each visible case runs the full draft in a fresh worker, then calls the named function with positional arguments. Functions must return a JSON-compatible value synchronously. Array order matters; object key order does not. Booleans and numbers are distinct. Tuples, custom objects, promises, and undefined results are unsupported.

JavaScript has a 2-second limit per case. Python uses Pyodide from the existing CDN, with 30 seconds to initialize and 5 seconds to execute. Workers terminate after each case or on cancellation. Logs are separate from return values and capped at 8,000 characters per case; timeout or cancellation can lose buffered output.

Cancel keeps completed results and marks unfinished cases cancelled. Editing or switching language clears results and cancels execution; leaving the page also stops it. Run IDs and runner generations reject stale results.

## Editor and results

The editor removes the original Python starter `pass` when the body is edited. Visible cases show arguments, expected values, and results: green for passed, red for failed/error/timeout. The editor allows scrolling beyond the last line.

## Limits and checks

Results are browser-side learning feedback. Hidden tests, Submit, and saved progress are not implemented. The runner required no database changes.

Run `npm run lint`, `npm test`, `npm run build`, and `git diff --check` when changing this code. Runner tests cover return values, worker failures, deadlines, cancellation, and stale results. Browser checks are still needed for real workers and Pyodide; local tests alone do not verify production or live Supabase collaboration.
