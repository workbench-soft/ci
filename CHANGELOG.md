# Changelog

## Unreleased

- **Docs** `docs/features.md` and `docs/architecture.md` give a high level view with a diagram.

- **Dependabot auto-merge** merges a PR as soon as it opens and then runs the checks on main. Callers switch to `pull_request_target`, and `dependabot-metadata.yml` is gone.
- **CI** runs on pushes to main only. PR runs are off, and the workflow says how to turn them back on.
- Shared setup action and Dependabot workflows for the app repos.
