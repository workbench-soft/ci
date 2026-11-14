# Play bundle once a day

## What it does for the person

Each Android app sends its newest release to Google Play once a day, at
19:00 Sydney time. A push to `main` builds only the APK of the GitHub
release, so the 2 heavy PC runners build half as much. A run by hand sends
the newest release at once.

## User flows

1. Pushes to `main` publish GitHub releases with the APK through the day.
2. At 19:00 Sydney time the app's `play.yml` starts. `play-gate` finds the
   newest release.
3. When Play already has that release, the run ends in seconds.
4. Otherwise the app builds the signed bundle of that release on a heavy
   runner and uploads it to the `PLAY_TRACK` track.
5. `play-mark` records the release as sent, so the next day skips it.

## How it works

- **`actions/play-gate`** reads the newest published release whose tag
  starts with `tag-prefix`, in `release-repo`. On a schedule run it goes on
  only when the cron hour is 19:00 in Sydney. Each `play.yml` lists 2 crons,
  `0 8 * * *` and `0 9 * * *`, so one of them is 19:00 in summer and in
  winter. A run by hand always goes on.
- **Sent marker** `play-gate` looks up the cache key `play-sent-<tag>`.
  `actions/play-mark` saves it after the upload. The cache sits on `main`,
  so every workflow of the repo sees it.
- **Outputs** `tag` is the release to build, empty when the run has
  nothing to send. `sha` is the commit the release points at.

## Limits

- **Old marker** GitHub drops a cache unused for 7 days. An app with no new
  release for a week builds its last release once more, and Play refuses the
  same version code. The run fails, and the next release clears it.
- **Late schedule** GitHub can start a schedule run late. The gate reads the
  hour of the cron, not the clock, so a late run still counts.
- **Shared** the gate runs on a light runner through `actions/github-script`,
  so it needs no tools from `mise.toml`.

## Changes

### 2026-11-14 the Play bundle moves to a daily run

- **Why** on 2026-11-13 and 14 each push built the APK and the bundle on the
  2 heavy runners, and releases waited up to 4 hours for one. The owner chose
  one Play release a day at 19:00.
- **Changes** `actions/play-gate` and `actions/play-mark`. Each app gets a
  `play.yml`, and its push release stops building the bundle.
- **Docs** `README.md`, `docs/features.md`, `CHANGELOG.md`.
