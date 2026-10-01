<p align="center">
  <img src="./assets/images/icon.png" width="96" height="96" alt="Finale icon" />
</p>

<h1 align="center">Finale</h1>

<p align="center">A TV tracker for people who binge: know if a show was cancelled, and only hear about a season once it's fully out.</p>

## What it does

- **Search with endings up front**: every search result says whether the show is ongoing, ended,
  or was cancelled, so you know before you start whether the story gets an ending.
- **Show page**: status, a "Cancelled after 2 seasons" / "Ended after 5 seasons" callout, and
  every season with its state: complete (episodes and binge time), airing ("3 of 8 out · finale
  Nov 4"), or upcoming. Tick the complete seasons you've seen; ticking one on a show you don't
  follow yet follows it, with an Undo.
- **Watchlist**, grouped by what you can watch next: *Ready to binge* (any complete season you
  haven't seen, even while a newer one airs), *Season airing*, *Waiting for new episodes*, and
  *All caught up* (shows that are over and fully seen).
- **Season notifications** for followed shows: when a season starts ("you'll get another
  notification when the whole season is out"), when it's complete, or when the show is cancelled.
  A season that drops all at once gets a single notification. Tapping one opens the show. The
  show page says exactly what you'll be notified about, and warns if notifications are blocked.
- Local-only persistence (no account, no server of our own), light/dark mode, one Material 3
  palette (amber, generated from a single seed color) driving both Paper components and Tailwind
  classes.

Planned next: marathon mode (a resume bookmark plus a runtime planner).

## Getting started

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup), then go to
   Settings → API and copy the **API Read Access Token** (the long one, not the short API key).
2. Put it in `.env.local` (gitignored):

   ```bash
   cp .env.example .env.local
   ```

   and set `TMDB_TOKEN=<your token>`.
3. Install and run:

   ```bash
   npm install
   npm start
   ```

   Scan the QR code with [Expo Go](https://expo.dev/go) on your phone, or `npm run web` for a
   browser.

After adding or changing the token, restart with `npx expo start --clear`. Metro caches the app
config, so a plain restart can keep running without it.

## The TMDB token

The token is never shipped in plain text. [`app.config.js`](app.config.js) reads `TMDB_TOKEN` at
build time, XORs it with a random per-build key, and stores both in the app config.
[`src/lib/token.ts`](src/lib/token.ts) decodes it at runtime via `expo-constants`. This stops
automated scanners that grep published APKs for key patterns (a TMDB token is a JWT starting with
`eyJ`). It does **not** stop a determined person: the token is still sent in the `Authorization`
header on every request, so intercepting the app's traffic reveals it.

That's acceptable for a free, read-only token during personal use and a closed test. Before a
public release, move TMDB calls behind a small proxy (e.g. a Cloudflare Worker holding the token,
allowing only the search/show/season endpoints, with caching and per-IP rate limits), so the app
never holds the token at all.

## Scripts

| Command                   | What it does                                                |
| ------------------------- | ----------------------------------------------------------- |
| `npm start`               | Start the Metro bundler / dev server                        |
| `npm run web`             | Run in a browser via Expo web                               |
| `npm run ios` / `android` | Run on a simulator/emulator (needs Xcode / Android Studio)  |
| `npm test`                | Run the Jest test suite                                     |
| `npm run test:watch`      | Jest in watch mode                                          |
| `npm run typecheck`       | `tsc --noEmit`                                              |
| `npm run lint`            | ESLint via `expo lint`                                      |

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) mirrors Punch's:

- **test**: typecheck, lint, then the Jest suite, on every push to `main` and every pull request.
- **build-android**: an [EAS Build](https://docs.expo.dev/build/introduction/), gated on `test`.
  Manual only: Actions tab → CI → Run workflow, picking `preview` (installable APK) or
  `production` (Play Store `.aab`).

One-time setup for the build job:

1. `npx eas-cli@latest login`, then `npx eas-cli@latest init` from the project root (writes
   `extra.eas.projectId` and `owner` into `app.json`).
2. Add an `EXPO_TOKEN` secret (from [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens))
   under the repo's Settings → Secrets and variables → Actions.
3. Add `TMDB_TOKEN` to the `preview` and `production` EAS environments
   (`npx eas-cli@latest env:create`, visibility `secret`), since builds don't read `.env.local`.

## Tech stack

- [Expo](https://expo.dev) / [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Paper](https://callstack.github.io/react-native-paper/) (Material Design 3) laid out
  with [NativeWind](https://www.nativewind.dev/), both driven by
  [`src/theme/tokens.js`](src/theme/tokens.js)
- [Zustand](https://zustand.docs.pmnd.rs/) persisted to AsyncStorage as a single JSON blob
- [TMDB](https://developer.themoviedb.org/) for show data
- [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
  via `jest-expo`

## Project structure

```
index.ts          entry point: defines the background task, then starts Expo Router
assets/source/    icon generator (the PNGs in assets/images are its output)
store/play/       Play Store listing copy, feature graphic, 512px icon, privacy policy page
src/
  app/            expo-router screens: watchlist, search, show detail
  app-tests/      tests for the screens above
  components/     ShowRow, SeasonRow, Poster, StatusChip, EmptyState, MissingTokenBanner
  lib/            TMDB client, token decoding, show/season rules, alert rules, notifications,
                  background refresh, AsyncStorage I/O, types
  store/          the zustand watchlist store
  theme/          MD3 + Tailwind tokens, the Paper theme, NativeWind interop
  test-utils/     render wrapper and TMDB fixtures
```

## How season status works

For each show the app picks the current season (the season of the next announced episode, else
of the last aired one) and loads its episode list. Earlier seasons count as complete once their
first air date has passed, later ones as upcoming; their binge time is estimated from TMDB's
typical episode length. See [`src/lib/shows.ts`](src/lib/shows.ts). For the current season:

- **Complete**: every listed episode has aired and TMDB announces no further episode in that
  season.
- **Airing**: some episodes have aired; the finale date is the last listed episode's air date when
  known.
- **Upcoming**: nothing has aired yet.

Each followed show stores its last snapshot, so the watchlist works offline and a failed refresh
keeps the previous data.

## How notifications work

There's no push server. The app checks TMDB itself and posts local notifications
([`src/lib/alerts.ts`](src/lib/alerts.ts) decides what to say,
[`src/lib/notifications.ts`](src/lib/notifications.ts) shows it):

- **When**: on every launch, when the app comes back to the foreground after 30+ minutes, and in
  the background via [`expo-background-task`](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/)
  roughly every 6 hours ([`src/lib/backgroundRefresh.ts`](src/lib/backgroundRefresh.ts)).
  Android's WorkManager runs it only with network and enough battery, so timing is approximate.
  The task is defined in [`index.ts`](index.ts), the app's entry point, because Android runs it
  without rendering any screen.
- **What**: each followed show remembers which facts it has already announced (`premiere:3`,
  `complete:3`, `cancelled`). Following a show records the current facts without notifying, so
  you only hear about changes from then on, and each fact is announced exactly once.
- **Permission** is asked when you first follow a show, not on launch. Android groups the alerts
  under a "Season updates" channel that can be muted separately in system settings.
- Background tasks and local notifications both work in Expo Go on Android. To trigger the
  background task on demand while testing, call `BackgroundTask.triggerTaskWorkerForTestingAsync()`
  from a debug build.

## Assets

The app icon is a TV with a checkmark on the screen (a season that's done), gold (`#FFB956`) on
near-black (`#1F1B16`). Everything is drawn as SVG in code and rasterized with
[`sharp`](https://sharp.pixelplumbing.com/), so it's reproducible from the command line:

```bash
npm install --no-save sharp
node assets/source/render-icons.js
node store/play/render-feature-graphic.js
```

`render-icons.js` writes the main icon, favicon, splash glyph, the Android adaptive icon's
foreground and monochrome (themed icon) layers, and `store/play/icon-512.png`. The adaptive layers
are scaled down so the glyph stays inside Android's 66dp safe zone under circular masks.

## Data safety

There's no account and no backend of ours. The watchlist lives in local AsyncStorage under
`finale:v1`, and the app opts in to the OS's own device backup, same as Punch: Android follows
`android:allowBackup` (set to `true` in `app.json`), and on iOS
`RCTAsyncStorageExcludeFromBackup: false` overrides the library's default of excluding itself.

Unlike Punch, the app does send data off the device: search text, show IDs and poster requests go
straight to TMDB. That's disclosed in [`PRIVACY.md`](PRIVACY.md) and in the Play data safety
answers in [`store/play/listing.md`](store/play/listing.md).

## Publishing

- **Before any public release**: move TMDB behind a proxy (see [The TMDB token](#the-tmdb-token)),
  then update `PRIVACY.md` and the data safety answers to match.
- **Privacy policy URL**: [`PRIVACY.md`](PRIVACY.md) is the copy of record; publish
  [`store/play/privacy-policy.html`](store/play/privacy-policy.html) somewhere public and use that
  URL in Play Console.
- **Android permissions**: as with Punch, `android.blockedPermissions` strips the storage
  permissions `expo-file-system` declares by default; `INTERNET` is the only one the app needs.
- **R8 minification** is on for release builds via `expo-build-properties`. Test a `preview` build
  on a device before shipping `production`.
- **Store listing**: copy, assets and remaining to-dos (screenshots) are in
  [`store/play/listing.md`](store/play/listing.md).
- **Build and submit**: `eas build --profile production --platform android`, then
  `eas submit --platform android`. A new personal Play developer account needs a closed test with
  12 testers for 14 days before production.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

[MIT](LICENSE)
