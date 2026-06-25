# Content Organizer

A mobile-first content organization app for collecting saved links, ideas, photos, and references into categories and subcategories. It is built with React, tRPC, Drizzle, and Tailwind CSS, with a local SQLite database fallback for development.

## What The App Does

Content Organizer helps you keep saved material in a simple hierarchy:

- Categories, such as Movies, Food, Books, Tech, or custom groups
- Subcategories inside each category
- Content items with a heading, description, poster image, status, and optional extra media

Items can be queued for later, marked done, edited, searched, moved between categories, or left uncategorized until you sort them again.

## Current Features

### Navigation And Layout

- Five primary views: Home, Queued, Done, Add, and Settings
- Category and subcategory detail pages
- Mobile-first responsive layout
- Bottom navigation on mobile and top spacing for desktop layouts
- Pull-to-refresh wrapper around page content
- Dark and light themes

### Home

- Lists all categories for the current user
- Initializes predefined categories on first authenticated load
- Drag-and-drop category reordering with save/cancel controls
- Global search across categories, subcategories, and content
- Category cards with optional cover images and descriptions

### Categories And Subcategories

- Create, edit, delete, and reorder categories
- Create, edit, delete, and reorder subcategories
- Optional cover image and crop metadata for category/subcategory cards
- Category deletion removes links and deletes content only when it has no remaining category or subcategory links

### Content Items

- Add content with heading, description, poster image, and category/subcategory links
- Edit existing content details and placement
- Add the same content heading to more categories without creating a duplicate item
- Queue, unqueue, mark done, or mark undone
- Remove items from a category or subcategory without necessarily deleting them
- Delete content and associated uploaded media
- Search content by heading
- Reorder content within categories and subcategories

### Media

- Poster image support on content cards
- Additional image/video media attachments per content item
- Media reordering and deletion

### Queued And Done

- Dedicated pages for queued and completed content
- Search/filter style browsing
- Empty states when no matching content exists
- Status actions directly from cards

### Settings

- Light/dark theme selection
- Uncategorized content list for items removed from all categories
- Categorize dialog for assigning uncategorized content back into the hierarchy

## Technical Architecture

### Frontend

- React 19
- Vite 7
- Tailwind CSS 4
- shadcn/Radix UI components
- tRPC React Query client
- Wouter routing
- Framer Motion
- dnd-kit for drag-and-drop reordering
- Sonner toasts

### Backend

- Express 4
- tRPC 11
- Drizzle ORM
- libSQL client
- Turso/libSQL database when `TURSO_DATABASE_URL` is configured
- Local SQLite file fallback at `local.db`

### Storage And Auth

- Cloudflare R2 for uploaded files, using the AWS S3-compatible SDK
- Presigned browser uploads for progress tracking
- OAuth/session support through the app core
- Session cookie clearing through `auth.logout`

## Database Schema

Defined in `drizzle/schema.ts`.

- `users` - OAuth-linked user accounts
- `categories` - User-owned top-level groups
- `subcategories` - Nested groups under categories
- `contentItems` - Saved content records
- `contentCategoryLinks` - Many-to-many links between content and categories
- `contentSubcategoryLinks` - Many-to-many links between content and subcategories
- `mediaItems` - Extra image/video attachments
- `userPreferences` - Per-user theme preferences

## API Procedures

Defined in `server/routers.ts`.

### Auth

- `auth.me`
- `auth.logout`

### Categories

- `categories.list`
- `categories.initializePredefined`
- `categories.create`
- `categories.getById`
- `categories.update`
- `categories.delete`
- `categories.reorder`

### Subcategories

- `subcategories.list`
- `subcategories.listAll`
- `subcategories.getById`
- `subcategories.create`
- `subcategories.update`
- `subcategories.delete`
- `subcategories.reorder`

### Content

- `content.create`
- `content.searchExisting`
- `content.search`
- `content.getById`
- `content.listByCategory`
- `content.listBySubcategory`
- `content.listByStatus`
- `content.listUncategorized`
- `content.update`
- `content.updateStatus`
- `content.delete`
- `content.batchRemoveFromCategory`
- `content.batchRemoveFromSubcategory`
- `content.reorderInCategory`
- `content.reorderInSubcategory`

### Media

- `media.listByContent`
- `media.add`
- `media.delete`
- `media.reorder`

### Preferences

- `preferences.get`
- `preferences.setTheme`

## Environment Variables

Common variables used by the current implementation:

- `TURSO_DATABASE_URL` - Optional libSQL/Turso database URL. If omitted, the app uses `file:local.db`.
- `TURSO_AUTH_TOKEN` - Optional Turso auth token.
- `R2_ACCOUNT_ID` - Cloudflare account ID for R2.
- `R2_ACCESS_KEY_ID` - R2 access key.
- `R2_SECRET_ACCESS_KEY` - R2 secret key.
- `R2_BUCKET` - R2 bucket name.
- `R2_PUBLIC_URL` - Public base URL for uploaded files.
- `JWT_SECRET` - Session/cookie secret.
- `VITE_APP_ID` and OAuth-related variables - Used when OAuth is configured.
- `PORT` - Preferred server port, defaulting to `3000`.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm dev
```

Build production assets and server bundle:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

Run type checks:

```bash
pnpm check
```

Run tests:

```bash
pnpm test
```

Generate and run Drizzle migrations:

```bash
pnpm db:push
```

## File Structure

```text
client/
  src/
    pages/              Page components
    components/         Reusable app and UI components
    contexts/           Theme context
    hooks/              Client hooks
    lib/                tRPC client, upload, crop, and utility helpers
    App.tsx             Route tree and app shell
    main.tsx            React/tRPC/React Query bootstrap

server/
  routers.ts            tRPC app router
  db.ts                 Drizzle/libSQL query helpers
  storage.ts            Cloudflare R2 storage helpers
  _core/                Server bootstrap, auth, upload, proxy, and tRPC core

drizzle/
  schema.ts             Database schema definitions
  relations.ts          Drizzle relation definitions

shared/
  const.ts              Shared constants
  types.ts              Shared types
```

## Testing Notes

The existing tests are light smoke tests around router procedure availability and logout cookie behavior. They do not currently mock or exercise the full database behavior.

## Known Gaps And Next Improvements

- Add deeper database-backed tests for category deletion, content linking, status changes, and reorder behavior
- Add stronger validation around duplicate category/subcategory links
- Keep docs and UI copy aligned around storage terminology: the current implementation uses Cloudflare R2 through S3-compatible APIs
- Review text encoding artifacts in a few copied strings before release
