# From Ring Island to the causeway

**Start at the Stack line.** From Ring Island's west platform, keep the railhead against open water and let one broken crown on the nearest stack catch the light. Ride toward it before dressing the far stacks. This is the first transition from finished art to blockout, uses Ring's existing rock vocabulary and tests near-to-far continuity before the harder two-level station or the long White Wall.

## Build cards in recommended order

Each numbered row is one builder's visual slice. The middle column describes existing massing. The last column specifies two matched before/after frames and the question to answer at normal game FOV. Files named under ownership are in `src/content/levels/` unless noted. Card 2 mounts its draw-only shoulders with the resident Gorge view and colours the upper platform with the resident Bell massing. Cards 4 and 6 mount draw-only rock through their route-area extras so the dressing leaves with each stop. For the other cards, author each area's rock in its own `dev/prefab/cliff-kit-<area>.ts` and regenerate its own level data. A single integration owner handles shared generator registration. Keep the existing walk, collision, rail clearance and feature residency as the footprint.

| Step and ownership | What a rider meets today | Dress and check | Proof pair |
|---|---|---|---|
| 1. Stack line and High Gorge, gorge.ts | Isolated supports across the sea give way to broad stacked slabs at the halt and a pick on the rim. | Borrow Ring's bedded faces. Spend the largest pieces on the first stack's waterline and the cut facing the train. Keep darker packed earth on the rim, a few grass tufts on the cap and bare stone below. Check the pick against uninterrupted ground and the train against sky. | Ring west frame outward / Gorge platform toward stair and rim, then rim at eye height toward the pick |
| 2. Incline, West landing and Bell Rock, leg2.ts | A bore and stair connect a low deck with the bay's upper line. From below the stacked decks can read as one block. | Frame both bore mouths with draw-only kit shoulders in the Gorge extras hook. Carry warm timber along the upper lip and cool stone around the lower mouth. Use the existing shore pigment below and a grass cap above. Keep the stair and lower seed stand clear of crates. | Incline train exiting bore / lower stair looking up at bay train |
| 3. Canopy, leg3.ts | The train enters a cleft below the mother trunks. The halt and cloth occupy a much smaller scale than the canopy. | Cluster existing foliage high on the trunk masses so daylight separates the crowns. Break the cleft's entrance with kit ledges. Dress the existing freight deck and platform edges with timber. Keep the town reserve empty and the platform edge visible through the trees. Mount the ledges with the route area. | Train entering cleft / halt toward cloth |
| 4. Cave line and Saltpan, leg4.ts | The West hood compresses the view before the low Saltpan stop. The open flat is the contrast with the cave mouth. | Keep the aperture full size. Put kit on its exterior shoulders and one short interior return. Carry a muted salt-coloured band around the flat, darker wet shore below it and sparse vegetation only at its outer edge. Check the running rail against both light and shade. | Under hood toward daylight / Saltpan platform across pan |
| 5. Port Quay, leg4.ts after step 4 | Platforms, buffer ends and the breakwater make the harbour shape. | Dress the resident apron, platform and buffer ends with freight timber and crates. Keep the dock face straight and seat bedded rock against its outer toe. Keep the town reserve empty. Roofs and the skyline wait for the town design. | From arriving car across quay / buffers looking back to platforms |
| 6. White Wall, leg5.ts | Six chalk islets and the deep span read as a distant continuous wall. Close collision masses sit beneath backdrop art. | Use the existing stepped horizon as the outline. Fit kit to the nearest exposed foot and give the rim a broken pale edge. Grass sits in sheltered hollows. Compare the near/far handoff from the moving train for double silhouettes or popping. | First south islet looking along line / deep span beneath wall |
| 7. Lantern Notch, leg6.ts | The halt frames a large opening and a small lantern stand. | Arrange broad kit courses around the existing opening. Keep its sky hole clean and the ground leading to the post darker than the post. Limit plants to either shoulder and use the existing light rig. | Canopy-side approach / halt toward lantern |
| 8. Causeway and Original Island, leg6.ts after step 7 | The low crossing leads to an arrival platform and meeting marker. | Let water show between existing bents. Use Ring's weathered rock and shore band at the abutment, then pick up the island's existing ground colour. Keep the landing modest enough that the marker reads at walking distance. | Bell-side outward ride / arrival platform toward marker |

- [x] **Card 6 dressing.** The south approach and deep-span approach each mount nine chalk faces with the existing route area. A broken pale stripe follows the height of the mapped shoulder. Tufts root on the lower terraces. The chalk backdrop supplies these planes at all three far-ground grid steps (1, 2 and 4). As on card 4, the route extras own the dressing.
- [x] **Card 6 fixed views.** The first seed with the deep span laid is `wall-closed`. Each pair toggles the mounted dressing between consecutive renders at one camera and daylight. Desktop is 1200 by 750 at full detail. Phone is a 390 by 844 touch viewport at lowest detail and 0.6 resolution. The south rail view shows five staggered courses down to the water. Across the water the high pale edge breaks at the original steps. The deep-span close view shows the bevels where the beds meet. [South portrait before](greybox-look/card6-south-phone-before.jpg) / [after](greybox-look/card6-south-phone-after.jpg).
- [x] **Card 6 moving coach.** Followed the outward player car through both approaches. Across the water the steps form a single skyline. At the deep span the staggered courses recede behind the cab along the existing face. No second silhouette or abrupt change was visible in the sampled frames. The census rows give the sampled car poses, rounded to centimetres.

