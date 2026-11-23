# Pegboard wall planner

Plan a pegboard wall in your browser. Drag boards onto a drawing of your wall, let them snap into place, get exact drill marks and a parts list, then save the plan as PNG or PDF.

A personal hobby project made for my own use and for learning. See the disclaimer below.

**Live** https://yharby.github.io/wall-board-planner/

![Planner screenshot](preview.png)

## What it does

- Drag 76×56, 56×56 and 36×56 boards from the tray, or tap a tile to add one next to the others
- Boards snap to the wall edges, the centre line and each other, with a 5 mm joint between them
- Dimension chains show every gap, every board edge and every level from the floor
- Drill marks give the left and height position of each wall screw, also listed in a table
- A desk and drawer units can be drawn under the boards, with a warning when a board would hit them
- Parts list with the number of boards and wall screws
- Save PNG downloads the drawing as an image, Save PDF opens the print dialog with the drawing, parts list and marks table
- Works on phones and tablets. Labels keep the same screen size and the wall scales to fit
- Undo and redo, keyboard shortcuts, and your layout is saved in the browser

## Make it your own

There is no build step and no dependencies. Four files do everything.

| File | What it holds |
| --- | --- |
| `config.js` | Board sizes, screw spacing, finishes, wall colours, preset layouts, the default wall and label sizes |
| `index.html` | Page markup |
| `style.css` | Colours, layout, light and dark theme |
| `app.js` | Drawing, dragging, snapping and measurements |

Most forks only need `config.js`. For example, to add a fourth board size

```js
sizes: {
  '76x56': { name: 'Board 76×56', w: 76, h: 56, screw: 60 },
  '56x56': { name: 'Board 56×56', w: 56, h: 56, screw: 40 },
  '36x56': { name: 'Board 36×56', w: 36, h: 56, screw: 20 },
  '120x40': { name: 'My board', w: 120, h: 40, screw: 100, url: 'https://example.com' }
},
```

`url` is optional and turns the board name in the parts list into a link.

Any pegboard or panel system works, as long as you know the board size and the distance between its two wall screws. Change `storageKey` in your fork so it never reads saves from another copy.

## Run it locally

Open `index.html` in a browser, or serve the folder

```sh
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Publish your fork

1. Fork this repository on GitHub
2. Open Settings, then Pages
3. Under Build and deployment pick Deploy from a branch, choose `main` and `/ (root)`, and save

Your copy will be live at `https://<your-user>.github.io/wall-board-planner/` a minute later.

## Before you drill

The screw height below each board's top edge is not published, so the planner uses 4 cm as a placeholder. Fit the rail to a real board, measure it, and enter it in the Drilling panel. Always check measurements against the real boards.

## Disclaimer

This is an independent, unofficial hobby project made for personal and educational use. It is not affiliated with, endorsed by or sponsored by IKEA or any other company. IKEA and SKÅDIS are trademarks of Inter IKEA Systems B.V. and are named here only to say which boards the default sizes match. No prices, product photos or brand assets are included. Board sizes and screw spacing come from public assembly instructions and may be wrong or out of date. The software is provided as is, without any warranty, and you use it at your own risk. Always check every measurement against your real boards and wall before you drill.

## Licence

MIT, see [LICENSE](LICENSE).
