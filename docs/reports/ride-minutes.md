# Ride minutes from Home

Catalog measured at `365c58a2a0b7fd816b4f2494921775576a33fc33`. Regenerate with `node dev/level/ride-minutes.ts --report`.

Times use the sim’s train profiles and all catalogued track and halts that can open. Depart from the Village or West landing at Home. Each ride runs non-stop on request and times exclude walks, waits and holds.

The table shows each direct way on the joined catalog. Where a town needs a transfer, it shows up to two departures with the fewest rides, changing at halts with the same town name. It picks the fastest route at the first fit for each departure and carries that route across the other fits. Fit 0 uses each line’s standard speed. The joined-ring column shows the shortest first-fit time across all routes, including transfers. The four-minute rule uses that time before rounding.

| Town or hub | From Home via | First fit (0) | Fit 1 | Fit 2 | Fit 3 | Fit 4 | Fit 5 | Joined ring (min) | First-fit rule |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bell Rock | West landing · Bay line (one way only) | 1.09 | 1.09 | 0.92 | 0.81 | 0.92 | 1.09 | 1.09 | Pass |
| Canopy Town | West landing · Bay line | 2.08 | 2.08 | 1.71 | 1.47 | 1.71 | 2.08 | 2.08 | Pass |
| Canopy Town | West landing · Line 2 | 3.57 | 2.54 | 2.08 | 1.77 | 2.08 | 2.54 |  |  |
| Canopy Town | Village, line 2 · Line 2 | 6.79 | 4.79 | 3.88 | 3.27 | 3.88 | 4.79 |  |  |
| High Gorge | Village, line 2 · Line 2 | 3.90 | 2.77 | 2.26 | 1.93 | 2.26 | 2.77 | 2.12 | Pass |
| High Gorge | West landing · Line 2 | 6.46 | 4.56 | 3.69 | 3.12 | 3.69 | 4.56 |  |  |
| Lantern Notch | West landing · Bay line (one way only) | 2.84 | 2.84 | 2.31 | 1.97 | 2.31 | 2.84 | 2.84 | Pass |
| Original Island | West landing · Bay line → Bell Rock · North-south line | 1.79 | 1.79 | 1.52 | 1.35 | 1.52 | 1.79 | 1.79 | Pass |
| Original Island | Village, line 2 · Line 2 → High Gorge · North-south line | 5.53 | 4.40 | 3.61 | 3.10 | 3.61 | 4.40 |  |  |
| Port Quay | West landing · Line 2 | 1.51 | 1.10 | 0.92 | 0.81 | 0.92 | 1.10 | 1.51 | Pass |
| Port Quay | Village, line 2 · Line 2 | 8.85 | 6.23 | 5.03 | 4.24 | 5.03 | 6.23 |  |  |
| Ring Island | Village, line 2 · Line 2 | 1.48 | 1.07 | 0.90 | 0.80 | 0.90 | 1.07 | 1.48 | Pass |
| Ring Island | West landing · Line 2 | 8.88 | 6.26 | 5.05 | 4.25 | 5.05 | 6.26 |  |  |
| Saltpan Halt | West landing · Line 2 | 0.94 | 0.69 | 0.60 | 0.54 | 0.60 | 0.69 | 0.94 | Pass |
| Saltpan Halt | Village, line 2 · Line 2 | 9.42 | 6.63 | 5.35 | 4.50 | 5.35 | 6.63 |  |  |