| View | Eye to target (metres) | Desktop draws / triangles | Phone draws / triangles | Matched desktop views |
|---|---|---|---|---|
| South | (-614.5, 5.5, 721) to (-754, 39, 615) | 223 / 525,105 to 226 / 533,038 | 75 / 365,059 to 78 / 372,992 | [Before](greybox-look/card6-south-desktop-before.jpg) / [After](greybox-look/card6-south-desktop-after.jpg) |
| Deep | (-306, 5.5, -1586) to (-357, 30, -1625) | 95 / 307,437 to 97 / 315,367 | 76 / 364,207 to 78 / 372,137 | [Before](greybox-look/card6-deep-desktop-before.jpg) / [After](greybox-look/card6-deep-desktop-after.jpg) |
| Rim | (-490, 5.5, 810) to (-723, 81, 705) | 96 / 309,093 to 99 / 317,026 | 73 / 359,591 to 76 / 367,524 | [Before](greybox-look/card6-rim-desktop-before.jpg) / [After](greybox-look/card6-rim-desktop-after.jpg) |
| South coach | desktop -626.95, 6.75, 702.72 to -686.35, 18.55, 648.33 (row 2100.21 m, riding False); phone -673.01, 6.75, 635.73 to -732.40, 18.55, 581.35 (row 2181.50 m, riding False) | 252 / 531,569 to 255 / 539,502 | 87 / 366,239 to 89 / 374,169 | [Before](greybox-look/card6-south-coach-desktop-before.jpg) / [After](greybox-look/card6-south-coach-desktop-after.jpg) |
| Deep coach | desktop -302.97, 6.75, -1588.59 to -300.79, 18.55, -1650.00 (row 4592.01 m, riding True); phone -302.22, 6.75, -1590.48 to -300.04, 18.55, -1651.90 (row 4594.05 m, riding True) | 206 / 533,435 to 207 / 541,355 | 89 / 384,791 to 90 / 392,711 | [Before](greybox-look/card6-deep-coach-desktop-before.jpg) / [After](greybox-look/card6-deep-coach-desktop-after.jpg) |

- [x] **Card 1, Stack line and High Gorge.** Keep the clipped outlines, the rail bore and both sandstone cuts. On the approaching south stack retain the kit down to the eastern waterline. The rest of the perimeter uses the existing bedded backing face. The rim and pickup plinth share packed-earth pigment. Four small tufts flank the pickup without adding bodies. These twelve blade triangles share the backdrop draw. Their base is the same 85 m plane as the cap at all distances; the separate far-ground grid at steps 1, 2 and 4 does not own the cap.

**Trim decision.** Retain the 18 draws / 42,000 triangles desktop and 8 / 18,000 phone allowances. At the original halt, #2559 measured 188 → 194 draws and 433,150 → 533,254 triangles for its whole change. For this card, switch only the two instanced batches off and back on at a fixed camera. At both the halt and platform the two original batches contain 97,944 triangles. After trimming they submit 13,156, saving 84,788 triangles. The earth recolour adds zero triangles and the tufts add 12. At the historical halt this puts the full change at approximately +15,328 triangles over the pre-kit view (100,104 − 84,788 + 12), within the shared +70,000 allowance. That last figure is derived from the historical comparison. Current counts below are the contribution of the kit batches, including both faces and caps.

| Camera | Desktop before → after, draws / triangles | Phone before → after, draws / triangles |
|---|---|---|
| Platform toward rim | 2 / 97,944 → 2 / 13,156 | 2 / 97,944 → 2 / 13,156 |
| Original halt | 2 / 97,944 → 2 / 13,156 | 2 / 97,944 → 2 / 13,156 |

**Reference stills for the following cards.** Use seed `stack-laid-4`, fixed authored daylight, default FOV and the listed world-space eye → target in metres. Desktop is 1200 × 750. Portrait uses a 390 × 844 touch viewport, lowest Detail and 0.6 resolution on the desktop GPU. These are fixed views at platform or coach-eye height. Train positions can vary. Quiet-machine frame timing is deferred; not tested on a device.

| Read | Eye → target | Matched stills |
|---|---|---|
| Ring west frame outward | (1406.63,10.5,−820.04) → (1403,10,−860) | [Before](greybox-look/card1-before-ring.jpg) · [After](greybox-look/card1-after-ring.jpg) |
| Ring, from track at coach height | (1414.16,10,−819.23) → (1388.6,7.68,−892.63) | [Before](greybox-look/card1-before-ring-car.jpg) · [After](greybox-look/card1-after-ring-car.jpg) |
| Gorge approach, from track at coach height | (−31.19,6,−1926.27) → (−90.54,5,−1979.68) | [Before](greybox-look/card1-before-gorge-car.jpg) · [After](greybox-look/card1-after-gorge-car.jpg) |
| Arrival looking along the train | (−35,6,−1949) → (−103,19,−1988) | [Before](greybox-look/card1-before-arrival.jpg) · [After](greybox-look/card1-after-arrival.jpg) |
| Historical halt | (−132.55,5.5,−1999.03) → (−76,34,−2019) | [Before](greybox-look/card1-before-halt.jpg) · [After](greybox-look/card1-after-halt.jpg) |
| Platform toward stair and rim | (−105.7,6,−1987.3) → (−72,85,−2035) | [Before](greybox-look/card1-before-platform.jpg) · [After](greybox-look/card1-after-platform.jpg) |
| Rim toward powered pick | (−77,86.6,−2028) → (−74.35,85.65,−2032.62) | [Before](greybox-look/card1-before-rim.jpg) · [After](greybox-look/card1-after-rim.jpg) · [Portrait](greybox-look/card1-after-phone-rim.jpg) |

