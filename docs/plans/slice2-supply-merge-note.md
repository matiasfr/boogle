# Supply merge note

When this branch lands, the production opening keeps every loose log counted: abandoned drops return to the forge-courtyard rack after about 20 minutes with nobody nearby. The crooked-roof rack is open before the forge and uses ordinary pickup. Cut trees renew slowly through pale stumps and young growth, including while players are present; finished-track clearings stay bare. Recovery and regrowth survive eviction and restart.

Returning players wait for physics to catch up after scenery reconstruction before their saved pose is restored, preventing a landing under track built while away. Main's deck sitting and boiler/cart art remain included.

Agents can set `railway.regrowMinutes` and `railway.recoveryMinutes` through the existing tuning interface in controller-authorized prototype rooms. Defaults remain 31 and 21 minutes. Existing main rooms retain their saved settings; incompatible catalogs are refused. This does not unlock later production slices or change the 256 historical-identity admission limit. No push or deployment was performed.

Verification follow-up, 5 November: the earlier world-inputs failure compared this build against the broker checkout's older fixture, which omitted `tune.commit`. After that checkout advanced from `6a46755d` to `57ea7c4d`, cached main `f5a85968` and this unchanged branch both passed the scenario. Their checked-in fixture, scenario and real-client handshake already match: `createWsRoom` sends `tc: TUNE_CATALOG`. No fixture regeneration, protocol change or relaxation of mismatched-build refusal was needed. Fresh run manifests and baseline provenance are retained in this job's world-inputs follow-up handoff.
