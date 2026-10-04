# Vercel deployment

This repository serves the static site from `public/`. It has no build step or package dependencies.

## Vercel setup

Import this GitHub repository into Vercel and deploy with the repository root as the project root. The included `vercel.json` selects the `public/` output directory and the `Other` framework preset.

## Updating the site

From the original DaYanShiFa project root, regenerate the deployed files:

```powershell
python website/tools/build_vercel_package.py
```

Then commit and push the changed `public/` files from this repository. Vercel automatically deploys new commits on the connected production branch.

## Public data

The browser loads `hexagrams.json`, `routes-index.json`, and `rules.json` from `public/data/`; these V4 files are publicly downloadable as part of the site. The unused full route source and divination source are not included in the deployment output.