The platform frames the stair against sandstone. The pick sits 8 m inland by route decision 92, so the lip occludes it from the platform. The additional rim pose shows the yellow post against earth. The arrival still shows sky between the walls and stone behind the near locomotive. From Ring the local architecture fills the view along the rails; the water gap reads closer to the Gorge.

- [x] **Card 4, cave line and Saltpan.** West owns two exterior rock shoulders rooted below the waterline and one short, flush return. Both railheads stay legible under the hood and across the low salt flat. Saltpan owns the muted shore band, bank rocks and small clumps of edge grass. The existing beach slopes carry the darker wet pigment. Port Quay shares the source file and its generated level is byte-identical.

The rendered kit bounds leave the exterior shoulders at least 6.60 m from the chord centre on each side. The return lies on the existing wall at 6.5 m. The strip and grass follow the fixed 3 m land prism, independent of the far-ground grid at steps 1, 2 and 4. All additions are draw-only.

**Proof settings.** The Card 1 seed `stack-laid-4` reaches High Gorge before the cave railway opens. Card 4 uses `port-reached` for the running rail and both approaches. Each pair keeps the same scene, train position, camera and authored daylight. The census submits two consecutive renders, restoring the original 54 beach colours and hiding this card’s meshes for the first. Desktop uses 1200 × 750 and full Detail. Portrait uses a 390 × 844 touch viewport, lowest Detail and 0.6 resolution. Default FOV is 62°. The engine cameras follow the locomotive. Both coach cameras use the occupied player car, with the railway reporting riding on the outward track. From the platform the salt band reads as a narrow line near the horizon. The nearer shore view shows its width and darker wet slope. The coach view looks past the cab on either side. No frame timing was taken. Not tested on a device.

| Camera | World eye → target (m) | Desktop draws / triangles, before → after | Portrait draws / triangles, before → after | Stills |
|---|---|---|---|---|
| Under the hood | (795, 6, 75) → (779, 6, 105) | 257 / 769,119 → 259 / 770,967 | 148 / 487,249 → 150 / 489,097 | [before](greybox-look/card4-before-hood.jpg) · [after](greybox-look/card4-after-hood.jpg) |
| Outside the mouth | (779, 6.2, 99) → (795, 7.7, 77) | 950 / 1,629,967 → 952 / 1,631,815 | 353 / 1,012,343 → 355 / 1,014,191 | [before](greybox-look/card4-before-mouth.jpg) · [after](greybox-look/card4-after-mouth.jpg) |
| Saltpan platform | (549.61, 5.5, 700.27) → (512, 3.6, 739) | 181 / 488,337 → 184 / 489,390 | 75 / 316,963 → 78 / 318,016 | [before](greybox-look/card4-before-salt.jpg) · [after](greybox-look/card4-after-salt.jpg) · portrait [after](greybox-look/card4-after-salt-portrait.jpg) |
| Wet shore | (597, 4.6, 821) → (583, 2.3, 815) | 337 / 903,583 → 340 / 904,636 | 84 / 336,397 → 87 / 337,450 | [before](greybox-look/card4-before-shore.jpg) · [after](greybox-look/card4-after-shore.jpg) |
| Cave engine approach | (785.1008175121881, 9.4475, 96.93678053445647) → (800.2528769649609, 5.3475, 69.66307351946422)<br>Portrait (793.4694828141671, 9.4475, 67.37360744350129) → (789.7101291423671, 5.3475, 98.34629315156225) | 871 / 1,600,447 → 873 / 1,602,295 | 118 / 484,543 → 120 / 486,391 | [before](greybox-look/card4-before-hood-train.jpg) · [after](greybox-look/card4-after-hood-train.jpg) · [portrait](greybox-look/card4-after-hood-train-portrait.jpg) |
| Saltpan engine approach | (491.5035915311602, 9.446822650089594, 728.7381094462219) → (519.9162185594375, 5.346822650089595, 715.8477011768147)<br>Portrait (488.17050842420025, 9.4475, 730.250180143376) → (516.5833122627887, 5.3475, 717.3601616007248) | 879 / 1,485,281 → 882 / 1,486,334 | 151 / 548,569 → 154 / 549,622 | [before](greybox-look/card4-before-salt-train.jpg) · [after](greybox-look/card4-after-salt-train.jpg) |
| Riding the cave coach | (793.959456309695, 6.750000000000001, 64.25364135655573) → (789.8094315182052, 5.750000000000001, 99.00673178359574)<br>Portrait (794.0908324217539, 6.750000000000001, 63.09410078445417) → (790.4437303239991, 5.750000000000001, 97.90356280684907) | 340 / 886,213 → 342 / 888,061 | 118 / 490,281 → 120 / 492,129 | [after](greybox-look/card4-after-hood-rider.jpg) |
| Riding into Saltpan | (556.7082612221107, 5.926388694661495, 670.4248242427949) → (545.7585395557545, 4.926388694661495, 703.6679227059245)<br>Portrait (557.0898488852499, 5.956278192471311, 669.2617679112955) → (546.3858310157757, 4.956278192471311, 702.584793005815) | 212 / 504,661 → 215 / 505,714 | 100 / 335,253 → 103 / 336,306 | [after](greybox-look/card4-after-salt-rider.jpg) |

