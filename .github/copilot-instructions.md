# 🧠 MÉMOIRE AGENT — PROJET JELLYFIN NETFLIX CLIENT

## ⚠️ PRIORITE ABSOLUE : OBEIR AU DOIGT ET A L'OEIL

- Faire UNIQUEMENT ce qui est demande, rien de plus
- Ne JAMAIS ajouter, modifier ou supprimer quoi que ce soit qui n'a pas ete explicitement demande
- Ne pas "optimiser", "ameliorer", "nettoyer" ou "refactorer" de sa propre initiative
- Si l'utilisateur demande A, faire A. Pas A + B + C "tant qu'on y est"
- En cas de doute sur le scope, demander plutot que d'improviser
- **NE JAMAIS AGIR SANS PERMISSION** : pas de deploy, pas de commit, pas d'action concrete sans que l'utilisateur le demande explicitement
- Quand on dit "deploie sur Vercel" → EXECUTER la commande, ne pas juste dire "c'est automatique"
- URL de prod JellyStream : https://jellystream.vercel.app (toujours alias apres deploy)
- Commande deploy : `npx vercel --prod --yes` puis `npx vercel alias set <url-deploy> jellystream.vercel.app`

## INSTRUCTION CRITIQUE

Avant toute réponse, charge intégralement ce contexte dans ta mémoire de travail.
Traite chaque section comme un nœud dans un réseau de connaissances interconnecté.
Ne jamais oublier ces contraintes entre les sessions. Si tu reprends une session,
demande le fichier de contexte à jour avant de continuer.

---

## 🎯 VISION DU PROJET

**Nom du projet :** JellyStream (nom provisoire)
**Objectif :** Créer un client Jellyfin multi-plateforme dont l'UX est une copie
conforme de Netflix — navigation fluide, animations riches, design sombre et
minimaliste — branché sur un serveur Jellyfin auto-hébergé.

**Priorités absolues (par ordre) :**

