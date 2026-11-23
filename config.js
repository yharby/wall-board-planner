/* Wall board planner configuration.
 *
 * This is the only file you need to edit to adapt the planner to another
 * pegboard system or wall. app.js reads everything from
 * window.WALL_CONFIG and has no hard-coded product data.
 *
 * All lengths are in centimetres.
 */
window.WALL_CONFIG = {

  // Board sizes offered in the tray.
  //   w, h    board width and height
  //   screw   distance between the two wall screws on the board's rail
  //   url     optional link shown in the parts list
  // The key (e.g. '76x56') is what layouts and presets refer to.
  sizes: {
    '76x56': { name: 'Board 76×56', w: 76, h: 56, screw: 60 },
    '56x56': { name: 'Board 56×56', w: 56, h: 56, screw: 40 },
    '36x56': { name: 'Board 36×56', w: 36, h: 56, screw: 20 }
  },

  // Board finishes.
  //   face, holes, edge, text   colours used to draw the board
  finishes: {
    white: { name: 'White', face: '#F7F7F4', holes: '#BCC0BB', edge: '#C8CCC7', text: '#7E837F' },
    wood:  { name: 'Wood',  face: '#D7B583', holes: '#8C6A3D', edge: '#B8955E', text: '#6D5330' },
    black: { name: 'Black', face: '#2C2E30', holes: '#0B0C0D', edge: '#151617', text: '#A3A9AE' }
  },

  // Wall colour swatches, as [hex, label].
  swatches: [
    ['#A4A178', 'Jotun 8109 April Green'],
    ['#E4E6E2', 'Light grey'],
    ['#F5F5F2', 'White'],
    ['#E8DECD', 'Warm beige'],
    ['#CDD8CB', 'Sage'],
    ['#C9D6E3', 'Pale blue'],
    ['#3F4A55', 'Dark slate']
  ],

  // Gap left between neighbouring boards.
  joint: 0.5,

  // Ready-made layouts in the "Start from…" menu.
  // Each row is a list of size keys, centred on the wall. Rows stack upwards.
  presets: [
    { id: 'two',   label: 'Two 76×56, centred',       rows: [['76x56', '76x56']] },
    { id: 'three', label: 'Three 76×56',              rows: [['76x56', '76x56', '76x56']] },
    { id: 'four',  label: 'Four 76×56, full run',     rows: [['76x56', '76x56', '76x56', '76x56']] },
    { id: 'frame', label: '36 + three 76 + 36',       rows: [['36x56', '76x56', '76x56', '76x56', '36x56']] },
    { id: 'sym',   label: '36 + 56 + 76 + 56 + 36',   rows: [['36x56', '56x56', '76x56', '56x56', '36x56']] },
    { id: 'rows',  label: 'Four below, two above',    rows: [['76x56', '76x56', '76x56', '76x56'], ['76x56', '76x56']] },
    { id: 'empty', label: 'Empty wall',               rows: [] }
  ],

  // What a first-time visitor sees. Saved layouts in the browser override this.
  defaults: {
    wall: { w: 326, h: 285, color: '#A4A178' },
    desk: { on: true, h: 73 },
    clear: 5,             // gap kept above the tallest desk item
    // Screw holes measured down from each board's top edge. Not printed in the
    // instructions. 6 is read off the step 4 drawing, where the rail is fixed
    // through the second slot of a top column (slot rows every 2 cm, the first
    // 2 cm below the edge) and the wall-screw holes sit on the same line.
    railD: 6,
    storage: [
      { id: 's1', x: 0,   w: 40, h: 56 },
      { id: 's2', x: 286, w: 40, h: 50 }
    ],
    boards: [
      { id: 'b1', s: '76x56', x: 86.75,  y: 134, f: 'white' },
      { id: 'b2', s: '76x56', x: 163.25, y: 134, f: 'white' }
    ],
    dims: 'all',          // 'all' | 'sel' | 'off'
    snap: true,
    acc: false,
    holes: true
  },

  // Size of labels drawn on the wall, in screen pixels. They stay this size
  // on a phone or a wide monitor, the wall scales to fit around them.
  labels: {
    dim: 14,       // main dimension numbers
    small: 12,     // level labels, desk item heights, drill coordinates
    selected: 15,  // distances around the selected board
    drill: 11,     // drill guide distances
    board: 12      // size label inside each board
  },

  // localStorage key. Change it in a fork so it never reads another copy's saves.
  storageKey: 'pegboard-planner-v1'
};
