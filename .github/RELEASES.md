# Releases

Pushing a SemVer tag starts the CLI-only release workflow:

- `vX.Y.Z-<prerelease>` deploys isolated Convex and Vercel preview environments.
- `vX.Y.Z` deploys preview first, then production after the `production` GitHub Environment approves it.

The release workflow calls the existing Biome and React Doctor workflows before
either deployment. A failed check prevents every deployment. Tags are the only
release trigger, so an agent or maintainer releases a verified commit with:

```sh
git tag vX.Y.Z <verified-commit>
git push origin vX.Y.Z
```

## One-time GitHub configuration

Create `preview` and `production` GitHub Environments. Keep their secrets
separate, give `production` the required reviewers you want, and allow the
`v*` tag pattern to deploy to each environment.

Each environment needs these secrets:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | A Vercel token limited to this project/team. |
| `CONVEX_DEPLOY_KEY` | A Preview Deploy Key in `preview`; a Production Deploy Key in `production`. |

Create repository variables from the linked Vercel project (the local
`.vercel/project.json` is intentionally ignored):

| Variable | Value |
| --- | --- |
| `VERCEL_ORG_ID` | Vercel team or user ID. |
| `VERCEL_PROJECT_ID` | Vercel project ID. |

The workflow pins every GitHub Action to its release commit and pins the Vercel
CLI to `55.0.0`. Convex uses the version locked in `pnpm-lock.yaml`.

## Deployment model

`convex deploy` supplies the target `VITE_CONVEX_URL` while it invokes
`vercel build`; the workflow derives the matching Convex Site URL for upload
routes, then deploys Vercel's prebuilt output. This keeps each Vercel preview
connected to its matching Convex preview deployment instead of a shared backend.

This workflow deliberately leaves the existing Vercel Git integration unchanged.
If tags should become the only production deployment authority, disable Vercel's
automatic Git deployments after this workflow has been tested; otherwise branch
pushes can still create separate Vercel deployments outside the release gate.