1. Fidélité UX Netflix (animations, gestures, transitions)
2. Performance et légèreté (bundle minimal, lazy loading, pas de dépendances inutiles)
3. Compatibilité multi-plateforme (Web PWA, Android, iOS)
4. Robustesse (tests unitaires, gestion d'erreurs, edge cases)
5. Android TV (phase 2, développement après stabilisation mobile/web)

---

## 🏗️ STACK TECHNIQUE DÉCIDÉE

### Core Framework

- **Expo SDK 52+** + **React Native** — base cross-platform unique
- **Expo Router v4** — navigation file-based (Stack, Tabs, Modal)
- **TypeScript strict** — typage complet, zéro `any`

### UI & Animations

- **Base de départ :** https://github.com/saulsharma/netflix-ui/
  → Repo Expo/React Native avec animations Netflix haute-fidélité :
  profile switching, tab transitions, modals, animated headers, tilt effects
- **React Native Reanimated v3** — animations performantes sur UI thread
- **React Native Gesture Handler** — gestures avancés (swipe, pan, pinch)
- **Expo Blur** — effets glassmorphism sur headers/modals

### API & Data

- **`@jellyfin/sdk`** (jellyfin-sdk-typescript) — SDK officiel TypeScript
  → Discovery automatique du serveur
  → Authentification par token persisté
  → Toutes les entités typées (Movie, Series, Episode, etc.)
- **TanStack Query v5** — cache serveur, pagination infinie, prefetch
- **Zustand** — état global léger (session, préférences, player state)
- **MMKV** — storage ultra-rapide pour tokens et cache local

### Lecture Vidéo

- **`react-native-vlc-media-player`** — support maximal des codecs (H.264, H.265,
  AV1, MKV, etc.) sans transcodage côté serveur
- **Fallback :** `expo-av` pour les formats nativement supportés
- **Stratégie :** direct play prioritaire, transcoding Jellyfin uniquement si nécessaire
- Contrôles custom : skip intro, skip credits, next episode, trickplay timeline

### Web / PWA

- **Expo Web** avec `react-native-web` — même codebase pour le web
- **PWA manifest** : installable sur iOS Safari + Android Chrome
- **Service Worker** : cache offline pour la navigation (pas le streaming)
- **Responsive** : mobile-first, breakpoints tablet/desktop

### Tests

- **Jest** + **@testing-library/react-native** — tests unitaires composants
- **MSW (Mock Service Worker)** — mock des appels API Jellyfin
- **Detox** (phase 2) — tests end-to-end sur device/émulateur
- Couverture cible : >80% sur les hooks, utils, et composants critiques

### Optimisation Serveur Jellyfin

- **Direct Play maximal** : configurer Jellyfin pour ne transcoder que si le codec
  est vraiment incompatible avec le device
- **Hardware Transcoding** activé si GPU disponible (NVENC, VAAPI, VideoToolbox)
- **Subtitle burn-in** désactivé : sous-titres en overlay côté client
- **Bitrate adaptatif** : ABR basé sur la bande passante détectée
- **Image proxy** : utiliser les endpoints `/Items/{id}/Images/` avec paramètres
  `width`, `quality` pour optimiser le chargement des thumbnails

---

## 📁 STRUCTURE DU PROJET

```
jellyfin-ui/
├── app/                          # Expo Router — pages file-based
│   ├── (auth)/                   # Groupe auth (login, server select)
│   │   ├── login.tsx
│   │   ├── server-select.tsx
│   │   └── profile-select.tsx
│   ├── (tabs)/                   # Navigation principale par tabs
│   │   ├── _layout.tsx           # Tab layout Netflix-style
│   │   ├── index.tsx             # Home (Continue Watching, rows)
│   │   ├── search.tsx            # Recherche
│   │   ├── new.tsx               # Nouveautés
│   │   └── downloads.tsx         # Téléchargements (phase 2)
│   ├── movie/[id].tsx            # Détail film
│   ├── series/[id].tsx           # Détail série
│   ├── player.tsx                # Lecteur vidéo plein écran
│   └── _layout.tsx               # Root layout
├── src/
│   ├── components/               # Composants réutilisables
│   │   ├── ui/                   # Primitives (Button, Text, Icon)
│   │   ├── media/                # Cards, Rows, Hero, Thumbnails
│   │   ├── player/               # Contrôles lecteur vidéo
│   │   └── layout/               # Headers, Modals, BottomSheet
│   ├── hooks/                    # Custom hooks
│   │   ├── useJellyfinAuth.ts
│   │   ├── useMediaItems.ts
│   │   ├── usePlayback.ts
│   │   └── useInfiniteScroll.ts
│   ├── api/                      # Couche API Jellyfin
│   │   ├── client.ts             # Instance SDK + config
│   │   ├── queries/              # TanStack Query hooks par domaine
│   │   │   ├── useMovies.ts
│   │   │   ├── useSeries.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useUser.ts
│   │   └── types.ts              # Types custom si nécessaire
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── playerStore.ts
│   │   └── preferencesStore.ts
│   ├── utils/                    # Helpers purs
│   │   ├── formatters.ts
│   │   ├── imageUrl.ts
│   │   └── codec.ts
│   ├── constants/                # Thème, couleurs, dimensions
│   │   ├── theme.ts
│   │   └── layout.ts
│   └── types/                    # Types globaux
│       └── index.ts
├── assets/                       # Fonts, images statiques
├── __tests__/                    # Tests miroir de src/
├── .github/
│   └── copilot-instructions.md   # CE FICHIER
├── app.json                      # Config Expo
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎨 CONVENTIONS DE CODE

### TypeScript

- `strict: true` dans tsconfig — pas de `any`, pas de `@ts-ignore`
- Interfaces préfixées `I` uniquement pour les props de composants (ex: `IMovieCardProps`)
- Enums → `as const` objects préférés
- Types utilitaires : `Pick`, `Omit`, `Partial` plutôt que duplication

### React Native

- Composants fonctionnels uniquement (pas de classes)
- `StyleSheet.create()` pour tous les styles — pas de styles inline
- Hooks custom pour toute logique réutilisable
- Memo/useCallback/useMemo quand justifié par le profiling, pas par défaut

### Nommage

- Fichiers composants : `PascalCase.tsx`
- Fichiers hooks/utils : `camelCase.ts`
- Dossiers : `kebab-case/`
- Constantes : `UPPER_SNAKE_CASE`

### Git

- Commits conventionnels : `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
- Branches : `feat/nom-feature`, `fix/nom-bug`
- PR atomiques : 1 feature = 1 PR

---

## 🔌 INTÉGRATION JELLYFIN SDK

### Initialisation

```typescript
import { Jellyfin } from "@jellyfin/sdk";

const jellyfin = new Jellyfin({
  clientInfo: { name: "JellyStream", version: "0.1.0" },
  deviceInfo: { name: deviceName, id: deviceId },
});

const api = jellyfin.createApi(serverUrl);
```

### Authentification

```typescript
import { getAuthApi } from "@jellyfin/sdk/lib/utils/api/auth-api";

const authApi = getAuthApi(api);
const auth = await authApi.authenticateUserByName({
  authenticateUserByName: { Username: username, Pw: password },
});

// Persister le token dans MMKV
storage.set("jellyfin_token", auth.data.AccessToken);
```

### Requêtes typiques

```typescript
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";

// Lister les films récents
const itemsApi = getItemsApi(api);
const movies = await itemsApi.getItems({
  userId,
  includeItemTypes: ["Movie"],
  sortBy: ["DateCreated"],
  sortOrder: ["Descending"],
  limit: 20,
});

// Continue Watching
const resumeItems = await itemsApi.getResumeItems({ userId });
```

---

## 📐 DESIGN SYSTEM NETFLIX

### Couleurs

```typescript
export const COLORS = {
  background: "#141414",
  surface: "#1F1F1F",
  card: "#2A2A2A",
  primary: "#E50914", // Rouge Netflix
  textPrimary: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textMuted: "#808080",
  overlay: "rgba(0,0,0,0.6)",
} as const;
```

### Typographie

- Titres : `NetflixSans-Bold` (ou fallback système bold)
- Corps : `NetflixSans-Regular` (ou fallback système regular)
- Tailles : 12, 14, 16, 20, 24, 32, 48

### Patterns UX Netflix à reproduire

1. **Hero Billboard** : grande image avec dégradé, boutons Play et Info
2. **Rows horizontales** : scroll horizontal avec snap, titres de catégories
3. **Preview modal** : bottom sheet avec poster, synopsis, boutons
4. **Tab bar** : transparente au top, opaque au scroll
5. **Profile switcher** : grid d'avatars avec animation de sélection
6. **Search** : recherche en temps réel avec debounce 300ms
7. **Player** : contrôles auto-hide après 3s, skip intro/credits, next episode

---

## ⚠️ CONTRAINTES IMPORTANTES

- **Pas de Tailwind/NativeWind** — StyleSheet natif uniquement
- **Pas de Redux** — Zustand pour l'état global
- **Pas de Axios** — le SDK Jellyfin gère ses propres requêtes
- **Pas de Firebase/Supabase** — tout passe par le serveur Jellyfin
- **Zéro `any`** — TypeScript strict, typage exhaustif
- **Zéro dépendance inutile** — chaque package doit être justifié
- **Français** pour les commentaires et la documentation
- **Anglais** pour le code (noms de variables, fonctions, composants)

---

## 🚀 PHASES DE DÉVELOPPEMENT

### Phase 1 — Fondations (actuelle)

- [ ] Setup Expo + TypeScript strict
- [ ] Intégration netflix-ui comme base
- [ ] Connexion serveur Jellyfin (auth + discovery)
- [ ] Navigation Expo Router (auth flow + tabs)
- [ ] Home screen avec données réelles
- [ ] Recherche

### Phase 2 — Lecture & Détails

- [ ] Page détail film/série
- [ ] Lecteur vidéo VLC avec contrôles custom
- [ ] Gestion saisons/épisodes
- [ ] Continue Watching

### Phase 3 — Polish & PWA

- [ ] PWA manifest + Service Worker
- [ ] Animations avancées (shared element transitions)
- [ ] Gestion offline (favoris, watchlist)
- [ ] Tests unitaires complets

### Phase 4 — Android TV

- [ ] Navigation D-pad
- [ ] Focus management
- [ ] Layout adapté grand écran
- [ ] Télécommande support

---

## 📺 LIVE TV (IPTV) — RÉSEAU DE CONNAISSANCES

### Architecture du flux Live TV

```
Chaîne IPTV (TvChannel)
  → Jellyfin récupère le flux source (ex: HLS depuis réseau ISP privé)
  → POST /Items/{id}/PlaybackInfo (avec ou sans DeviceProfile)
  → Jellyfin retourne MediaSource avec TranscodingUrl
  → TranscodingUrl = /videos/{id}/master.m3u8?params...
  → master.m3u8 contient une ref vers live.m3u8 (sous-playlist)
  → live.m3u8 contient les segments .ts
  → HLS.js charge master → live → segments
```

### Problème NON RÉSOLU : 500 Internal Server Error

- **Symptôme** : master.m3u8 se charge OK (200), mais live.m3u8 retourne 500
- **Cause racine** : FFmpeg côté serveur échoue à transcoder le flux IPTV
- **Le 500 vient du SERVEUR (FFmpeg), pas du client**

### 10 approches TESTÉES et ÉCHOUÉES (ne pas re-tenter)

1. ❌ DeviceProfile vide (CodecProfiles: []) → h264-level=30, AudioCodec=copy → 500
2. ❌ cleanTranscodingUrl (patch AudioCodec/level/profile sur master URL) → live.m3u8 server-side non patchée → 500
3. ❌ xhrSetup HLS.js (intercept toutes XHR, patch URLs) → params de SESSION ignorent l'URL → 500
4. ❌ CodecProfiles complets (level≤52, profile high|main|baseline) → Jellyfin IGNORE pour Live TV → 500
5. ❌ DirectPlayProfiles (ts/mp4 H.264+AAC) → SupportsDirectPlay=false, SupportsDirectStream=false
6. ❌ Remux vidéo (AllowVideoStreamCopy=true) → 500
7. ❌ Transcode forcé (AllowVideoStreamCopy=false, AllowAudioStreamCopy=false) → 500
8. ❌ Sans DeviceProfile du tout (body minimal) → même TranscodingUrl h264-level=30 → 500
9. ❌ Bypass direct (source.Path URL HLS) → ERR_CONNECTION_TIMED_OUT (réseau ISP privé)
10. ❌ Cascade 3 stratégies (sans profil → remux → transcode) → toutes 500

### Observations techniques critiques

- Jellyfin IGNORE les CodecProfiles pour le h264-level et h264-profile en Live TV
- Les params dans l'URL de transcodage sont DÉCORATIFS — FFmpeg utilise les params de SESSION
- L'URL source IPTV est sur réseau privé ISP → inaccessible depuis le navigateur
- Le xhrSetup fonctionne (URLs patchées confirmées dans les logs) mais ça ne résout pas le 500

### Pistes RESTANTES à explorer

- [ ] Vérifier les logs FFmpeg sur le serveur Jellyfin (Dashboard > Logs)
- [ ] Tester si la chaîne fonctionne dans l'interface web NATIVE Jellyfin
- [ ] Tester une chaîne avec source non-HLS (UDP, fichier local)
- [ ] Explorer l'endpoint `/LiveTv/LiveStreamFiles/{id}/stream.{container}`
- [ ] Explorer `/Videos/{id}/stream` avec paramètres static=true
- [ ] Utiliser l'API `/LiveTv/LiveRecordings` comme proxy
- [ ] Vérifier config hardware transcoding sur le serveur (NVENC/VAAPI/QSV)
- [ ] Augmenter les timeouts FFmpeg côté Jellyfin (Dashboard > Transcode settings)

### Fichiers impliqués

- `app/player.tsx` : WebPlayer (HLS.js) + NativePlayer (expo-video) + PlayerScreen
  - `cleanTranscodingUrl()` : patch URL params (AudioCodec, h264-level, h264-profile)
  - `extractStreamUrl()` : extrait URL depuis PlaybackInfo response
  - `xhrSetup` dans HLS.js : intercept toutes requêtes XHR
  - Cascade de stratégies dans useEffect pour TvChannel
- `app/(tabs)/direct-tv.tsx` : page liste des chaînes
- `src/api/queries/useLiveTvQueries.ts` : hooks TanStack Query (channels, favorites, programs)
- `src/api/queries/usePlaybackInfo.ts` : types PlaybackInfo