After step 1 establishes the reference still, steps 2, 3, 4, 6 and 7 may author their local files in parallel. Steps 5 and 8 follow their same-file predecessors. Integrate shared registry and generated catalogue changes serially. Take platform proofs seated at player height and repeat the approach on the train. Check the existing level validation and rail clearance for every slice. Match seed, pose, detail and daylight. Inspect in portrait too, particularly the Bell stair and the Notch opening.

- [x] **Card 2, Incline and Bell.** The Gorge extras hook mounts four shallow rock faces, two per bore mouth. Bell's hook mounts two faces at the ends of its existing cut and a timber facing below the upper deck. The shared kit supplies the shore pigment, with cooler stone higher on the walls and grass colour on the crowns. The work floor and the stair keep their original surfaces. Both hooks dispose their dressing when the area leaves residency. All additions are draw-only, attached to vertical massing or the upper deck edge above sea, clear of the far-ground grids.

**Card 2 camera census.** Fixed authored daylight, default FOV, 1200 × 750 desktop at full detail and 390 × 844 touch at lowest detail and 0.6 resolution. Each pair switches the resident dressing off and back on at the same eye and target. The columns give observed whole-frame draws / triangles. Other moving submissions vary between frames, especially at the lower east platform and inside the bore. In isolation the four bore faces submit one draw / 704 triangles. Bell submits two draws / 364 triangles for its two faces and facing. Both fit the desktop 18 / 36,000 and phone 8 / 15,000 allowances. No frame times taken.

| Camera, world eye → target (m) | Desktop before → after | Portrait before → after | Matched stills |
|---|---|---|---|
| Train at the bore exit, (−30.5,5.8,−1741) → (−36,6,−1767) | 230 / 477,446 → 231 / 478,150 | 127 / 326,226 → 128 / 326,930 | [Before](greybox-look/card2-train-exit-before.jpg) · [After](greybox-look/card2-train-exit-after.jpg) |
| Lower west platform toward the bay train, (−54.4,6.5,−874) → (−45,16.8,−842) | 866 / 1,619,469 → 867 / 1,619,821 | 215 / 607,835 → 216 / 608,187 | [Before](greybox-look/card2-train-stair-before.jpg) · [After](greybox-look/card2-train-stair-after.jpg) |
| Outside bore, (−31.5,6,−1746) → (−36,7,−1767) | 202 / 442,000 → 203 / 442,704 | 123 / 296,416 → 124 / 297,120 | [Before](greybox-look/card2-exit-before.jpg) · [After](greybox-look/card2-exit-after.jpg) |
| Coach eye inside bore, (−39,5.8,−1776) → (−34,6,−1750) | 927 / 1,803,811 → 924 / 1,804,615 | 233 / 879,657 → 234 / 880,361 | [Before](greybox-look/card2-coach-before.jpg) · [After](greybox-look/card2-coach-after.jpg) |
| Lower stair, (−66,6.5,−850.5) → (−72,11.5,−866) | 259 / 480,057 → 258 / 480,053 | 82 / 312,815 → 81 / 312,811 | [Before](greybox-look/card2-lower-side-before.jpg) · [After](greybox-look/card2-lower-side-after.jpg) · [Portrait](greybox-look/card2-stair-portrait.jpg) |
| Lower east platform, (−44,6.5,−854) → (−72,11,−862) | 277 / 667,865 → 151 / 437,309 | 85 / 299,445 → 87 / 299,809 | [Before](greybox-look/card2-lower-east-before.jpg) · [After](greybox-look/card2-lower-east-after.jpg) |
| Bay coach eye, (−33,17,−839) → (−70,12,−866) | 133 / 423,115 → 135 / 423,479 | 80 / 273,731 → 82 / 274,095 | [Before](greybox-look/card2-bay-before.jpg) · [After](greybox-look/card2-bay-after.jpg) |

The bore and bay coach-height pairs use `stack-laid-4`. The lower station pairs use `bay-reached`, when the incline and bay cut both carry trains. Seen from across the lower track, the stair rises between the seed stand and the rock shoulder. In portrait its white parapet leads to the timber lip. The interior coach view shows mostly lining until the opening. Portrait was rendered on the desktop GPU; not tested on a device.

Both train pairs use `bay-reached` and two fresh render submissions in the same game update, holding the train still between them. At lower west the deck occludes most of the bay locomotive; its kit board clears the lip. Only the rock batch enters that camera, adding one draw / 352 triangles. On the separate live approach the outbound player car reported its rider at s = 191.37 m. The camera eye was (−52.1503,6.7396,−1809.6259), quaternion (0.003637,0.989050,0.024731,−0.145447). The red cab sits against the bright opening. [On the incline train](greybox-look/card2-bore-ride.jpg)

- [x] **Card 5, Port Quay.** Timber faces the straight dock and wraps the platform ends. Two low crate stacks stand at the apron and platform edges. Two courses of rock meet the outer end of the resident slab. The town reserve stays empty.

The pair toggles the quay dressing in consecutive scene renders from the same game update on the `port-reached` save at 62° FOV. Desktop uses 1200 × 750 at full detail. Portrait uses a 390 × 844 touch viewport at lowest detail and 0.6 resolution. The approach camera follows the live player car. The buffers camera looks back along both platforms. Each view adds one draw and 480 triangles. The moving approach showed a single quay edge throughout the sampled arrival. Not tested on a device.

