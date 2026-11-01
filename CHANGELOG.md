# Changelog

## Unreleased

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
