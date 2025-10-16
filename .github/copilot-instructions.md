# Copilot Instructions for AI Agents

## Project Overview
- This is a Vite + React TypeScript app for an AI-powered word game, with a focus on dialectal language and Wikipedia integration.
- Main entry: `App.tsx` and `index.tsx`.
- Game logic and UI are modularized in `components/` (e.g., `GameBoard.tsx`, `GuessInput.tsx`, `ShootingGalleryGame.tsx`).
- Data processing and language logic are in `utils/` (e.g., `textProcessor.ts`, `verbConjugations.ts`).
- External data (e.g., Wikipedia) is accessed via `services/wikipediaService.ts`.

## Key Patterns & Conventions
- **Component Structure:** Each UI/game feature is a separate React component. State is often lifted to parent components (see `ShootingGalleryGame.tsx`).
- **Type Safety:** Shared types are defined in `types.ts` and imported across components/services.
- **Constants:** Game constants and configuration are centralized in `constants.ts`.
- **Async Data:** Wikipedia lookups and other async logic are handled in `services/`, returning promises to be consumed by components.
- **UI Feedback:** Loading and win states are handled by dedicated components (`LoadingSpinner.tsx`, `WinModal.tsx`).

## Developer Workflows
- **Install:** `npm install`
- **Run locally:** `npm run dev`
 - No API keys required for core gameplay. The app uses public Wikipedia endpoints.
- **Build:** `npm run build`
- **No explicit test suite** (as of Oct 2025) — add tests in `__tests__/` if needed.

## Integration & Data Flow
- **Game state** flows from `ShootingGalleryGame.tsx` (logic) → `GameBoard.tsx` (display) → `GuessInput.tsx` (user input).
- **Guessed words** and feedback are managed in `GuessedWordsList.tsx` and `GameInfoPanel.tsx`.
- **WikipediaService** is the main integration point for external data.

## Project-Specific Notes
- **No Redux or Context API** — state is managed via React props/hooks.
- **No custom routing** — single-page app structure.
- **Icons** are custom React components in `components/icons/`.
- **Metadata/config** in `metadata.json`.

## Examples
- To add a new game mechanic, create a new component in `components/` and update `ShootingGalleryGame.tsx`.
- To process new word types, extend logic in `utils/textProcessor.ts` and update types in `types.ts`.

---
For more, see `README.md` and explore the `components/`, `services/`, and `utils/` directories.