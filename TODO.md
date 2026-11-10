# TODO

## app-audit

- [ ] Check the next Dependabot PR in an app repo merges on open, and that a commit you push to one waits for you (workbench-soft/ci#3)
- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- [ ] Check the next release on main gets one tag and one release (job app-audit 2026-11-02)
- [ ] Fix the retry in `skills/repo-ci/templates/release-gate.sh` of agent-skills-private: `gh api` prints its error body on stdout, so a failed try lands in the captured answer. Keep each try in a variable and print it only on success. The template steps already pass GH_TOKEN (app-audit of ci, 2026-11-11)
- Left: `gh workflow view | grep -q` under pipefail could fail on SIGPIPE, not seen on the small workflow files (app-audit 2026-11-11)
