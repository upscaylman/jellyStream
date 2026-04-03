## [0.1.2] — 2026-04-03

### Fixed

- **Player web** : son absent sur de nombreux films (Babysitting, etc.) — utilisation de la `TranscodingUrl` Jellyfin directement (HLS) au lieu d'une URL `stream.mp4` construite manuellement, identique au comportement du client web officiel Jellyfin
- **Player web** : seek utilise maintenant la `TranscodingUrl` comme base, en modifiant uniquement `StartTimeTicks`, garantissant la cohérence audio/vidéo après un seek
- **Player** : boutons play/skip centrés absolument, indépendants des barres top/bottom, en plein écran comme en mode normal
- **BigCardRow** : erreur TypeScript sur `import React` et `FlatList ref` corrigée (`esModuleInterop`, `skipLibCheck`)
- **tsconfig.json** : `extends` pointe désormais vers `./node_modules/expo/tsconfig.base.json` (résolution directe), ajout de `esModuleInterop`, `allowSyntheticDefaultImports`, `skipLibCheck`

### Known Bugs

- **Live TV / IPTV** : flux en direct retournent une erreur 500 côté serveur (FFmpeg échoue à transcoder le flux IPTV source sur réseau ISP privé) — 10 approches testées, cause côté serveur Jellyfin non résolue
- **Notifications** : les sessions actives affichent parfois des données obsolètes si le serveur Jellyfin est lent à répondre, pas de retry automatique sur erreur réseau
- **Player natif** : `expo-video` ne supporte pas tous les codecs (H.265/HEVC, DTS) — fallback vers transcodage Jellyfin requis
- **Pinch-to-zoom web** : fonctionne sur touch uniquement, pas sur trackpad multi-touch desktop

---

## [0.1.1] — 2026-04-02

### Fixed

- Player : pinch-to-zoom mobile/tablette (ref `pinchLastDist` corrigée)
- Player : bouton mute ajouté dans la barre de contrôles (WebPlayer + NativePlayer)
- Player : gestes volume/luminosité en plein écran (NativePlayer)

---

## [0.1.0] — 2026-04-02

### Added

- Initial release
- Netflix-style UI with Expo SDK 55 + React Native 0.83
- Jellyfin server connection (auth, multi-profile, token persistence)
- Home screen with hero billboard, horizontal rows, badges
- Full-text search with debounce
- Video player (web HTML5 + HLS.js, native expo-video)
- Quality selection (360p–4K), subtitle/audio track switching
- Live TV / IPTV channel listing
- Google Cast support
- Notifications center (new content + active sessions)
- Favorites / My List
- Films & Series browsing by genre
- Collections via TMDB pipeline
- Top 10 trending with SVG rank numbers
- Bottom sheet system (preview, cast, settings)
- Profile picker with Jellyfin avatars
- Vercel web deployment