| Camera | Desktop draws / triangles, before → after | Portrait draws / triangles, before → after | Stills |
| --- | --- | --- | --- |
| Arriving car across apron | 262 / 532,745 → 263 / 533,225 | 129 / 352,257 → 130 / 352,737 | [Desktop before](greybox-look/card5-coach-before.jpg) · [Desktop after](greybox-look/card5-coach-after.jpg) · [Portrait before](greybox-look/card5-coach-portrait-before.jpg) · [Portrait after](greybox-look/card5-coach-portrait-after.jpg) |
| Buffers toward platforms | 1,114 / 1,687,469 → 1,115 / 1,687,949 | 847 / 1,268,179 → 848 / 1,268,659 | [Desktop before](greybox-look/card5-buffers-before.jpg) · [Desktop after](greybox-look/card5-buffers-after.jpg) · [Portrait before](greybox-look/card5-buffers-portrait-before.jpg) · [Portrait after](greybox-look/card5-buffers-portrait-after.jpg) |

- [x] **Card 7, Lantern Notch.** Two broad kit faces rise from the feet of the limestone piers. Grass grows at the outer shoulders. A tapered patch of packed earth leads from the steps to the yellow lamp. The route area's extras own all three draws. The reef has a flat 6 m cap at every distance, independent of far-ground steps 1, 2 and 4. The walk, arch colliders, light rig and ending retain their existing records.

Use `notch-reached`, the first seed with the Notch line laid and the lantern available. Each pair submits two renders of the same game update with only the Notch extras toggled. FOV is 62°. Desktop is 1200 × 750 at full detail. Portrait is 390 × 844 at lowest detail and 0.6 resolution. The outbound train views use the player car while the railway reports a rider. All four views add 3 draws and 1,242 triangles on both presets, within the 12 / 24,000 desktop and 6 / 10,000 phone allowances.

| Camera | Desktop draws / triangles, before → after | Portrait draws / triangles, before → after | Stills |
|---|---|---|---|
| Platform approach | 187 / 531,551 → 190 / 532,793 | 73 / 367,359 → 76 / 368,601 | [Desktop before](greybox-look/card7-before-approach.jpg) · [Desktop after](greybox-look/card7-after-approach.jpg) · [Portrait before](greybox-look/card7-before-approach-portrait.jpg) · [Portrait after](greybox-look/card7-after-approach-portrait.jpg) |
| Halt toward the lantern | 155 / 515,287 → 158 / 516,529 | 77 / 367,395 → 80 / 368,637 | [Desktop before](greybox-look/card7-before-halt.jpg) · [Desktop after](greybox-look/card7-after-halt.jpg) · [Portrait before](greybox-look/card7-before-halt-portrait.jpg) · [Portrait after](greybox-look/card7-after-halt-portrait.jpg) |
| Halt toward the opening | 155 / 515,287 → 158 / 516,529 | 77 / 367,395 → 80 / 368,637 | [Desktop before](greybox-look/card7-before-opening.jpg) · [Desktop after](greybox-look/card7-after-opening.jpg) · [Portrait before](greybox-look/card7-before-opening-portrait.jpg) · [Portrait after](greybox-look/card7-after-opening-portrait.jpg) |
| Outward player car | 171 / 529,217 → 174 / 530,459 | 94 / 381,985 → 97 / 383,227 | [Desktop before](greybox-look/card7-before-coach.jpg) · [Desktop after](greybox-look/card7-after-coach.jpg) · [Portrait before](greybox-look/card7-before-coach-portrait.jpg) · [Portrait after](greybox-look/card7-after-coach-portrait.jpg) |

Platform approach eye (−1563.36, 9.5, −946.07) looks at (−1620, 30, −1000). Both halt views use (−1584.2, 9.5, −979.35). The lamp target is (−1620, 11, −986) and the opening target is (−1620, 30, −1000). The outbound car eyes are (−1513.0731678372906, 9.779424969842488, −913.4204638705554) on desktop and (−1502.8263659120275, 9.426578307343188, −905.0200521416722) in portrait. Both look at (−1620, 24, −1000).

From the car the near pier's courses rise beside the red cab and blue sky shows through the arch. From the halt the yellow lamp clears the limestone edge above the dark ground. The portrait approach includes the underside of the lintel and the rails below it. The closer portrait opening crops the outer faces. Phone preset rendered on desktop WebGPU, not tested on a device.

