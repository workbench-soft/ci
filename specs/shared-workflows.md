# Shared CI for the workbench-soft repos

## 2026-10-29 First version

The app repos copied the same CI steps by hand, and the copies drifted. This repo holds the shared parts. Each app repo keeps its own repo and calls them.

- **Setup action** `actions/setup` installs the mise tools and the pnpm dependencies.
- **Dependabot metadata** `dependabot-metadata.yml` stores the update type of a Dependabot PR.
- **Dependabot auto-merge** `dependabot-auto-merge.yml` merges a Dependabot PR once its checks pass, and leaves a major update for a person.
- **Version** app repos call `@main`, so a merge here reaches each repo on its next run.
- **Access** this repo is private. Settings, Actions, Access is set to the organization, so the other private repos can call it.
- **Left per repo** the app checks and the release jobs. Their steps differ by stack.
