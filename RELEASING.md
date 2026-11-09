# Releasing

A release is an annotated `vX.Y.Z` (or `vX.Y.Z-rc.N`) tag on `main` and one immutable GitHub
Release carrying eight package tarballs. Consumers install those tarballs by URL; nothing is
published to npm.

## Rules

- Release only a commit that is already on `main`.
- Let source PRs and their `.changes` fragments accumulate on `main` and cut one release per
  working session. Cut sooner only when a consumer is blocked by a bug.
- The root manifest and the eight packages (`@yesid/tokens`, `@yesid/motion`, `@yesid/gates`,
  `@yesid/seo-kit`, `@yesid/ui`, `@yesid/analytics`, `@yesid/i18n-core`, `@yesid/config`) share
  one version. The private Gallery stays at `0.1.0`.
- Every version move consumes at least one `.changes/*.md` fragment, except promoting a release
  candidate to its stable version, which reuses the candidate's changelog entry.
- Never move, delete or re-push a tag, and never edit a published Release. Fix forward with a new
  version.
- A candidate tag publishes publicly. Obtain the owner's API report approval before the first
  candidate tag. If a later candidate changes the API report, obtain approval again before its
  tag. Stable promotion preserves that approved report.
- Rehearse any release whose API report or migration notes change on all three consumers before
  promoting it to stable. A patch with no contract change can skip the rehearsal. Only the latest
  stable release is supported; a candidate is temporary verification, not another supported line.

## 1. Release pull request

Each consumer-visible change adds a fragment:

```md
---
"@yesid/ui": patch
"@yesid/motion": minor
---

What changed for consumers, and how to migrate.
```

`patch` fixes, `minor` adds or carries an approved removal (see [`DEPRECATION.md`](DEPRECATION.md)),
`major` breaks a contract. When in doubt, the API report diff decides.

First merge the source change or fix, regenerated API report, regression test and new fragment
in a source PR with green CI. Do not run release preparation in that PR: preparation deletes the
fragment, but an API-changing PR must still contain its new fragment to pass the API approval
check. Then start a separate release-only PR from updated `main` and run:

```sh
bun run release:prepare -- --version X.Y.Z
bun run release:check -- --version X.Y.Z
```

For a release that requires rehearsal, use `X.Y.Z-rc.1` instead of `X.Y.Z` in both commands.
Prepare bumps every manifest and `bun.lock`, folds the fragments into `CHANGELOG.md` and deletes
them, and moves the package READMEs' links from `blob/v<previous>/` to `blob/vX.Y.Z/`. Merge the
release-only PR once CI is green and the API report diff has been read. Before the first candidate
tag, obtain the owner's API report approval; obtain it again before any later candidate tag whose
report changes. Keep the exact design commit, version, API report diff and approval in the release
evidence. A contract change also needs the rehearsal below before stable promotion.

Release-only PRs take a light CI lane only with the exact title
`chore(release): prepare vX.Y.Z` or `chore(release): prepare vX.Y.Z-rc.N`, or
`chore(release): promote vX.Y.Z` (stable only). CI must reproduce the PR byte for byte in two
independent runs of the merge base's `release:prepare`, using Bun matching that merge base's
`.bun-version`. The light lane still runs API report approval, type checks, tests, Ubuntu token
drift, build, `release:check` and packing all eight packages. It skips `browser-authority`,
`token-outputs-windows` and `token-byte-parity`. Anything else runs full CI.

## 2. Tag

Use `TAG=vX.Y.Z-rc.N` in the sequence below when tagging a candidate.

```sh
git fetch --prune origin main --tags
git switch --detach origin/main
test -z "$(git status --porcelain)"
TAG=vX.Y.Z
git tag -a "$TAG" -m "$TAG"
bun run release:check -- --version "${TAG#v}" --tag "$TAG"
test "$(gh api repos/mgkdante/yesid.design/immutable-releases --jq .enabled)" = true
git push origin "refs/tags/$TAG"
```

## 3. Publish

The tag push runs [`release.yml`](.github/workflows/release.yml). It checks that the tag is
annotated, on `main` and matches the prepared version, runs `check` and `test`, and packs each
package with `bun pm pack`. Before packing, every sibling `workspace:*` peer is pointed at this
release's own asset URL, so an install never asks the npm registry for an `@yesid` name. The
workflow attests build provenance for the eight tarballs, then `gh release create` uploads them to
a draft and publishes it only when all are attached; the repository's immutable releases lock it.

Check the result:

```sh
gh release view "$TAG" --json assets --jq '.assets[].name'   # the eight yesid-<pkg>-X.Y.Z.tgz
gh release verify "$TAG"
gh release download "$TAG" --pattern 'yesid-ui-*.tgz' --dir /tmp/check
gh attestation verify /tmp/check/yesid-ui-*.tgz --repo mgkdante/yesid.design
```

If the run fails before publishing, check `gh release view "$TAG"`. `gh release create` deletes
its draft on failure, but cleanup can fail or the run can be cut off: delete only a confirmed
unpublished draft (`gh release delete "$TAG"`) before retrying. Rerun a transient failure with
`gh run rerun <run-id>`. If the workflow itself needed a fix, merge it to `main` and dispatch it for
the same tag: `gh workflow run release.yml -f tag="$TAG"`. The dispatch runs `main`'s workflow, but
checkout, setup, tests and package sources still come from the tag, so a defect in the tagged
source needs a new version. A published Release stays as it is.

## 4. Rehearse a contract change

