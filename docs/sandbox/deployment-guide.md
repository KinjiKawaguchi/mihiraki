# Deployment guide

This guide describes how we release the API service to production.

## Before you deploy

- Make sure the main branch is green.
- Announce the deployment in #deployments at least one hour before.
- Check that no incident is open.
- Confirm that database migrations are backward compatible.

## Rollout

Deployments go out in three stages. We first release to 5% of the servers, then 25%, and watch the error rate for 15 minutes at each stage.

If the error rate rises above 0.5%, stop the rollout and roll back.

## Rolling back

Run `deploy rollback` with the previous version number. The rollback takes about five minutes.

| Environment | Approver | Window |
| --- | --- | --- |
| Staging | Any engineer | Any time |
| Production | Team lead | Mon–Thu 10:00–15:00 |
