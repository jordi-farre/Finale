# Finale Privacy Policy

**Effective 2026-09-30**

Finale has no account, no server of its own, and no analytics. It does talk to one outside
service, The Movie Database (TMDB), to look up shows. Here's the whole picture.

## What we collect

Nothing. Finale doesn't collect, sell, or share any personal data, usage data, or analytics with
us or anyone else. There's no sign-in, no user ID, no advertising SDK, and no crash-reporting
service.

## What goes to TMDB

To find shows and check their status, the app sends requests directly from your phone to
[TMDB](https://www.themoviedb.org):

- the text you type into search,
- the TMDB IDs of the shows you open or follow, to fetch their status and episode dates,
- requests for poster images.

Like any website, TMDB receives your IP address with those requests. Nothing that identifies you
(name, email, account) is sent, and we don't receive a copy. TMDB's handling of that traffic is
covered by the [TMDB privacy policy](https://www.themoviedb.org/privacy-policy).

## Where your data lives

On your device. The list of shows you follow is saved with your phone's operating system under the
key `finale:v1` (see [`src/lib/storage.ts`](src/lib/storage.ts)). Uninstalling the app deletes it
permanently.

## Backing up a lost phone

Handled by your phone, not by us. Finale opts in to your device's own backup (iCloud Backup on
iOS, "Back up to Google Drive" on Android). If you have that turned on, your watchlist is
included; if it's off, it isn't. We never see that backup.

## Children's privacy

Finale isn't directed at children and collects nothing from anyone.

## Changes

If Finale changes in a way that touches this policy (for example, moving TMDB requests behind a
server of our own), this file will say so, with a new effective date, before that version reaches
you. The git history of this file shows exactly what changed and when.

## Questions

Open an issue at [github.com/jordi-farre/Finale](https://github.com/jordi-farre/Finale/issues).

Finale is an independent, single-developer app. It uses the TMDB API but is not endorsed or
certified by TMDB.

---

A styled version of this policy lives in
[`store/play/privacy-policy.html`](store/play/privacy-policy.html). This file is the copy of
record; if the two ever drift, this one wins.
