# BTTS Frontend – Copilot Instructions

These instructions are for AI coding agents working on this repo.

## Tech Stack & Architecture

- **Framework**: Vue 3 + TypeScript, Vite (`src/main.ts`, `vite.config.ts`).
- **State management**: Pinia (`src/stores/search.ts` is the main store).
- **Routing**: Vue Router with a single `home` route (`src/router/index.ts`).
- **UI**: shadcn-vue style components under `src/components/ui/**` and Tailwind-like utility classes in templates.
- **API layer**: `src/services/api.ts` wraps all HTTP requests using `ky` and types from `src/types/api.ts`.
- **Entry flow**: `main.ts` → `App.vue` (router view + `Toaster`) → `HomeView.vue` which composes dialogs, search form, results, and layout.

## Core Domain Flow (Search)

- **Source of truth**: Use `useSearchStore` in `src/stores/search.ts` for all search-related state (query, filters, paging, API key, indexed chats, etc.).
- **API key**:
  - Stored in `ApiService` (`src/services/api.ts`) and persisted in `localStorage` key `btts_api_key`.
  - Store mirrors it in `apiKey`/`isApiKeyConfigured`; use `setApiKey`/`clearApiKey` instead of accessing `localStorage` directly.
- **Indexed chats**:
  - Loaded via `searchStore.loadIndexedChats()` which calls `apiService.getIndexedChats()`.
  - Components should not call `apiService` directly; they should go through the store.
- **Search execution**:
  - Use `searchStore.search()`; it builds a `SearchOnMultiChatRequest` from store fields and calls `apiService.searchInMultiChat()`.
  - Pagination is derived from `pageSize`, `currentPage`, and computed `offset`; use `goToPage` / `setPageSize` instead of writing pagination math in components.
  - `searchResults`, `totalHits`, `processingTime`, `semanticHitCount` come from the API response.

## UI & Component Patterns

- **Main screen**: `src/views/HomeView.vue` orchestrates:
  - `ApiKeyDialog` for key configuration.
  - `DarkModeMenu` for theme.
  - `SearchForm` to edit query & filters (should write to `useSearchStore` setters).
  - `SearchResults` to render results and use `goToPage` for paging.
- **Sonner toasts**: Notifications use `vue-sonner` via dynamic import:
  - Example in `HomeView.vue` (`handleApiKeySaved`): `const { toast } = await import('vue-sonner'); toast.success('...')`.
  - Follow this pattern for new toasts to keep bundle size optimal.
- **shadcn-vue components**: Reusable primitives live under `src/components/ui/**` with index files exporting them.
  - When adding new UI primitives, follow existing directory and export structure (e.g. see `ui/card`, `ui/button`).

## Services & Types

- **HTTP client**: `ApiService` in `src/services/api.ts` is the single abstraction over HTTP:
  - Uses `ky` with a `/api` prefix and auth header from the API key.
  - Exposes methods like `getIndexedChats`, `searchInMultiChat`, `replyMessage`, `repeatMessage`, `streamFile`, `buildReqToken`.
  - When adding backend endpoints, extend `ApiService` instead of calling `ky` directly in components or stores.
- **Types**: Use the shared API contracts in `src/types/api.ts` for all service/store logic.

## Conventions & Best Practices (Repo-Specific)

- **Composition API + `<script setup>`**: New Vue components should use `<script setup lang="ts">` and avoid Options API.
- **State access**: Prefer `storeToRefs` when consuming Pinia store state in components to keep reactivity simple (see `HomeView.vue`).
- **Error handling**:
  - UI-level errors are usually simple strings stored in `ref` and shown in a `Card` (see `HomeView.vue` for the pattern).
  - Log detailed errors to `console.error` and show user-friendly messages.
- **No direct `localStorage` in components**: All API key handling goes through `ApiService` and `useSearchStore`.
- **Imports**: Use `@` alias for `src` (configured in TS/Vite), e.g. `@/stores/search`, `@/components/...`.

## Build, Run & Tooling

- **Dev server**: Use Vite via pnpm: `pnpm dev`.
- **Build**: `pnpm build`.
- **Lint**: `pnpm lint` (see `eslint.config.ts`).
- **Type checking**: Uses `tsconfig*.json`; keep new code typed.

## When Extending the App

- Add new views under `src/views` and register them in `src/router/index.ts`.
- Add new global state to a Pinia store in `src/stores` (or extend `search.ts` if search-related).
- Add new backend interactions to `ApiService` and corresponding types in `src/types/api.ts`, then call from a store, not directly from components.
- Reuse existing `ui` components and Tailwind-style classes for consistent styling.