- [x] **Card 3 implementation.** Canopy’s high foliage uses smaller overlapping crowns with a lighter upper cluster. Three kit faces flank the cleft and leave with the route area. Three narrow rubbing strips follow the existing deck and platform edges below foot height. The separate far-ground grid (steps 1, 2 and 4) supplies none of these surfaces. The chalk walls, tree trunks and freight deck have their own fixed geometry.
- [x] **Card 3 fixed-camera proofs.** Both builds used `stack-laid-4`, authored daylight and default FOV. Desktop used 1200 × 750 and full Detail. Portrait used a 390 × 844 touch viewport, lowest Detail and 0.6 resolution on the desktop GPU. The census records the whole rendered view, including any shadow pass. All four observed differences fit the card’s allowance.
- [x] **Card 3 implementation.** Canopy’s high foliage uses smaller overlapping crowns with a lighter upper cluster. Fifteen instanced kit faces form two chalk courses around the cleft mouth. Their bases enter the 12 m isle surface by a metre. Both runs leave with the route area. Three brown rubbing timbers wrap the existing deck and platform lips, showing a 0.46–0.56 m cap from seated height. The separate far-ground grid (steps 1, 2 and 4) supplies none of these surfaces. The chalk walls, tree trunks and freight deck have their own fixed geometry.
- [x] **Card 3 fixed-camera proofs.** Both builds used `stack-laid-4`, authored daylight and default FOV. Desktop used 1200 × 750 and full Detail. Portrait used a 390 × 844 touch viewport, lowest Detail and 0.6 resolution on the desktop GPU. The census records the whole rendered view, including any shadow pass. All six observed differences fit the card’s allowance. The census waited for Canopy to mount and sampled the same render used for the still.
| Camera and world-space eye → target (m) | Desktop before → after, draws / triangles | Portrait before → after, draws / triangles | Stills |
| Approach from coach height (−997, 16, −392) → (−1064, 38, −329) | 125 / 403,487 → 126 / 405,711 | 74 / 267,259 → 75 / 269,483 | [Before](greybox-look/card3-before-approach.jpg) · [After](greybox-look/card3-after-approach.jpg) · [Portrait](greybox-look/card3-after-approach-portrait.jpg) |
| Seated halt toward the cloth post (−1081, 15.1, −308) → (−1091.99, 15, −294.01) | 127 / 403,799 → 128 / 406,023 | 76 / 267,571 → 75 / 269,619 | [Before](greybox-look/card3-before-halt.jpg) · [After](greybox-look/card3-after-halt.jpg) |
The approach shows daylight between the lower crowns and warm rock against both chalk faces. At the halt, open sky separates the two crowns behind the board. The seed shows the cloth post and the edge of the deck. The phone halt’s whole-scene draw total varied by one between builds. The first platform proof placed Buddy inside the camera. The matched pair stands Buddy behind it. No frame timing taken; not tested on a device.
- [ ] **Card 3 moving-train repeat.** Chromium reported `page.evaluate: Target crashed` during the `canopy-reached` ride warm-up. A separate bounded run to prepare an approaching-train save expired after 240 seconds. The fixed coach-height proof above covers the approach framing.
| Approach from coach height (−997, 16, −392) → (−1064, 38, −329) | 130 / 410,983 → 131 / 420,599 | 79 / 274,755 → 80 / 284,371 | [Before](greybox-look/card3-before-approach.jpg) · [After](greybox-look/card3-after-approach.jpg) · [Portrait](greybox-look/card3-after-approach-portrait.jpg) |
| Seated halt toward the cloth post (−1081, 15.1, −308) → (−1091.99, 15, −294.01) | 129 / 403,523 → 130 / 413,139 | 78 / 267,295 → 79 / 276,911 | [Before](greybox-look/card3-before-halt.jpg) · [After](greybox-look/card3-after-halt.jpg) |
| Outward platform across the freight deck (−1062.2, 15.1, −341.65) → (−1082, 14, −306) | 132 / 411,311 → 131 / 421,687 | 81 / 275,083 → 82 / 284,699 | [Before](greybox-look/card3-before-freight.jpg) · [After](greybox-look/card3-after-freight.jpg) |
At the approach, a long horizontal seam follows the near chalk wall and the opposite course steps down into the ground. At the halt, the brown platform and freight-deck edges lead toward the board. The seed shows the cloth post and the edge of the deck. On the opposite platform the top and the vertical side of the timber are visible. The lighter foliage sits low enough to catch daylight beside the dark near crowns. Five views added one draw and 9,616 triangles. The desktop freight view had one fewer draw and 10,376 more triangles in the whole scene. No frame timing taken; not tested on a device.
Review follow-up: beds 4 and 5 are shortened and set back from the outward ramp. All fifteen beds use a collider-free prefab under the Canopy route owner. The desktop and portrait approach and the outward platform still were refreshed at their original poses. The table records the original matched budget run.
- [x] **Card 3 moving-train repeat.** The bay train was running outward at 2,196.11 m on the accepted `canopy-reached` route. The player car reported `riding: true`. Camera eye (−930.37848, 15.85, −453.71080) → (−967.04855, 23.55, −421.05936). From this seat the crowns pass above the cab roof. The cab obscures the platform and most of the chalk, which are visible in the fixed approach pair. [Occupied coach](greybox-look/card3-riding.jpg)
## Cost envelope

Proposed **incremental** counts over the matching greybox camera, both colour and shadow passes, for all visible dressing combined. The tighter phone target preserves the dominant silhouette and shore value break, then sheds small vegetation, loose props and distant shadows first. Use existing sea, sky, fog, palettes and shared materials throughout. Mount near detail with its area and retain one coarse far outline. Avoid area-specific water or sky passes.

| Step | Desktop extra draws / triangles | Phone extra draws / triangles |
|---|---:|---:|
| Stack and Gorge | 18 / 42,000 | 8 / 18,000 |
| Incline and Bell | 18 / 36,000 | 8 / 15,000 |
| Canopy | 24 / 52,000 | 10 / 20,000 |
| Cave and Saltpan | 14 / 28,000 | 6 / 12,000 |
| Port Quay | 18 / 34,000 | 8 / 14,000 |
| White Wall | 16 / 40,000 | 6 / 15,000 |
| Notch | 12 / 24,000 | 6 / 10,000 |
| Causeway and arrival | 12 / 22,000 | 6 / 9,000 |

