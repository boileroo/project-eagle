# Project Eagle 🦅

A full-stack golf tournament management application. Create and manage tournaments, courses, rounds, and competitions with real-time scoring and leaderboards.

## Tech Stack

Built with:

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

### Prerequisites

- **Node.js 22.x** (see `.nvmrc` or `.node-version`)
- **Yarn** package manager
- **Supabase** project (free tier available at [supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
git clone <repo>
cd project-eagle
yarn install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable                        | Description                                 | Required |
| ------------------------------- | ------------------------------------------- | -------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL                   | ✓        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key for client-side auth      | ✓        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key for server-side operations | ✓        |
| `DATABASE_URL`                  | PostgreSQL connection string from Supabase  | ✓        |

Find these in your Supabase project settings under **Settings → API**.

### 3. Set Up Database

```bash
yarn db:push
```

This syncs the Drizzle schema to your Supabase PostgreSQL database. For production, use migrations instead:

```bash
yarn db:generate  # Generate migration files
yarn db:migrate   # Run migrations
```

Optionally seed sample data:

```bash
yarn db:seed
```

### 4. Start Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

### Development

| Command        | Description                      |
| -------------- | -------------------------------- |
| `yarn dev`     | Start dev server (port 3000)     |
| `yarn build`   | Build for production             |
| `yarn preview` | Preview production build locally |

### Database

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `yarn db:push`     | Sync schema directly (dev only) |
| `yarn db:generate` | Generate migration files        |
| `yarn db:migrate`  | Run pending migrations          |
| `yarn db:studio`   | Open Drizzle Studio GUI         |
| `yarn db:seed`     | Seed database with sample data  |

### Code Quality

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `yarn lint`         | Run ESLint                      |
| `yarn lint:fix`     | Fix ESLint errors automatically |
| `yarn format`       | Format code with Prettier       |
| `yarn format:check` | Check if code is formatted      |
| `yarn typecheck`    | Run TypeScript type checking    |

### Utilities

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `yarn kanban`              | Local kanban workflow helper  |
| `yarn generate-routes`     | Generate TanStack Router tree |
| `yarn generate-pwa-assets` | Generate PWA assets           |

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── app/             # App-wide layout components
│   ├── shared/          # Reusable feature components
│   └── pages/           # Page-specific components
├── db/
│   ├── index.ts         # Drizzle client
│   ├── schema.ts        # PostgreSQL schema & types
│   ├── seed.ts          # Database seeding
│   └── migrations/      # Generated migrations
├── hooks/               # Custom React hooks
├── lib/
│   ├── *.server.ts      # Server functions (createServerFn)
│   ├── server/          # Server utilities & helpers
│   ├── domain/          # Pure scoring & calculation logic
│   ├── validators/      # Zod schemas for validation
│   ├── supabase.ts      # Supabase client (browser)
│   └── query-options.ts # TanStack Query configurations
├── routes/
│   ├── __root.tsx       # Root layout
│   ├── _app/            # Protected app routes
│   ├── _auth/           # Auth routes
│   └── ...              # Feature routes
├── types/               # Shared TypeScript types
├── styles/
│   └── globals.css      # Tailwind + CSS variables
├── config/              # App configuration
├── entry-client.tsx     # Client entry
├── entry-server.tsx     # Server entry
└── router.tsx           # Router configuration
```

## Development Workflow

This project includes a local kanban system and OpenCode integration for streamlined development:

```bash
# Create a new task
yarn kanban new "Add user profile page"

# Start working (creates feature branch and launches agent)
yarn kanban work add-user-profile-page

# Ship completed work (squash-merge + archive task)
yarn kanban ship add-user-profile-page
```

Task docs are stored in `kanban/` and follow the template in `kanban/TEMPLATE.md`. OpenCode agent commands and definitions are in `.opencode/`.

## Adding shadcn UI Components

Install components as needed:

```bash
yarn dlx shadcn@latest add button
yarn dlx shadcn@latest add card
yarn dlx shadcn@latest add input
yarn dlx shadcn@latest add form
# See https://ui.shadcn.com for available components
```
