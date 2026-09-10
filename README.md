# Currency Pulse

Currency Pulse records EUR-based exchange-rate observations and visualizes them in a React dashboard. The application, collector code, and GitHub Pages site live in this repository; generated runtime data lives in a persistent GitHub Release instead of Git history.

## Architecture

```text
Frankfurter API
      ↓
Scheduled GitHub Actions collectors
      ↓
GitHub Release tagged data-live
  ├── latest.json
  ├── history.json
  └── plan.json
      ↓
GitHub Pages deployment stages latest.json + history.json
      ↓
Static dashboard
```

No external database or paid service is required. A normal collection run replaces release assets and triggers a Pages deployment without creating a source commit. Git history therefore records engineering changes rather than routine observations.

The committed files in `public/data` and the existing `data` directory are retained as bootstrap data and local-development fixtures. Scheduled workflows seed the first `data-live` release from them, then restore and update the release assets on later runs.

## Live Data

- `latest.json` contains the newest observation.
- `history.json` contains the observation history used by charts, statistics, and the table.
- `plan.json` contains the active daily randomized collection plan and completed-slot state.

GitHub Release downloads are not a reliable cross-origin browser API, so the deployment workflow downloads `latest.json` and `history.json` from the release before building the same-origin static site. The dashboard also compares `latest.json` with the newest valid history entry so the displayed latest observation cannot remain behind a newer history record.

## Scheduling

Automation runs on GitHub-hosted runners, so no local computer needs to remain online. Planning and collection use the `Europe/Vilnius` logical date.

The daily planner and all seven collection slots run every day, including Saturday and Sunday. The planner uses this weighted random distribution for a daily total of 1 to 7 observations:

- `1 => 10%`
- `2 => 15%`
- `3 => 20%`
- `4 => 25%`
- `5 => 15%`
- `6 => 10%`
- `7 => 5%`

The planner collects the first observation. Remaining selected slots are spread across the day. A shared Actions concurrency group serializes all runtime-data updates so two collectors cannot overwrite each other.

GitHub cron jobs may start later than their scheduled minute. Slot matching therefore uses the triggering cron string rather than the runner's exact start time.

## Workflows

- `.github/workflows/plan-daily-snapshots.yml`
  - Runs every day and by manual dispatch.
  - Restores the live history and current plan from `data-live`.
  - Creates the day's randomized plan and first observation.
  - Replaces the three live release assets.

- `.github/workflows/collect-exchange-rate-snapshot.yml`
  - Runs at the existing seven UTC slots every day and by manual dispatch.
  - Restores `plan.json`, checks whether the triggering slot is selected and incomplete, and skips cleanly when it is not.
  - Collects selected observations, records completion, and replaces the live assets.

- `.github/workflows/manual-snapshot-session.yml`
  - Collects a requested number of evenly spaced observations.
  - Publishes the finished latest/history data once, without creating commits.

- `.github/workflows/deploy-pages.yml`
  - Runs for frontend/configuration changes, successful collector workflow completions, and manual dispatches.
  - Downloads current release data into the Pages build without modifying the checked-out repository or creating a commit.
  - Lints, builds, verifies, and deploys the static dashboard.

## Local Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run snapshot`
- `npm run plan:snapshots`
- `npm run check:snapshot-slot`
- `npm run complete:snapshot-slot`

Local commands continue to use `public/data`, `data/snapshots`, and `data/plans` by default. Workflows redirect those outputs into runner-only directories with `SNAPSHOT_DATA_DIRECTORY`, `SNAPSHOT_ARCHIVE_DIRECTORY`, and `SNAPSHOT_PLAN_DIRECTORY`.

PowerShell example for checking a slot locally:

```powershell
$env:TRIGGER_SCHEDULE = "11 8 * * *"
npm run check:snapshot-slot
```

To regenerate a local daily plan:

```powershell
Remove-Item data\plans\YYYY-MM-DD.json
npm run plan:snapshots
```

## Deployment

Enable GitHub Pages with `Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`.

The collector workflows require the repository's standard Actions `contents: write` permission so they can create and replace release assets. The Pages workflow remains read-only for repository contents and has only the additional `pages: write` and `id-token: write` permissions needed for deployment.

Expected Pages URL:

```text
https://<github-username>.github.io/currency-pulse/
```

No API secret is required; observations come from the free Frankfurter endpoint.