After the candidate release PR is merged, follow steps 2 and 3 with `TAG=vX.Y.Z-rc.1`.
The workflow marks versions with a prerelease suffix as GitHub prereleases. Verify its eight
assets and provenance just as for stable. Do not install local packs, branch archives or assets
outside a release tag in a consumer.

In **each** of Transit, yesid.dev and [yesid.login](https://github.com/mgkdante/yesid.login):

1. Open the app's adoption PR as a draft from its current `origin/main` against that app's
   `main`, using the exact release candidate `vX.Y.Z-rc.N`. Record that base SHA.
   Make app fixes in this same PR.
2. Change every design tarball URL in `package.json` to the candidate's exact tag and version,
   including sibling peers, then run `bun install`. Keep the diff to those URLs, `bun.lock`, the
   adoption changes required by the release's migration notes, and release-related app fixes
   discovered during rehearsal. Generate dependency lockfile changes with the app's pinned Bun on
   Linux, following its contribution rules.
3. Run the app's own required checks in that PR: source/architecture guards, generated-output
   drift checks, type checks, unit/integration tests, production build, accessibility and browser
   suites. Follow its scripts and CI definition for the exact commands and required jobs.
   For Transit and yesid.dev, the expected failures are `prerelease-guard` and the required `ci`
   aggregate that depends on it, only when every other required validation succeeds, including
   every yesid.dev e2e shard. In yesid.login, the guard runs as the last step of the required
   `verify` check: rehearsal must show `verify` failing only at that guard step after check and
   tests pass. Each app's guard must fail while any `@yesid` URL points at an `-rc` tag.
   Record these expected failures during rehearsal; the draft cannot merge with them failing.
   Before completing rehearsal, ensure the app's prerelease guard is enabled and required for
   merge; record a missing guard as a blocker on the release slice.
   Run local browser suites on dedicated ports with server reuse disabled when sharing a machine.
4. Exercise the changed contract in the real app callers, including the affected responsive,
   keyboard/accessibility and reduced-motion behavior. For example, a disclosure or section-jump
   change needs the app's actual panels and navigation, not just a generic fixture. Record the
   exact scenarios, results and any unverified behavior. Gallery remains repository evidence and
   cannot replace any app's acceptance.
5. On the owning release slice, record the candidate design SHA/tag, all three consumers' base
   and tested head SHAs, the URL/lockfile diff, check commands and CI run links, and the contract scenarios.
   Green evidence belongs to those exact heads; rerun affected checks if the candidate or app
   changes. Keep the adoption PRs as drafts until stable promotion and the stable switch below.

If any app finds a shared defect, first merge a design source PR containing the fix, regenerated
API report, regression test and new change fragment, with green CI. Then start a separate
release-only PR from updated `main`, prepare `X.Y.Z-rc.2` (then `rc.3`, etc.) and merge it with green
CI. If the API report changed, obtain the owner's approval again before tagging this candidate.
Publish the new tag, update all three draft adoption PRs to it and repeat all three app rehearsals.
Keep app fixes in those same PRs. Never repair an installed package or replace an earlier tag
or asset. If adoption needs an owner decision or a contract change
outside the release scope, stop promotion and record the blocker on the release slice.

### Promote the proven candidate

Once all three apps pass rehearsal on the same candidate, whose API report the owner approved
before its tag, start a stable release-only PR from current design `main`. Verify that the report
is unchanged from that approved candidate:

```sh
bun run release:prepare -- --version X.Y.Z
bun run release:check -- --version X.Y.Z
```

With no pending fragments, preparation promotes the latest same-core candidate's changelog
section rather than consuming it twice. Keep stable package source identical to the tested
candidate; review the diff for version, lockfile, README link and changelog-heading updates only.
If new source or pending fragments have landed on `main`, prepare another candidate and rehearse
it first using the separate source/release PR order above. If its API report changes, obtain the
owner's approval again before its tag. Merge the stable PR with green checks, then follow steps 2
and 3 for `vX.Y.Z`.
Leave candidate tags and releases intact. In each existing draft adoption PR, switch every design
tarball URL to the stable tag and version and regenerate the lockfile. Rerun the app's required CI
on that exact switched head, including the prerelease guard, and record the stable URL/lockfile
diff, tested head SHA and CI run links on the owning release slice. Only after those checks pass
can the same PR leave draft and merge. Publishing stable does not merge or deploy any app.

### Local tooling proof without publishing

```sh
bun run test:repository tests/repository/tooling/release-core.test.ts tests/repository/tooling/release-pack.test.ts
```

The release tests prepare and check isolated temporary fixtures, run real `bun pm pack` through
`rc.1`, a fragment-backed `rc.2` and stable promotion, and inspect all eight asset names and packed
sibling peer URLs. They restore checkout bytes after packing and never push tags or publish.
This proves local tooling, not GitHub publication, provenance or consumer acceptance.

## 5. Consumers

Transit, yesid.dev and yesid.login each take the stable release in their own adoption PR.
If it began as a draft for rehearsal, continue in that same PR. Change the tag and version in every
`https://github.com/mgkdante/yesid.design/releases/download/vX.Y.Z/yesid-<pkg>-X.Y.Z.tgz`
URL, run `bun install`, and rerun the app's required CI on that exact switched head before merging.
Each app's CI must fail while any `@yesid` URL points at an `-rc` tag, so a prerelease cannot reach
the app's `main`. The lockfile pins each tarball's integrity. Record adoption evidence on the owning
release slice; publication, adoption and deployed acceptance each need their own evidence.
A rollback is the same edit pointing at an earlier stable release.
