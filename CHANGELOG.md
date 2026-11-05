# Changelog

## Unreleased

- **CI** keep mise shims in the runner's temporary directory so setup won't replace a shim held open by a running tool.
- **Dependabot releases** a token merge dispatches release builds paired with
  the selected checks, so both start without waiting for the checks to finish.

- **Parallel release builds** releases build beside checks after a push. Only publication waits for matching checks; open PRs hold no build.

- **Release** a newer green main cancels the running release, so the newest build ships first.
- **Own Dependabot PRs** `merge-dependabot.yml` merges this repo's Dependabot PRs through the shared workflow, then runs Lint on main.
- **CI** Release waits while a PR of an agent session is open, so the last merge of a batch releases them all.
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
