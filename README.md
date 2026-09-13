<div align="center">

# Currency Pulse

**A static exchange-rate observatory with scheduled, history-aware collection.**

`React` · `TypeScript` · `Recharts` · `GitHub Actions` · `GitHub Pages`

</div>

Currency Pulse records EUR-based exchange-rate observations and turns them into a responsive dashboard. Scheduled collectors run on GitHub-hosted infrastructure, while live JSON is stored as assets on a persistent GitHub Release so routine observations do not clutter source history.

## Architecture

```text
Frankfurter API
      ↓
Scheduled collectors
      ↓
GitHub Release: data-live
  latest.json · history.json · plan.json
      ↓
Pages deployment stages same-origin data
      ↓
Static React dashboard
```

The committed `public/data/` and `data/` files act as bootstrap fixtures. After initialization, workflows restore and replace the release assets on each valid collection run.

## Scheduling model

- Daily planning uses the `Europe/Vilnius` logical date.
- One to seven observations are selected from seven slots using a weighted distribution.
- The planner records the first observation; selected collectors complete the remaining slots.
- A shared concurrency group serializes data updates.
- Slot identity comes from the triggering cron expression, so a delayed GitHub runner does not miss its intended slot.

## Workflows

| Workflow | Responsibility |
| --- | --- |
| `plan-daily-snapshots.yml` | Restore data, generate the daily plan, collect the first point, publish assets |
| `collect-exchange-rate-snapshot.yml` | Collect selected scheduled slots and record completion |
| `manual-snapshot-session.yml` | Run an evenly spaced manual collection session |
| `deploy-pages.yml` | Stage release data, validate, build, and deploy the dashboard |

## Local development

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
npm run snapshot
npm run plan:snapshots
npm run check:snapshot-slot
npm run complete:snapshot-slot
```

Local commands use the committed data directories by default. Workflow runs redirect output with `SNAPSHOT_DATA_DIRECTORY`, `SNAPSHOT_ARCHIVE_DIRECTORY`, and `SNAPSHOT_PLAN_DIRECTORY`.

## Deployment

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Collector workflows need `contents: write` permission to maintain release assets; no API secret or external database is required.

## Data integrity

The dashboard compares `latest.json` with the newest valid history item so a stale latest asset cannot override newer history. Release downloads are staged during deployment because GitHub Release assets are not a dependable cross-origin browser API.

## License

No license is currently declared. All rights are reserved by default.
