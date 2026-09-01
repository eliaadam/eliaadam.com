# Frontend API SDK

One folder per backend domain, one plain object of typed functions per
domain, all exposed through `sdk` in `index.ts`. This mirrors the
backend's own domain split (`domains/identity`, `domains/registry`,
...) so a REST endpoint added to a domain has one obvious place to add
its frontend client too.

## Adding a new domain

1. Create `domains/<domain>.ts`.
2. Define the request/response TypeScript types the domain's REST API
   actually uses — match the backend's field names as documented, don't
   rename them to "look nicer" on the way in. Reshaping is the
   component/context/hook layer's job, not the SDK's.
3. Write one small function per endpoint. Each function:
   - takes a single plain object of the params it needs (not a long
     list of positional args),
   - returns exactly what `api.get`/`api.post`/etc. resolves to — no
     extra shaping, caching, or side effects here,
   - is named after what it does, not the HTTP verb + path
     (`listAssets`, not `getAssets` or `get`).
4. Export one plain object at the bottom grouping those functions —
   see `domains/identity.ts` or `domains/registry.ts`.
5. Add it to the `sdk` object in `index.ts`, and re-export any types
   other files will need.

## What does NOT belong in a domain module

- Raw `fetch` calls — always go through `api` from
  `lib/query/Api.ts`. That's the one place that attaches the bearer
  token, parses JSON, and throws `ApiError`.
- React state, `useQuery`/`useMutation` calls, or `localStorage` —
  those belong in whatever consumes the domain module (e.g.
  `AuthContext` owns the session and caches it; `sdk.identity` just
  calls the endpoints and hands back what the server said).
- Error handling beyond what `ApiError` already gives you — let it
  propagate to the caller, which is in a better position to decide
  what a given failure means (show a form error, redirect, retry,
  etc.).
