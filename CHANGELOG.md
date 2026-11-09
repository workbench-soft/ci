# Changelog

## Unreleased

- **Dependabot releases** a Dependabot merge also dispatches a release workflow that uses `release-gate.sh`, so repos on the new Release shape get a build beside their checks.
- **Docs** the README, the architecture diagram and the release spec describe the `workflow_run` start of Release.

- **CI** Release starts on `workflow_run` once Lint passes on `main`, one at a time. It no longer holds a PC runner while it waits, which starved Checks and timed releases out.

- **Release** `release.yml` and `wait-for-checks.sh` match the `repo-ci` templates, and shellcheck checks every release script.
- **Setup** the job's own mise shim folder reaches every step, the separate install step and the caller's steps too. Lint runs through the setup action and runs `mise run test`.
- **Dependabot releases** a token merge dispatches release builds paired with
  the selected checks, so both start without waiting for the checks to finish.

- **Parallel release builds** releases build beside checks after a push. Only publication waits for matching checks; open PRs hold no build.

- **Own Dependabot PRs** `merge-dependabot.yml` merges this repo's Dependabot PRs through the shared workflow, then runs Lint on main.
- **Docs** each heading of `docs/features.md` links its spec, and each feature that had no spec got one.
- **CI** portable jobs read their runner from the org variables `CI_RUNNER` and `CI_HEAVY_RUNNER`, so they build on Oracle or Blacksmith while the free minutes last, then on the PC. Jobs that need Windows or the PC keep their PC labels.

- **Dependabot auto-merge** a listed workflow without `workflow_dispatch` stops the run before the merge, so the PR stays open and the error names the file.
- **Releases** a newer release run waits in place of cancelling the running one, and a rerun reuses the tag a failed run pushed. A release started by hand runs on `main` only.
- **Release scripts** `next-version.sh` stops without a date, the notes skip a `Co-Authored-By` line in any case, and `mise run test` checks both scripts.

- **Markdown** markdownlint-cli2 lints the docs in `mise run lint`.

- **Architecture decisions** `docs/architecture.md` gets a Decisions section. Each big choice names its reason, its cost and the rivals it beat.

- **Lint and format** `mise run lint` checks the release scripts with shellcheck and shfmt, and every file with oxfmt, next to actionlint.

- **Releases** a release built on the PC carries the Sydney date again. Before 11:00 in Sydney it got the day before.
- **Releases** each push to `main` that passes Lint gets a GitHub release such as `v2026.10.30.1`. Its notes list the commits since the release before.
- **Dependabot auto-merge** a PR a person pushed to waits for a review. A second run for a merged PR stops, so the checks start once.
- **Lint** actionlint 1.7.12 with a pinned shellcheck, and docs-only pushes skip it.
- **Docs** `docs/features.md` and `docs/architecture.md` give a high level view with a diagram.

- **Dependabot auto-merge** merges a PR as soon as it opens and then runs the checks on main. Callers switch to `pull_request_target`, and `dependabot-metadata.yml` is gone.
- **CI** runs on pushes to main only. PR runs are off, and the workflow says how to turn them back on.
- Shared setup action and Dependabot workflows for the app repos.
