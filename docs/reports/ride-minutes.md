# Ride minutes from Home

Catalog measured at `5c08b7ac2b3b81b9f0279a7d806b10b4a35c7b10`. Regenerate with `node dev/level/ride-minutes.ts --report`.

Times use the sim’s train profiles and all catalogued track and halts that can open. Depart from the Village or West landing at Home. Each ride runs non-stop on request and times exclude walks, waits and holds.

The table shows each direct way from Home. Where a town needs a transfer, it shows up to two departures with the fewest rides, changing at halts with the same town name. It picks the fastest route at the first fit for each departure and carries that route across the other fits. Fit 0 uses each line’s standard speed. The four-minute flag uses the shortest listed way before rounding.

| Town or hub | From Home via | First fit (0) | Fit 1 | Fit 2 | Fit 3 | Fit 4 | Fit 5 | First-fit rule |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bell Rock | West landing · Bay line (one way only) | 1.09 | 1.09 | 0.92 | 0.81 | 0.92 | 1.09 |  |
| Canopy Town | West landing · Bay line | 2.08 | 2.08 | 1.71 | 1.47 | 1.71 | 2.08 |  |
| Canopy Town | West landing · Cave line and the White Wall | 2.54 | 2.54 | 2.08 | 1.77 | 2.08 | 2.54 |  |
| High Gorge | Village, line 2 · Line 2 | 3.90 | 2.77 | 2.26 | 1.93 | 2.26 | 2.77 |  |
| High Gorge | West landing · Cave line and the White Wall | 4.52 | 4.52 | 3.66 | 3.09 | 3.66 | 4.52 |  |
| Lantern Notch | West landing · Bay line (one way only) | 2.84 | 2.84 | 2.31 | 1.97 | 2.31 | 2.84 |  |
| Original Island | West landing · Bay line → Bell Rock · North-south line | 1.79 | 1.79 | 1.52 | 1.35 | 1.52 | 1.79 |  |
| Original Island | Village, line 2 · Line 2 → High Gorge · North-south line | 5.53 | 4.40 | 3.61 | 3.10 | 3.61 | 4.40 |  |
| Port Quay | West landing · Cave line and the White Wall (one way only) | 1.10 | 1.10 | 0.92 | 0.81 | 0.92 | 1.10 |  |
| Ring Island | Village, line 2 · Line 2 (one way only) | 1.48 | 1.07 | 0.90 | 0.80 | 0.90 | 1.07 |  |
| Saltpan Halt | West landing · Cave line and the White Wall (one way only) | 0.69 | 0.69 | 0.60 | 0.54 | 0.60 | 0.69 |  |
