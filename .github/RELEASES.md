# Releases

Pushing a SemVer tag starts the CLI-only release workflow:

- `vX.Y.Z-<prerelease>` (rc, staging, demo, …) deploys Convex and Vercel preview environments immediately — no quality checks, no approvals. All prereleases of the same version share the `release-vX-Y-Z` Convex preview deployment (dots become dashes; Convex deployment names only allow alphanumerics, dashes, and slashes), so `-rc.2` reuses the backend and data `-rc.1` created.
- `vX.Y.Z` runs the Biome and React Doctor workflows as blocking gates (read-only `biome ci`; React Doctor fails the run on error-severity findings or an incomplete scan), then deploys production through the `production` GitHub Environment (approval only if that environment has required reviewers).

The two paths are independent: a failed check only blocks production. Stable tags must point at a commit reachable from `origin/main`; prerelease tags may target any commit so previews can validate unmerged work. Tags are the only release trigger, so an agent or maintainer releases a verified commit with:

```sh
git tag vX.Y.Z <verified-commit>
git push origin vX.Y.Z
```

## One-time GitHub configuration

Create `preview` and `production` GitHub Environments. Keep their secrets separate, give `production` the required reviewers you want, and allow the `v*` tag pattern to deploy to each environment. To control who can trigger releases at all, add a repository ruleset that restricts creation of `v*` tags to release maintainers.

Each environment needs these secrets:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | A Vercel token limited to this project/team. |
| `CONVEX_DEPLOY_KEY` | A Preview Deploy Key in `preview`; a Production Deploy Key in `production`. |

Create repository variables from the linked Vercel project (the local `.vercel/project.json` is intentionally ignored):

| Variable | Value |
| --- | --- |
| `VERCEL_ORG_ID` | Vercel team or user ID. |
| `VERCEL_PROJECT_ID` | Vercel project ID. |

The workflow pins every GitHub Action to its release commit and pins the Vercel CLI to the `VERCEL_CLI_VERSION` declared in `release.yml`. Convex uses the version locked in `pnpm-lock.yaml`.

## Deployment model

`convex deploy` detects TanStack Start and injects both `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` for the target deployment into the command it runs via `--cmd`; the workflow uses that command only to export the two URLs to `$GITHUB_ENV`, then runs `vercel build` in a separate step and deploys the prebuilt output. This keeps each Vercel preview connected to its matching Convex preview deployment instead of a shared backend, and the application build runs in a process tree that never held `CONVEX_DEPLOY_KEY` — build tooling cannot recover the deploy key from a parent environment. Convex functions are pushed before the frontend builds, so backend changes must stay backward compatible with the currently deployed frontend (already required by the push→deploy window).

Convex preview deployments expire automatically (5 days on Free/Starter, 14 on Pro and above) and count toward the team deployment limit, so a preview release is a short-lived staging environment, not a persistent one.

This workflow deliberately leaves the existing Vercel Git integration unchanged. If tags should become the only production deployment authority, disable Vercel's automatic Git deployments after this workflow has been tested; otherwise branch pushes can still create separate Vercel deployments outside the release gate.
