<div align="center">

# JellyStream

**A Netflix-like client for Jellyfin — built with Expo & React Native**

[![Expo SDK](https://img.shields.io/badge/Expo-55-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Jellyfin SDK](https://img.shields.io/badge/Jellyfin%20SDK-0.13-00A4DC?logo=jellyfin&logoColor=white)](https://github.com/jellyfin/jellyfin-sdk-typescript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/Vercel-Live-black?logo=vercel)](https://jellystream.vercel.app)

[Live Demo](https://jellystream.vercel.app) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## About

JellyStream is a cross-platform Jellyfin client that replicates the Netflix experience — smooth animations, rich gestures, dark design — all connected to your self-hosted Jellyfin server. Built entirely with Expo and React Native for iOS, Android, Web (PWA) and visionOS.

![Demo](assets/gifs/demo.gif)

## Features

### Implemented

- **Netflix-style UI** — Hero billboard, horizontal rows with snap scroll, animated headers with blur, bottom sheets, Top 10 rankings with SVG numbers
- **Jellyfin integration** — Full SDK integration: authentication, multi-profile support, media browsing, search, favorites, continue watching, collections (TMDB pipeline)
- **Video player** — Web (HTML5 + HLS.js) and native (expo-video) with quality selection (360p–4K), subtitle/audio track switching, seek with StartTimeTicks, gestures (volume, brightness, lock)
- **Live TV / IPTV** — Channel listing, favorites, current programs, category grouping
- **Multi-profile** — Netflix-style profile picker with Jellyfin avatars, seamless switching, persistent sessions (MMKV)
- **Notifications** — New content alerts, active sessions monitoring, badge counters
- **Google Cast** — Cast video to Chromecast devices
- **Search** — Full-text search with 300ms debounce, poster/list view toggle
- **Trending & New** — Top 10 with SVG rank numbers, "New & Hot" section, YouTube trailers

### Planned

See the full [Roadmap](ROADMAP.md) for upcoming features including PWA support, Android TV, shared element transitions, and more.

## Tech Stack

| Category     | Technology                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | [Expo SDK 55](https://expo.dev) + [React Native 0.83](https://reactnative.dev)                                                                                 |
| Language     | [TypeScript 5.9](https://www.typescriptlang.org) (strict mode, zero `any`)                                                                                     |
| Navigation   | [Expo Router v4](https://docs.expo.dev/router/introduction) (file-based, typed routes)                                                                         |
| Animations   | [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) + [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| API          | [@jellyfin/sdk](https://github.com/jellyfin/jellyfin-sdk-typescript) (official TypeScript SDK)                                                                 |
| Server cache | [TanStack Query v5](https://tanstack.com/query) (stale 5min, GC 30min)                                                                                         |
| State        | [Zustand 5](https://zustand-demo.pmnd.rs) (auth, preferences, notifications)                                                                                   |
| Storage      | [MMKV](https://github.com/mrousavy/react-native-mmkv) (tokens, settings, profiles)                                                                             |
| Video        | [expo-video](https://docs.expo.dev/versions/latest/sdk/video/) + [HLS.js](https://github.com/video-dev/hls.js) (web Live TV)                                   |
| Styling      | `StyleSheet.create()` only — no Tailwind, no NativeWind                                                                                                        |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A running [Jellyfin server](https://jellyfin.org/docs/general/installation/)

### Installation

```bash
# Clone the repository
git clone https://github.com/upscaylman/jellyStream.git
cd jellyStream

# Install dependencies
npm ci

# Start development server
npx expo start
```

### Environment Variables

Create a `.env` file at the root (optional — server URL can be entered in-app):

```env
# Jellyfin server (optional, can be set in-app)
JELLYFIN_SERVER_URL=http://your-server:8096

# TMDB API key (for collection metadata & trending carousel)
TMDB_API_KEY=your_tmdb_api_key
```

### Running

```bash
# Web
npx expo start --web

# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android
```

### Deployment (Vercel)

```bash
npx expo export --platform web
npx vercel --prod --yes
npx vercel alias set <deploy-url> jellystream.vercel.app
```

## Project Structure

```
jellystream/
├── app/                          # Expo Router — file-based pages
│   ├── (auth)/                   # Auth flow (server select, login, profile)
│   ├── (tabs)/                   # Main tab navigation (6 tabs)
│   │   ├── index.tsx             # Home (featured hero + rows)
│   │   ├── direct-tv.tsx         # Live TV / IPTV channels
│   │   ├── films.tsx             # Movies by genre
│   │   ├── new.tsx               # Trending, Top 10, New & Hot
│   │   ├── search.tsx            # Full-text search
│   │   └── movie/[id].tsx        # Movie/series detail
│   ├── player.tsx                # Video player (web + native)
│   ├── my-list.tsx               # Favorites / watchlist
│   └── notifications.tsx         # Notifications center
├── src/
│   ├── api/                      # Jellyfin SDK client + TanStack Query hooks
│   │   ├── client.ts             # SDK initialization
│   │   └── queries/              # useMediaQueries, useLiveTvQueries, etc.
│   ├── stores/                   # Zustand stores (auth, preferences, notifications)
│   ├── hooks/                    # useJellyfinHome, useGoogleCast
│   └── utils/                    # Image URL builders
├── components/                   # Reusable React Native components
│   ├── BottomSheet/              # Global bottom sheet system
│   ├── FeaturedContent/          # Netflix hero billboard
│   ├── MovieList/                # Horizontal scrolling rows
│   ├── Header/                   # Animated blur header
│   └── ui/                       # Primitives (Button, Card, RankNumber)
├── hooks/                        # Platform hooks (colors, gestures, motion)
├── styles/                       # Centralized StyleSheet definitions
├── constants/                    # Colors, theme
└── patches/                      # patch-package fixes
```

## Screenshots

> _Coming soon — PRs welcome for screenshots on different platforms._

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up your development environment
- Branch naming conventions
- Commit message format
- Pull request process

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [netflix-ui](https://github.com/saulsharma/netflix-ui) — Original Expo/RN Netflix UI base
- [Jellyfin](https://jellyfin.org) — The free software media system
- [@jellyfin/sdk](https://github.com/jellyfin/jellyfin-sdk-typescript) — Official TypeScript SDK
