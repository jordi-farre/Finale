# Play Store listing — Finale

Copy-paste source for the Play Console store listing. Keep this in sync if the listing changes.

## Short description

_Max 80 characters. Currently 75._

```
Know if a show was cancelled, and when a season is complete. Then binge it.
```

## Full description

_Max 4000 characters. Currently ~940._

```
Finale is a TV tracker for people who binge. Instead of pinging you every week, it tells you what actually matters: whether a show gets an ending, and when a season is fully out.

BEFORE YOU START A SHOW
• Search any series and see right away if it's returning, ended, or cancelled
• "Cancelled after 2 seasons. The story may not get an ending." Know before you invest the hours

WHILE A SEASON AIRS
• Follow a show and Finale keeps track of the current season: how many episodes are out, and when the finale airs
• Your watchlist is grouped into Ready to binge, Season airing, and Waiting for new episodes

WHEN IT'S DONE
• A complete season shows its episode count and total runtime, so you know how long the binge will take

PRIVATE BY DESIGN
No account, no sign-in, no ads, no analytics. Your watchlist stays on your phone. Show data comes from The Movie Database (TMDB).

Finale uses the TMDB API but is not endorsed or certified by TMDB.
```

## Other listing fields

| Field | Value |
| --- | --- |
| App name | Finale |
| Category | Entertainment |
| Contact email | Set directly in Play Console |
| Privacy policy URL | _To do_: publish [`privacy-policy.html`](privacy-policy.html) (a styled version of [`PRIVACY.md`](../../PRIVACY.md)) and put its URL here |
| Content rating | No content concerns of its own. Show titles, posters and synopses come from TMDB, so answer the questionnaire with that in mind |
| Data safety form | See below |

## Data safety form

Unlike Punch, Finale sends data off the device: search text and show IDs go to TMDB to fetch
results. Play counts data sent from the app to a third party as collected, so the conservative
answer is:

- **App activity → In-app search history**: collected, not shared, processed only to provide the
  feature, not optional (search requires it), no account link.
- Everything else: not collected.
- Data encrypted in transit: yes (HTTPS).
- Users can request deletion: not applicable; nothing is held by the developer.

Revisit this if TMDB requests move behind a proxy of our own.

## Assets

- [`icon-512.png`](icon-512.png): 512×512, for the Play Console app icon slot.
- [`feature-graphic.png`](feature-graphic.png): 1024×500, PNG, no alpha. Generated from
  [`feature-graphic.svg`](feature-graphic.svg); edit the SVG and re-render with `sharp` (see the
  README's Assets section). Uses a made-up show title on purpose: real show names and posters in
  store graphics risk Play's intellectual property policy.
- [`screenshots/`](screenshots/): **to do**. Capture from a real phone via Expo Go with a TMDB
  token set, as Punch did (at least 2, ideally watchlist, search with a Cancelled result, show
  detail, empty state). Real show posters in screenshots are common in tracker apps, but prefer
  shows with plain title cards over key art if you want to stay cautious.
