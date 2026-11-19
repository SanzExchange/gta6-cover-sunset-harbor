# Senja Pelabuhan Leonida — Sunset Cover Maker

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/SanzExchange/gta6-cover-sunset-harbor/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/SanzExchange/gta6-cover-sunset-harbor/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline cover-art studio with a Leonida harbour-sunset identity: turn any photo into a bold
multi-panel poster cover with golden-hour orange and teal grades, extruded 3D lettering and a fine
film grain — then export a share-ready PNG in one click. Built for the
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on
[make.fun](https://make.fun).

## What it does

- **Nine panel layouts** — Single Hero, 1 Besar + 4 Kecil, 3 Vertikal, Grid 2×2, Strip Film 5,
  Diagonal Split, Majalah 6, Mosaik 9, and Panorama + 2 Inset.
- **Six colour grades** — Golden Hour, Dusk Ungu, Neon Dusk, Teal-Orange Blockbuster, Faded Film,
  and Harbour Teal, mixed per cover from canvas filters and hand-built gradient overlays.
- **Any photo, kept whole** — a photo library of free sample shots plus your own uploads (read
  locally with FileReader, never uploaded), per-panel zoom / pan / caption, and a face-aware
  auto-fill: a skin-tone and contrast heuristic finds faces so the automatic crop never cuts them off.
- **Lettering with depth** — the cover title is drawn as stacked extruded shadows with a hard
  outline and a warm gradient face; subtitles are letter-spaced, panels carry bold condensed captions.
- **Fast to a PNG** — live preview on every change, undo/redo history, a *Surprise me* randomiser,
  and export buttons for 1080 × 1080, 1080 × 1350 and 1920 × 1080 with the render time shown.
- **Original art only** — no Rockstar logo, artwork or fonts; system font stacks and hand-drawn
  canvas effects, everything under the MIT license.

## Run it

The app is plain static files under `app/` — serve that folder with any static server, or use the
bundled one (Node 22, standard library only):

```sh
node serve.ts
# open http://localhost:8080
```

Hand the entry in (copies `app/` and `screenshots/` to the output folder and writes the dossier):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Join in

Try the bounty yourself: [make.fun/bounty/gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) ·
Referral: [https://make.fun/r/jb1sgry3](https://make.fun/r/jb1sgry3)

## License

MIT — see [LICENSE](LICENSE).
