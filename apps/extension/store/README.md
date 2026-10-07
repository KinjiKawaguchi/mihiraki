# Chrome Web Store listing

What is entered in the Chrome Web Store developer dashboard, kept here so it can be reviewed and reused. The extension's name and summary come from `public/_locales`.

| File | Dashboard field |
| --- | --- |
| `listing.en.md` / `listing.ja.md` | Store listing (description), Privacy practices |
| `promo-tile-440x280.png` | Small promo tile (rendered from `artwork/promo-tile.svg`) |
| `screenshot-*.png` | Screenshots (1280×800) |
| `../public/icon/128.png` | Store icon |

Privacy policy URL: https://github.com/KinjiKawaguchi/mihiraki/blob/main/PRIVACY_POLICY.md

## Automated submission

On every `v*` tag, `.github/workflows/publish-release.yml` uploads the package to the store item and submits it for review with the Chrome Web Store API v2. The first version was uploaded by hand in the developer dashboard, since the API cannot create an item.

No key is stored anywhere. The job exchanges GitHub's OIDC token for a short-lived token of the service account `cws-publisher@mihiraki-release.iam.gserviceaccount.com` through Workload Identity Federation:

- Google Cloud project `mihiraki-release`, pool `github`, provider `mihiraki`
- The provider accepts only `v*` tags of this repository (matched by repository and owner id), and only from jobs deployed to the `chrome-web-store` environment (`assertion.environment`)
- The `chrome-web-store` environment allows only `v*` tags and waits for the owner's approval, so every submission is approved by hand in the workflow run
- The `release-tags` ruleset lets only repository admins create, move or delete `v*` tags (release-please creates them with the owner's token)
- The service account holds no roles; it is registered on the publisher in the dashboard (Account > Service account), which is what lets it publish

Repository variables used by the job (it is skipped while `CWS_EXTENSION_ID` is unset):

| Variable | Value |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/757531454947/locations/global/workloadIdentityPools/github/providers/mihiraki` |
| `GCP_SERVICE_ACCOUNT` | `cws-publisher@mihiraki-release.iam.gserviceaccount.com` |
| `CWS_PUBLISHER_ID` | Publisher ID from the dashboard (Account) |
| `CWS_EXTENSION_ID` | The store item's ID |
