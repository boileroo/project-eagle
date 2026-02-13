# Project Eagle 🦅

A full-stack application built with:

- **[TanStack Start](https://tanstack.com/start)** — Full-stack React framework with SSR
- **[TanStack Router](https://tanstack.com/router)** — Type-safe file-based routing
- **[TanStack Query](https://tanstack.com/query)** — Async state management
- **[TanStack DB](https://tanstack.com/db)** — Reactive client-side collections & live queries
- **[Supabase](https://supabase.com)** — Auth, database, and storage
- **[Drizzle ORM](https://orm.drizzle.team)** — Type-safe SQL with PostgreSQL
- **[shadcn/ui](https://ui.shadcn.com)** — Accessible UI components
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first styling
- **[Zod](https://zod.dev)** — Runtime validation (with `drizzle-zod` integration)
- **[ESLint](https://eslint.org) + [Prettier](https://prettier.io)** — Linting & formatting

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

### 3. Push database schema

```bash
yarn db:push
```

### 4. Start development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `yarn dev`           | Start dev server on port 3000            |
| `yarn build`         | Production build                         |
| `yarn preview`       | Preview production build                 |
| `yarn db:generate`   | Generate Drizzle migrations              |
| `yarn db:migrate`    | Run migrations                           |
| `yarn db:push`       | Push schema directly (dev)               |
| `yarn db:studio`     | Open Drizzle Studio                      |
| `yarn db:seed`       | Seed the database                        |
| `yarn lint`          | Run ESLint                               |
| `yarn lint:fix`      | Fix ESLint errors                        |
| `yarn format`        | Format with Prettier                     |
| `yarn format:check`  | Check formatting                         |
| `yarn typecheck`     | Run TypeScript type checking             |

## Project Structure

```
src/
├── components/
│   └── ui/              # shadcn/ui components
├── db/
│   ├── index.ts         # Drizzle client
│   ├── schema.ts        # Drizzle schema + drizzle-zod
│   ├── seed.ts          # Database seeding
│   └── migrations/      # Generated migrations
├── hooks/               # Custom React hooks
├── lib/
│   ├── collections.ts   # TanStack DB collections
│   ├── supabase.ts      # Supabase client (browser)
│   ├── supabase.server.ts # Supabase client (SSR)
│   ├── utils.ts         # cn() utility
│   └── validators.ts    # Zod schemas
├── routes/
│   ├── __root.tsx       # Root layout
│   └── index.tsx        # Home page
├── styles/
│   └── globals.css      # Tailwind + CSS variables
├── entry-client.tsx     # Client entry
├── entry-server.tsx     # Server entry
└── router.tsx           # Router configuration
```

## Adding shadcn Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc.
```
