# CLAUDE.md

Home lab dashboard for displaying services as categorized cards. Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (radix-mira style).

## Commands

- `pnpm dev` - Dev server on port 2727
- `pnpm build` - Production build
- `pnpm lint` - ESLint

## Conventions

**Imports:** Use `@/*` path alias (e.g., `@/components/ui`, `@/lib/utils`)

**UI components:** shadcn/ui components live in `components/ui/`; add new ones via `pnpm dlx shadcn@latest add <component>`

**Styling:** Use `cn()` from `@/lib/utils` for className composition

**Client components:** Add `"use client"` directive when interactivity is needed (hooks, event handlers)

**External links:** Always include `target="_blank" rel="noopener noreferrer"`

**Data mutations:** Use Server Actions in `lib/actions.ts`; data persists to `data/config.json`

**Validation:** Zod schemas in `lib/validations.ts`; show inline errors near form fields
