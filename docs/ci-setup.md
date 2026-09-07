# Enabling CI

`docs/ci-workflow.yml` is a ready-to-use GitHub Actions workflow. It is not in
`.github/workflows/` because the OAuth token this repo was pushed with lacks the
`workflow` scope, and GitHub rejects any push that adds a workflow file without
it.

To enable it:

```bash
mkdir -p .github/workflows
git mv docs/ci-workflow.yml .github/workflows/ci.yml
git commit -m "ci: add verification workflow"
git push
```

If that push is rejected the same way, re-authenticate with the `workflow`
scope (`gh auth refresh -s workflow`) and push again.

## What it runs

`typecheck`, `lint`, the Vitest suite, and the Playwright suite with
`SKIP_VISUAL=1`.

Visual snapshots are skipped in CI on purpose. Baselines are committed per
platform (`template-oslo-chromium-darwin.png`), and a Linux runner has nothing
to compare against. `e2e/template-signatures.spec.ts` asserts the same template
regressions structurally and does run in CI, as do the print tests.

To run the visual snapshots yourself:

```bash
bun run test:e2e              # everything, including pixel comparison
bun run test:e2e:update       # re-baseline after an intentional design change
```
