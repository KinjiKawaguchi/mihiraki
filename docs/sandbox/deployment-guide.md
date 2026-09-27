# Deployment guide

This guide describes how we release the API service to production.

## Before you deploy

- Make sure the main branch is green.
- Announce the deployment in #releases.
- Check that no incident is open.

## Rollout

Deployments go out in two stages. We first release to 10% of the servers and watch the error rate for 30 minutes.

If the error rate stays below 1%, we release to the remaining servers.

## Rolling back

Run `deploy rollback` with the previous version number. The rollback takes about ten minutes.

| Environment | Approver | Window |
| --- | --- | --- |
| Staging | Any engineer | Any time |
| Production | Team lead | Weekdays 10:00–16:00 |
