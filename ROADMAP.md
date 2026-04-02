# Roadmap

> Last updated: April 2, 2026

## Phase 1 — Foundations ✅

Everything in this phase is complete and shipped.

- [x] Expo SDK 55 + TypeScript strict setup
- [x] Netflix-UI base integration and adaptation
- [x] Jellyfin server connection (auth + auto-discovery)
- [x] Expo Router navigation (auth flow + tabs)
- [x] Home screen with real Jellyfin data (hero, rows, badges)
- [x] Full-text search with debounce
- [x] Multi-profile support (save, switch, remove profiles)
- [x] Badges system ("New season", "Recently added") across all screens
- [x] Notifications center (new content + active sessions)
- [x] TanStack Query integration for all server data
- [x] Preferences store (quality, bitrate, audio/subtitle defaults)
- [x] Bottom sheet system (preview, cast, settings)
- [x] Top 10 trending with SVG rank numbers
- [x] Favorites / My List with toggle
- [x] Films & Series library browsing by genre
- [x] Live TV / IPTV channel listing with favorites & programs

## Phase 2 — Playback & Details 🔄

Core playback is functional. Some items still in progress.

- [x] Movie/series detail pages (ExpandedPlayer, tabs, trailers, collections)
- [x] Video player with custom controls (seek, subtitles, audio, quality)
- [x] Season/episode management
- [x] Continue Watching (resume items)
- [x] Collections via TMDB pipeline (4 requests max, cached)
- [x] YouTube trailer previews (with stop-on-leave)
- [x] Google Cast support
- [ ] **Wire preferencesStore to player** — Quality/bitrate/language preferences are stored but not yet applied during playback
- [ ] **Downloads persistence** — Download page exists but no actual download/offline storage

## Phase 3 — Polish & PWA

- [ ] PWA manifest + Service Worker (installable on mobile browsers)
- [ ] Shared element transitions (list → detail)
- [ ] Offline mode (cached favorites, watchlist browsing)
- [ ] Unit tests (target: >80% coverage on hooks, utils, critical components)
- [ ] E2E tests with Detox
- [ ] Performance profiling & optimization pass
- [ ] Accessibility audit (screen readers, contrast, focus order)
- [ ] Error boundaries with user-friendly recovery UI
- [ ] Adaptive bitrate (ABR) based on bandwidth detection

## Phase 4 — Android TV

- [ ] D-pad navigation
- [ ] Focus management system
- [ ] Large-screen layout adaptations
- [ ] Remote control support
- [ ] Leanback-style UI components

## Known Issues

| Issue              | Status                | Details                                                                   |
| ------------------ | --------------------- | ------------------------------------------------------------------------- |
| Live TV 500 error  | Blocked (server-side) | FFmpeg fails to transcode IPTV streams — see `problemes-solutions.md #14` |
| Route duplication  | Low priority          | `app/search.tsx` duplicates `app/(tabs)/search.tsx`                       |
| Legacy UserContext | Low priority          | Should be removed (authStore is primary)                                  |
| app.json scheme    | Trivial               | Currently "myapp", should be "jellystream"                                |
