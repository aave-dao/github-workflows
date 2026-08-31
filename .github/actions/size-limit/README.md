# Package-size report

Imported unchanged from [bgd-labs/size-limit-action at ae1e75a19db162bbc72bc446f60c4dfd2f27583f](https://github.com/bgd-labs/size-limit-action/tree/ae1e75a19db162bbc72bc446f60c4dfd2f27583f), the revision used by `aave-address-book`. The source, bundled runtime, action inputs, dependency lockfile, tests, and ISC license are preserved.

This migration changes ownership only. Report formatting, PR comments, the `min_delta` filter, and failure behavior are unchanged.

```yaml
- uses: aave-dao/github-workflows/.github/actions/size-limit@<commit>
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    min_delta: 2
```

Run `npm ci` and `npm test -- --runInBand` from this directory. After future source changes, rebuild the committed runtime with `npm run build`.
