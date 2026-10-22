This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Validation

Use Node.js 24 or newer for the built-in TypeScript test support.

- `npm run lint` checks source quality.
- `npm test` covers Python runtime startup, execution timeout, cancellation, reuse, and failure recovery.
- `npm run build` checks types and produces the production build.

To check collaboration, open the same room in two browser tabs. Verify edits in each language, shared runner output, participant presence, and chat. Reload one tab while the other remains open to check late-join synchronization. Room content (both languages, output, and the existing shared chat array) is persisted as an encoded Yjs document. Awareness, cursors, and presence remain ephemeral.

Assignments and progress tracking are not implemented yet and are labeled as unavailable in the EDU navigation.

## Room persistence

The existing Supabase table must provide `room_id` (unique/primary key), `state` (text), and `updated_at` (timestamp with time zone, microsecond precision, non-null). No migration was needed for the configured project. Saves compare `updated_at` atomically and advance it monotonically; competing writers reload, merge Yjs updates, and retry. All writers must honor this revision protocol. Do not install a trigger that replaces the supplied revision with a non-monotonic or lower-precision timestamp.

The configured public key needs SELECT, INSERT, and UPDATE policies for accessible rooms. Those operations were tested against disposable rooms. Existing anonymous room access is unchanged: room IDs are share links, not authorization or teacher/student access control. Review ownership and RLS before storing sensitive student information. No service-role key is used.

Local recovery is cached per room before the 250 ms cloud-save debounce. Navigation flushes pending edits; refresh/reopening recovers unsent edits from this browser. `Saved` acknowledges cloud persistence; closing while offline or before that acknowledgement cannot guarantee that another browser will see the latest edits. Keep a copy if an error appears. Failed loads/saves retry while the room is open. Unknown legacy state formats fail visibly without overwriting existing records.

Tests cover return/refresh/rejoin with new Yjs documents and no cache, room isolation, concurrent first writes, stale saves, deletions, offline recovery, and legacy-state protection. The browser flow was also exercised locally. `node --env-file=.env.local tests/live-room-check.mjs` is an optional live integration check that creates a disposable room; it is not part of `npm test`. DELETE may be denied by existing RLS, so it prints the room ID when cleanup is unavailable.
