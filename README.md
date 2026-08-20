# Aave <> Github workflows

This repository contains a collection of workflows that are used across Aave repositories.
The workflows can easily be used outside of Aave as well, as long as secrets are properly setup.

## Setup Node/Bun

Opinionated setup & install for node & bun.

name: `aave-dao/github-workflows/.github/actions/setup-node@main`

- detects node-package-manager to be used (npm/pnpm/yarn) according to present lockfile
- detects runtime-version to used
- installs (prefers offline, freezes lockfile) & caches the dependencies for node

## Foundry test

`foundry-test` workflow:

- installs foundry
- runs `forge build --sizes`
- runs `forge test -vvv`
- reports results in an automatically updated comment on the pr
- caches fork snapshots for recurrent runs

You can use the workflow via:

```yml
jobs:
  test:
    uses: aave-dao/github-workflows/.github/workflows/foundry-test.yml@main
```

Per default the workflow will assume your `.env.example` contains variables that are sufficient to run your tests. For advanced usage you can specify custom `RPCs`.

```yml
jobs:
  test:
    uses: aave-dao/github-workflows/.github/workflows/foundry-test.yml@main
    mode: ALL # or CHANGED
    # to inherit all secrets
    secrets: inherit
    # to inherit specific secrets
    secrets:
      RPC_MAINNET: ${{ secrets.RPC_MAINNET }}
```

## Foundry dependency updates

`foundry-dependencies` is a Dependabot-like reusable workflow for Foundry dependencies. It runs `forge update`, so dependency gitlinks and `foundry.lock` stay synchronized, and opens or updates a pull request when revisions change.

Add a caller workflow to the consuming repository:

```yml
name: Update Foundry dependencies

on:
  workflow_dispatch:
  schedule:
    - cron: "0 8 * * *"

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    uses: aave-dao/github-workflows/.github/workflows/foundry-dependencies.yml@main
    with:
      dependencies: |
        lib/aave-address-book
    # Optional: use a GitHub App or PAT token to run PR CI without approval.
    secrets:
      token: ${{ secrets.FOUNDRY_DEPENDENCIES_TOKEN }}
```

`dependencies` is required. List multiple dependency paths on separate lines. Updates always run recursively with the latest stable Foundry release.

When using the default `GITHUB_TOKEN`, the consuming repository must allow GitHub Actions to create pull requests under **Settings → Actions → General → Workflow permissions**.

The default `GITHUB_TOKEN` is sufficient to create the branch and pull request. GitHub holds the resulting pull-request checks until a maintainer clicks **Approve workflows and run**. Pass a GitHub App token or fine-grained PAT with repository contents and pull-request write access when those checks should start automatically.

If Dependabot is already configured for Git submodules, disable that update entry or ignore the dependencies managed by this workflow to avoid duplicate pull requests.

## Draft release

`draft-release` workflow:

- uses `standard-version` to generate a changelog based on [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/)
- creates a pr with the changes and a specific commit message

```yml
# this action is supposed to be used via workflow dispatch
on:
  workflow_dispatch:

jobs:
  draft-release:
    uses: aave-dao/github-workflows/.github/workflows/draft-release.yml@main
```

## Release-node

The `release-node` action is intended to be used with `draft-release`.
Instead of relying on manual dispatch this action is intended to be used on default branch merges only.

The workflows will listen for the commit message created by `draft-release` and then perform their release tasks.

`release` workflow:

- creates a github tag

`release-node` workflow:

- creates a node release
- the repository **MUST** specify a `ci:publish` step which facilitates [building and publishing](https://github.com/aave-dao/aave-address-book/blob/main/package.json#L17)

```yml
on:
  push:
    branches:
      - main

jobs:
  release-node:
    uses: aave-dao/github-workflows/.github/workflows/release-node.yml@main
    secrets:
      NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
```
