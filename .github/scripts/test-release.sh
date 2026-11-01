#!/bin/sh
# Checks next-version.sh and release-notes.sh against a throwaway git repo.
#   test-release.sh    prints "ok", or the first wrong output and exits 1
set -eu

scripts=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"

# The repo sees no user config, so hooks, signing and the real name stay out.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
export GITHUB_REPOSITORY=workbench-soft/ci
git init -q -b main

# Each commit gets its own second, so git log keeps the order below.
n=0
commit() {
  n=$((n + 1))
  export GIT_AUTHOR_DATE="@$((1700000000 + n)) +0000" GIT_COMMITTER_DATE="@$((1700000000 + n)) +0000"
  git commit -q --allow-empty "$@"
}

# The expected text on stdin, the command in the arguments. The short SHAs differ on each run.
expect() {
  cat >"$tmp/expected"
  "$@" | sed 's/ ([0-9a-f]*)$//' >"$tmp/actual" || true
  if ! diff -u "$tmp/expected" "$tmp/actual"; then
    echo "wrong output from: $*"
    exit 1
  fi
}

commit -m 'chore: start'
day=$("$scripts/next-version.sh")
case $day in
  [0-9][0-9][0-9][0-9].[0-9][0-9].[0-9][0-9].1) ;;
  *)
    echo "next-version.sh with no tag printed $day, want <date>.1"
    exit 1
    ;;
esac
day=${day%.1}

# The first release lists every commit and has no release to compare with.
expect "$scripts/release-notes.sh" "v$day.1" <<EOF
<details><summary>Other changes</summary>

- chore: start

</details>

EOF

git tag "v$day.1"
commit -m 'feat: add a thing' -m 'Why it helps.' -m 'A note for developers.'
commit -m 'fix(notes)!: keep the body' -m 'Co-authored-by: Test <test@example.com>'
commit -m 'perf: skip a call'
git checkout -q -b side
commit -m 'chore: on a branch'
git checkout -q main
commit -m 'docs: explain the test'
git merge -q --no-ff -m 'Merge side' side

# The subject loses its type, the body keeps its first paragraph, merges stay out.
expect "$scripts/release-notes.sh" "v$day.2" <<EOF
## New

- Add a thing
  Why it helps.

## Fixes

- Keep the body

## Faster

- Skip a call

<details><summary>Other changes</summary>

- chore: on a branch
- docs: explain the test

</details>

**Full Changelog**: https://github.com/workbench-soft/ci/compare/v$day.1...v$day.2
EOF

# The number counts, so 10 comes after 9.
git tag "v$day.9"
git tag "v$day.10"
expect "$scripts/next-version.sh" <<EOF
$day.11
EOF

echo ok
