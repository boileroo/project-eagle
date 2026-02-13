// TanStack DB — Collections & Live Queries
//
// This file sets up TanStack DB collections that your components
// can subscribe to for reactive, local-first data access.
//
// Usage pattern:
//   1. Define collections from your query or sync sources
//   2. Create live queries to derive reactive views
//   3. Use optimistic mutations for instant UI updates
//
// See: https://tanstack.com/db/latest/docs

export {}

// ──────────────────────────────────────────────
// Example: Query-based collection (from TanStack Query)
// ──────────────────────────────────────────────
//
// import { createCollection, queryCollectionOptions } from '@tanstack/query-db-collection'
//
// export const todosCollection = createCollection(
//   queryCollectionOptions({
//     queryKey: ['todos'],
//     queryFn: async () => {
//       const res = await fetch('/api/todos')
//       return res.json()
//     },
//     getId: (todo) => todo.id,
//   }),
// )

// ──────────────────────────────────────────────
// Example: Live query across collections
// ──────────────────────────────────────────────
//
// import { createCollection, liveQueryCollectionOptions } from '@tanstack/query-db-collection'
//
// export const activeTodos = createCollection(
//   liveQueryCollectionOptions({
//     query: (q) =>
//       q
//         .from({ todo: todosCollection })
//         .where(({ todo }) => eq(todo.completed, false))
//         .select(({ todo }) => ({
//           id: todo.id,
//           title: todo.title,
//         })),
//   }),
// )
