# Finale Privacy Policy

**Effective 2026-10-08**

Finale has no account and no analytics. It looks shows up on The Movie Database (TMDB) through a
small server of its own. Here's the whole picture.

## What we collect

Nothing. Finale doesn't collect, sell, or share any personal data, usage data, or analytics with
us or anyone else. There's no sign-in, no user ID, no advertising SDK, and no crash-reporting
service.

## What goes to TMDB

To find shows and check their status, the app sends a small server Finale runs on Cloudflare:

- the text you type into search,
- the TMDB IDs of the shows you open or follow, to fetch their status and episode dates.

That server forwards the request to [TMDB](https://www.themoviedb.org) and passes the answer back.
It keeps no logs and doesn't store your requests. Answers are cached for a few hours so repeated
lookups don't hit TMDB again; the cache holds only the search text or show ID and TMDB's answer,
never anything about who asked. Your IP address is used only for a short-lived rate limit that
stops the server being abused, and isn't stored. Cloudflare handles the connection itself under
the [Cloudflare privacy policy](https://www.cloudflare.com/privacypolicy/), and TMDB sees requests
coming from our server, not from you.

Poster images load directly from TMDB's image servers, which receive your IP address like any
website does; that's covered by the [TMDB privacy policy](https://www.themoviedb.org/privacy-policy).
Nothing that identifies you (name, email, account) is sent anywhere.

## Where your data lives

On your device. The list of shows you follow is saved with your phone's operating system under the
key `finale:v1` (see [`src/lib/storage.ts`](src/lib/storage.ts)). Uninstalling the app deletes it
permanently.

You can also export a backup file from Settings. Finale only creates the file and hands it to your
phone's share sheet, so where it goes (a cloud drive, an email, a chat) is entirely your choice and
it is never sent anywhere by the app itself. Importing reads a file you pick and replaces what's on
the device.

## Backing up a lost phone

Handled by your phone, not by us. Finale opts in to your device's own backup (iCloud Backup on
iOS, "Back up to Google Drive" on Android). If you have that turned on, your watchlist is
included; if it's off, it isn't. We never see that backup.

## Children's privacy

Finale isn't directed at children and collects nothing from anyone.

## Changes

If Finale changes in a way that touches this policy, this file will say so, with a new effective
date, before that version reaches you. The git history of this file shows exactly what changed and when.

## Questions

Open an issue at [github.com/jordi-farre/Finale](https://github.com/jordi-farre/Finale/issues).

Finale is an independent, single-developer app. It uses the TMDB API but is not endorsed or
certified by TMDB.

---

A styled version of this policy lives in
[`store/play/privacy-policy.html`](store/play/privacy-policy.html). This file is the copy of
record; if the two ever drift, this one wins.
