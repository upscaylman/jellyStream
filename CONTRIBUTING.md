# Contributing to JellyStream

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Fork & clone** the repo
2. Run `npm ci` (not `npm install` — respects the lockfile)
3. Start the dev server: `npx expo start`
4. Test on web: press `w` / iOS: press `i` / Android: press `a`

## Branch Naming

```
feat/short-description     # New feature
fix/short-description      # Bug fix
refactor/short-description # Code refactoring
test/short-description     # Adding tests
chore/short-description    # Tooling, deps, config
docs/short-description     # Documentation only
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add subtitle font size setting
fix: player seek resets to beginning
refactor: extract image URL helpers
test: add useMediaQueries unit tests
chore: bump expo to SDK 55
docs: update roadmap with phase 3
```

**Rules:**

- Use present tense ("add feature" not "added feature")
- Keep the subject line under 72 characters
- Reference issues when applicable: `fix: player crash on seek (#42)`

## Pull Request Process

1. **One PR = one feature/fix** — keep PRs atomic and focused
2. Create your branch from `master`
3. Ensure TypeScript compiles without errors (`npx tsc --noEmit`)
4. Run lint: `npx expo lint`
5. Fill in the PR template completely
6. Request review

### PR Size Guidelines

| Size | Lines Changed | Review Time |
| ---- | ------------- | ----------- |
| XS   | < 50          | Quick scan  |
| S    | 50–200        | 15 min      |
| M    | 200–500       | 30 min      |
| L    | 500–1000      | 1 hour      |
| XL   | 1000+         | Split it up |

## Code Conventions

### TypeScript

- **Strict mode** — no `any`, no `@ts-ignore`
- Interfaces for component props: `IMyComponentProps`
- Prefer `as const` objects over enums
- Use `Pick`, `Omit`, `Partial` instead of duplicating types

### React Native

- Functional components only (no classes)
- `StyleSheet.create()` for all styles — **no inline styles**
- Custom hooks for reusable logic
- `memo`/`useCallback`/`useMemo` only when profiling justifies it

### Naming

| Type        | Convention        | Example              |
| ----------- | ----------------- | -------------------- |
| Components  | PascalCase `.tsx` | `MovieList.tsx`      |
| Hooks/utils | camelCase `.ts`   | `useMediaQueries.ts` |
| Folders     | kebab-case        | `bottom-sheet/`      |
| Constants   | UPPER_SNAKE_CASE  | `MAX_RETRY_COUNT`    |

### Styling

- All colors from `constants/Colors.ts`
- No Tailwind, no NativeWind
- Netflix palette: `#141414` background, `#E50914` primary, `#FFFFFF` text

### Language

- **Code** (variables, functions, components): English
- **Comments & docs**: French

## Architecture Decisions

- **No Redux** — Zustand for global state
- **No Axios** — Jellyfin SDK handles its own requests
- **No Firebase/Supabase** — everything through Jellyfin server
- **No unnecessary dependencies** — every package must be justified

## Releases

We use [Semantic Versioning](https://semver.org/):

- `MAJOR` — Breaking changes (new auth flow, API redesign)
- `MINOR` — New features (new screen, new player feature)
- `PATCH` — Bug fixes, small improvements

Current version: `0.1.0` (pre-release)
