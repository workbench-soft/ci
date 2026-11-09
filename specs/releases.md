# Releases

## What it does for the person

Each push to `main` that passes the `Lint` workflow gets a GitHub release
in this repo, such as `v2026.10.30.1`. Its notes list the commits since the
release before, so a reader sees what changed without reading the log.

## User flows

1. A PR merges into `main`.
2. `Lint` runs on the push and passes.
3. Release, started beside Lint, tags the commit and publishes the notes on the Releases page.

## How it works

- **`.github/workflows/release.yml`** starts on a push to `main` beside
  `lint.yml`. `.github/scripts/wait-for-checks.sh` holds publication until
  Lint of the same commit passes. It runs on the PC runner `[self-hosted, local]` and costs 0 GitHub minutes.
- **`.github/scripts/next-version.sh`** picks the tag: the date, then the
  number of the release that day.
- **`.github/scripts/release-notes.sh`** writes the notes from the commits
  since the last tag.

## Limits

- **Notes only** the repo builds no file, so the release carries none.
- **Failed check** a red `Lint` run or a PR run starts no release.
- **Markdown only** `lint.yml` skips a push that changes only Markdown, so that push gets no release.

## Changes

### 2026-10-30 a release after each passing check

- **Why** the repo had checks and shipped no release, so a merge left no
  tagged point to go back to.
- **Changes** the Release workflow and its two scripts come from the
  `repo-ci` templates. `.gitattributes` keeps LF endings on `*.sh`.
- **Steps** this spec, then the workflow and scripts, then the docs.
- **Docs** `README.md`, `CHANGELOG.md`, `docs/features.md` and `docs/architecture.md`.

### 2026-11-09 week review: the release matches the repo-ci template

The week moved the release from `workflow_run` to a push run beside Lint, then dropped the open PR gate and the concurrency group. It left a bash copy of `wait-for-checks.sh` without the run bit and outside the shellcheck task, and comments about a tag push that no longer happens.

- **Template** `release.yml` and `wait-for-checks.sh` now match `repo-ci` templates. A second release side by side with the same version fails, and the next push ships its commits.
- **Lint** shellcheck checks every script in `.github/scripts`.
- **Docs** one copy of the timing text, in the release flow itself.