Across adjacent areas keep a single census camera within the cliff plan's +30 draws / +70,000 triangles. For **each row**, aim for CPU and GPU separately below 16.7 ms and no more than +1 ms in either p95 over a matched quiet baseline. These are planning allowances. At Port the historical quiet desktop mean was 11.63 ms CPU and 8.01 ms GPU, p95 14.09 and 9.66. Other route camera timings are unmeasured here. On HOTBOX ignore the roughly 18.2 ms callback interval. Alternate main and build three times on quiet hardware with identical settings. Record average and p95 for each clock independently. Report overlapping views at their actual combined cost.

The Windows phone profile already reached 14.153 ms CPU and 12.665 ms GPU at spawn and 11.785 / 9.822 at the head. That is profile evidence on a desktop GPU. M4 iPad Pro is the target floor and phones are best effort. The existing Detail ladder lowers resolution to 0.6?, simplifies the sea, drops sun shadows and finally disables MSAA on reload. Give the approach a readable silhouette on each rung. For verification, compare the same arrival in portrait, then measure on hardware when available. **Not tested on a device.** [Port profile](../reports/port-quay-frame-profile.md) · [streaming checkpoint B](world-streaming.md) · [cliff kit budgets and step 11](cliff-kit-everywhere.md).

- [x] **Card 8, causeway and Original Island.** Two weathered kit faces support the landward ends of the arrival decks. Their lowest courses darken at the wet line and the existing beach supplies the transition to grass. From the outward coach, blue water shows between the bents and the lighthouse stands above the cab. From the platform the meeting board clears both decks, including in portrait. The oblique shore pair shows the courses beneath the ramps.

The `island-reached` pairs toggle one instance batch on consecutive renders of one game update at 62° FOV. Desktop uses 1200 × 750 at full detail. Portrait uses 390 × 844 touch at lowest detail and 0.6 resolution. Each pair adds one draw and 1,232 triangles, within the 12 / 22,000 desktop and 6 / 9,000 portrait allowances. Not tested on a device.

| Camera | Desktop draws / triangles, before → after | Portrait draws / triangles, before → after | Stills |
|---|---|---|---|
| Bell-side outward player car, riding at 1,866.43 m desktop and 1,870.53 m portrait | 400 / 1,004,439 → 401 / 1,005,671 | 205 / 583,679 → 206 / 584,911 | [Desktop before](greybox-look/card8-coach-desktop-before.jpg) · [after](greybox-look/card8-coach-desktop-after.jpg) · [Portrait before](greybox-look/card8-coach-portrait-before.jpg) · [after](greybox-look/card8-coach-portrait-after.jpg) |
| Platform (3, 6.5, −123) toward marker (3.7, 3.65, −104.6) | 346 / 973,355 → 347 / 974,587 | 161 / 556,567 → 162 / 557,799 | [Desktop before](greybox-look/card8-halt-desktop-before.jpg) · [after](greybox-look/card8-halt-desktop-after.jpg) · [Portrait before](greybox-look/card8-halt-portrait-before.jpg) · [after](greybox-look/card8-halt-portrait-after.jpg) |
| Shore facing the landward bents | 307 / 937,213 → 308 / 938,445 | — | [Desktop before](greybox-look/card8-shore-desktop-before.jpg) · [after](greybox-look/card8-shore-desktop-after.jpg) |

The moving camera followed the outward player car from Bell at 1,156.34 m to the island approach at 1,846.66 m. Water remains visible through the bend and the island resolves into a single shoreline. The 17 sampled frames show no visible abutment pop or doubled silhouette. A second sequence sampled the occupied car through the last 19 m. Real-time cadence was unmeasured. [Crossing sequence](greybox-look/card8-crossing.jpg)

### Card 9, Port Quay Roundhouse freight yard

At the foot of the yard ramp the raised apron presents a straight grey face on either side of the entrance. Give those faces two courses of weathered timber with darker retaining posts. The break in the timber should lead the eye up the ramp toward the turntable. Use the existing freight-edge batch in `src/entities/route-greybox/quay-edges.ts`.

From the lower apron (87.3, 4.8, 939.2), the grey edge blends into the deck in the first still. The darker boards pick out the opening in the second, with the locomotive visible above it. Both 1200 × 750 desktop stills use the same live yard and fixed camera. The before view hides the 16 new instances. [Before](greybox-look/card9-yard-before.jpg) · [After](greybox-look/card9-yard-after.jpg)

### Card 10, Port Quay freight apron

From the foot of the Roundhouse ramp, a strip of packed earth runs between pockets of loose cinder and through the timber retaining wall. The raised yard takes a darker cinder colour around the turntable. The crossing beside the tracks uses the existing individual planks in weathered timber brown.

`src/entities/route-greybox/massing-quay.ts` colours the existing apron, ramp, yard and crossing surfaces. `quay-edges.ts` holds the scatter. The desktop pair uses card 9’s arrival pose at 1200 × 750. [Before](greybox-look/card10-yard-before.jpg) · [After](greybox-look/card10-yard-after.jpg)

### Card 11, Bell Rock’s lower cut

From the arriving end of the lower east platform, the white stair crossed a single grey wall between the two rock shoulders. That wall filled the centre of the view on the way into the station. Five shallow faces from the Chunky Sunshine cliff kit now carry the sandstone courses around the west side of the cut. The white parapet still leads the eye to the upper landing, and both stall boards stand clear of the stone.

The Bell view in `src/entities/route-greybox/massing-incline.ts` mounts the faces with the two shoulders and shares their rock material. The 1200 × 750 desktop pair looks from (−43, 6.5, −868) toward (−73, 10, −856). [Before](greybox-look/card11-bell-before.png) · [After](greybox-look/card11-bell-after.png)

