# Tether family source and feature inventory

The [Kalpataru feature inventory](tether-features.md) is the public companion
projection of the [canonical Tether ledger](https://github.com/tokenbender/tether/blob/main/docs/features.md).
The full family inventory follows the source repository's access controls.

The `kalpataru/` directory is generated website output. Its
`build-manifest.json` identifies the source revision and artifact digest.
Kalpataru source is maintained in the independent `tether/curation-atlas`
repository. Inventory mirrors live here under `docs/` so website builds do
not overwrite them.

Refresh the mirror from the main Tether checkout with
`scripts/sync-feature-inventory --public-mirror-repo ../kautuhal`; use `--check` to
verify it. Commit and synchronize these documentation paths independently of
unrelated website changes.
