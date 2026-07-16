# Currency Pulse

Currency Pulse records EUR-based exchange-rate observations and visualizes them in a React dashboard using repository JSON files.

## Data Source

The dashboard reads only these files:

- `public/data/latest.json`
- `public/data/history.json`

Raw snapshots are stored in:

- `data/snapshots/YYYY/MM/DD/*.json`

Daily snapshot plans are stored in:

- `data/plans/YYYY-MM-DD.json`

## Local Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run snapshot`
- `npm run plan:snapshots`
- `npm run check:snapshot-slot`
- `npm run complete:snapshot-slot`

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

## Automation

GitHub Actions runs all automation on GitHub servers. Your computer does not need to stay on.

The planner uses a weighted randomizer for daily total snapshot count (1 to 7):

- `1 => 10%`
- `2 => 15%`
- `3 => 20%`
- `4 => 25%`
- `5 => 15%`
- `6 => 10%`
- `7 => 5%`

One real snapshot is always collected during daily planning. Remaining selected slots run throughout the day. Each successful snapshot produces exactly one data commit.

Exchange-rate values can repeat between observations. The project records observations, not guaranteed tick-level market movement.

GitHub cron jobs may execute later than their scheduled minute. Slot matching relies on the triggering cron string, not the exact runtime clock.

All persistent data remains inside the GitHub repository.

```text
Daily planner
      ↓
Random target count
      ↓
First snapshot + saved plan
      ↓
Scheduled slot checks
      ↓
Selected slots collect data
      ↓
JSON updated and committed
      ↓
Dashboard reads repository data
```

## Workflows

- `.github/workflows/plan-daily-snapshots.yml`
  - Runs daily and on manual dispatch.
  - Creates the Asia/Dhaka daily plan.
  - Collects the first real snapshot for the day.
  - Commits plan + snapshot together.

- `.github/workflows/collect-exchange-rate-snapshot.yml`
  - Runs on seven fixed UTC schedules and manual dispatch.
  - Checks whether the triggered slot is selected.
  - Collects snapshot only for selected, not-yet-completed slots.
  - Marks the slot as completed in the plan.
  - Commits and pushes generated files.

## Required Repository Setting

Enable write permissions for workflows:

`Settings -> Actions -> General -> Workflow permissions -> Read and write permissions`

## Notes

- Timezone for logical planning date: `Asia/Dhaka`
- Machine timestamps are ISO-8601 UTC.
- No API secret is required (Frankfurter free endpoint).