## Design review (2026-11-27)

| Call | Kind | Basis |
|---|---|---|
| Dress the established playable footprint, including both branch orders. | Decided | [Greybox route, 11 November](greybox-route.md). Port needs the same local arrival cues when a player reaches it before Canopy. |
| Use the cliff kit and cooler packed-earth pigment at the path edge. | Decided | [Terrain ruling, 14 November](../decisions-look.md). |
| Give the existing arrival landmark first visual emphasis in each card, beginning at the Stack line. | Default | Each proof pair tests a distance read and a working-distance read. Pigment and foliage can change independently of collision. |

**Finding affecting step 8.** The landing already frames the lighthouse and green island beyond two pale decks. Limit step 8 to the approach and abutment so the lighthouse keeps its place on the skyline.

**Finding affecting step 2.** At lower Bell the stair, station board and bright markers compete in one view. Step 2 puts texture on the rock shoulders and keeps the working platform quiet.

**Decided.** The 11 November greybox direction and the 14 November terrain ruling establish the playable footprint and the packed-earth/kit treatment. Preserve every existing stand-in, including Gorge vertical play, salt sliding, crystal collars, Canopy's town, glide and ending. Keep the owner's story, names, characters and The Boogler's lines. Use the built Home and Ring kit as reference. New art derives from the game's own assets. [Route](greybox-route.md) · [look decisions](../decisions-look.md) · [owner calls](../agents/owner-calls.md).

**Default.** The first read at each halt is the existing route feature named in the proof pair. Reinforce it with value and negative space. The proposed dressing order and geometry allocations are reversible. This serves DESIGN's “Telegraph everything”: a rider can spot the next place, while someone carrying freight can still see the working edge. Test both views. No New gameplay call.

- How much of the Gorge gets finished first? Dress one sea-facing stack and one rim return, compare at Ring and on arrival, then repeat the treatment.
- How distinct should Saltpan and the Wall be at distance? Give Saltpan a low horizontal shore band and the Wall a broken high rim. Use the same chalk family.
- How much town detail before the town design? Roof and freight-edge treatment on existing masses only. Revisit doors, occupied interiors and inhabitants with the owner’s town design.
- Should the ending acquire a special sky or moving set piece? Keep its existing sky and meeting marker. Spend the visual budget on a clean arrival silhouette.

## Census stills

The table combines fresh captures marked below with inspected leg and cold-jump reports from main. The fresh platform probes below supplement those route views. The first Canopy and Port platform cameras intersected foreground geometry. Offset the camera behind the landing spot when repeating these views.

| Approach | What the frame shows |
|---|---|
| [Gorge halt](greybox-look/gorge-reached.jpg) and [fresh Wall-side return](greybox-look/wall-return.jpg) | A white diagonal crosses a largely unbroken dark face. On the return the parallel platform edges converge between two tall slabs. Preserve that difference between the side and end views. |
| [Bore exit](greybox-look/step4-bore-out.jpg) and [Bell lower stop](greybox-look/step4-bell-lower.jpg) | The bright opening outlines the red cab. Below, the station board overlaps the white stair and the upper deck nearly disappears against sky. |
| [Canopy from the car](greybox-look/step6-canopy-train-in-cleft.jpg) and [fresh Canopy platform](greybox-look/canopy-platform.jpg) | Pale cleft sides frame dark straight trunks. Daylight already separates the upper crown from the rail corridor. |
| [Cave hood](greybox-look/under-hood.jpg) and [Saltpan stop](greybox-look/saltpan-stop.jpg) | A flat brown soffit fills the top of the cave frame. At the stop, the train stands out against a broad green plane where the salt apron could read. |
| [Fresh quay platforms](greybox-look/quay-platforms.jpg) | A long pale ramp crosses a single ochre mass. Keep the rail and ramp legible while breaking up the mass at freight-building scale. |
| [Beneath the White Wall](greybox-look/step5-under-wall.jpg) | A straight dark lip hangs above blue water. Repeated narrow supports make the wall look thinner at close range than it does on the horizon. |
| [Fresh Notch approach](greybox-look/notch-reached.jpg) | Two pale uprights crop the sky to a vertical slot. The near post and Buddy establish the scale of the proposed rock courses. |
| [Fresh island landing](greybox-look/island-platform.jpg) | The bare platforms lead toward an already colourful beach, palms and lighthouse. Dress only the approach and its abutment. The classic island already supplies the arrival view. |

[Fresh Gorge platform, seaward](greybox-look/high-gorge-seaward.jpg). At player height the two dark slab ends almost touch the horizon. Keep the water gap when dressing their feet. On this pose the count probe reported 188 draws and 433,150 triangles with Gorge resident. This capture ran under load.

[West landing](greybox-look/west-landing.jpg). The existing timber jetty, green Home bank and shallow turquoise water already surround the pale landing. Carry the jetty timber onto its working edge, with room for the rack and board to read from the approach.

[Fresh lower Bell](greybox-look/bell-lower-live.jpg) and [fresh Saltpan flat](greybox-look/saltpan-flat.jpg). At Bell the bright interact markers, locomotive and ramp all occupy the lower station view. Concentrate detail above the work surface. At Saltpan the exposed flat fills the foreground while distant land nearly disappears into haze. A shallow colour change across the ground can identify this stop even at phone detail.
