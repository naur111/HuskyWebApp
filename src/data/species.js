/**
 * species.js
 * All 8 Greenbelt species with:
 *  - metadata (name, habitat, message, sound, world-effect)
 *  - pixel art draw() function at 48×48 grid resolution
 *
 * Drawing convention:
 *   px(ctx, gridX, gridY, color, scale, originX, originY)
 *   Each "pixel" is scale×scale actual pixels.
 */

// ── pixel helper ─────────────────────────────────────────────
function px(ctx, x, y, color, s, ox = 0, oy = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + x * s, oy + y * s, s, s);
}

// ── shared background painter ─────────────────────────────────
export function drawPixelBg(ctx, W, H, hue, s) {
  // Pixelated sky rows
  const rows = Math.ceil(H / s);
  for (let r = 0; r < rows; r++) {
    const t = r / rows;
    const lum = Math.floor(55 - t * 30);
    const sat = Math.floor(40 + t * 20);
    ctx.fillStyle = `hsl(${hue},${sat}%,${lum}%)`;
    ctx.fillRect(0, r * s, W, s);
  }
  // Ground strip
  ctx.fillStyle = '#223a14';
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  ctx.fillStyle = '#172a0e';
  ctx.fillRect(0, H * 0.78, W, H * 0.22);

  // Simple flanking trees
  const trees = [
    [0.04, '#1a3410'], [0.12, '#223e18'],
    [0.84, '#1a3410'], [0.92, '#223e18'],
  ];
  trees.forEach(([tx, tc]) => {
    const tpx = Math.floor(tx * W);
    const tpy = Math.floor(H * 0.32);
    ctx.fillStyle = '#3d2010';
    ctx.fillRect(tpx - s, tpy + 7 * s, 2 * s, 5 * s);
    [[0, 0, 5], [-s, -s, 4], [0, -2 * s, 3]].forEach(([dx, dy, r]) => {
      ctx.fillStyle = tc;
      ctx.fillRect(tpx + dx - r * s, tpy + dy - r * s, r * 2 * s, r * 2 * s);
    });
  });

  // Scanline texture
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, y, W, 1);
  }
}

// ── species data ──────────────────────────────────────────────
export const SPECIES = [
  // ── 1. BOBOLINK ───────────────────────────────────────────
  {
    id: 'bobolink',
    name: 'Bobolink',
    emoji: '🐦',
    habitat: 'Grasslands & Farm Fields',
    msg: 'I live in grasslands and farm fields. When my habitat is protected, meadow life has a better chance to thrive.',
    worldEffect: 'grass',
    cardColor: '#8ab84a',
    bgHue: 100,
    soundFile: '/sounds/bobolink.mp3',
    draw(ctx, ox, oy, s) {
      const B = '#111111', W = '#f2eedd', Y = '#d4c218', N = '#7a5c2a';
      // === BODY ===
      // Black back/wings
      [[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],
       [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
       [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],
       [5,11],[6,11],[7,11],[8,11],[9,11],[10,11]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      // Cream underparts
      [[6,9],[7,9],[8,9],[6,10],[7,10],[8,10]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // Nape patch — bright yellow
      [[5,8],[6,8]].forEach(([x,y])=>px(ctx,x,y,Y,s,ox,oy));
      // === HEAD ===
      [[5,5],[6,5],[7,5],[8,5],
       [4,6],[5,6],[6,6],[7,6],[8,6],[9,6],
       [4,7],[5,7],[6,7],[7,7],[8,7],[9,7]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      // Eye (red iris)
      px(ctx,8,6,'#cc4422',s,ox,oy);
      px(ctx,8,6,'rgba(255,160,140,0.5)',s,ox,oy);
      // Beak
      [[9,6],[10,6],[10,7]].forEach(([x,y])=>px(ctx,x,y,'#b09828',s,ox,oy));
      // === WINGS (spread slightly) ===
      [[3,9],[2,10],[3,10],[2,11],[3,11]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      [[11,9],[12,10],[11,10],[12,11],[11,11]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      // Wing bars — buff
      [[3,10],[4,10]].forEach(([x,y])=>px(ctx,x,y,'#c8b060',s,ox,oy));
      [[10,10],[11,10]].forEach(([x,y])=>px(ctx,x,y,'#c8b060',s,ox,oy));
      // === TAIL ===
      [[6,12],[7,12],[8,12],[6,13],[7,13],[8,13]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      // === LEGS ===
      [[6,14],[7,14],[6,15],[8,15]].forEach(([x,y])=>px(ctx,x,y,N,s,ox,oy));
    },
  },

  // ── 2. BALD EAGLE ─────────────────────────────────────────
  {
    id: 'bald-eagle',
    name: 'Bald Eagle',
    emoji: '🦅',
    habitat: 'Forests & Wetlands',
    msg: 'I help show what recovery can look like. With stronger protection, species like me can return and soar again.',
    worldEffect: 'canopy',
    cardColor: '#4a7c4e',
    bgHue: 210,
    soundFile: '/sounds/bald-eagle.mp3',
    draw(ctx, ox, oy, s) {
      const B = '#181818', W = '#f0f0f0', Y = '#e8b820';
      // === WINGS fully spread ===
      for (let x = 0; x <= 22; x++) {
        for (let y = 7; y <= 11; y++) {
          // Darker leading edge, lighter inner wing
          const c = (x < 3 || x > 19) ? '#222' : (x < 6 || x > 16) ? '#2a2a2a' : '#333';
          px(ctx, x, y, c, s, ox, oy);
        }
      }
      // Wing highlight streaks
      [[4,8],[5,8],[6,8],[16,8],[17,8],[18,8]].forEach(([x,y])=>px(ctx,x,y,'#404040',s,ox,oy));
      [[7,9],[8,9],[14,9],[15,9]].forEach(([x,y])=>px(ctx,x,y,'#3a3a3a',s,ox,oy));
      // === BODY (dark centre) ===
      [[9,8],[10,8],[11,8],[12,8],[13,8],
       [8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],
       [9,10],[10,10],[11,10],[12,10],[13,10],
       [10,11],[11,11],[12,11]].forEach(([x,y])=>px(ctx,x,y,B,s,ox,oy));
      // === WHITE HEAD ===
      [[9,3],[10,3],[11,3],[12,3],
       [8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
       [8,5],[9,5],[10,5],[11,5],[12,5],[13,5],
       [9,6],[10,6],[11,6],[12,6],[13,6]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // Eye
      px(ctx,10,4,'#202020',s,ox,oy);
      px(ctx,10,4,'rgba(255,255,180,0.55)',s,ox,oy);
      // Hooked yellow beak
      [[13,4],[14,4],[14,5],[13,5],[15,5],[13,6],[14,6]].forEach(([x,y])=>px(ctx,x,y,Y,s,ox,oy));
      // === WHITE TAIL ===
      [[9,12],[10,12],[11,12],[12,12],[13,12],
       [9,13],[10,13],[11,13],[12,13],
       [10,14],[11,14]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // === YELLOW TALONS ===
      [[9,15],[10,15],[11,15],[12,15],[8,15],[13,15]].forEach(([x,y])=>px(ctx,x,y,Y,s,ox,oy));
    },
  },

  // ── 3. PEREGRINE FALCON ───────────────────────────────────
  {
    id: 'peregrine-falcon',
    name: 'Peregrine Falcon',
    emoji: '🪶',
    habitat: 'Cliffs, River Valleys & Cities',
    msg: 'I remind people that smart environmental choices can help species recover and keep ecosystems balanced.',
    worldEffect: 'sky',
    cardColor: '#5a8aaa',
    bgHue: 205,
    soundFile: '/sounds/peregrine-falcon.mp3',
    draw(ctx, ox, oy, s) {
      const DK = '#252530', MD = '#686878', LT = '#b0b0c8', W = '#f0f0f0';
      // === BODY — streamlined torpedo ===
      [[7,6],[8,6],[9,6],[10,6],[11,6],
       [6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],
       [6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],
       [7,9],[8,9],[9,9],[10,9],[11,9],
       [8,10],[9,10],[10,10]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
      // Dark back
      [[6,7],[7,7],[11,7],[12,7],
       [5,8],[6,8],[12,8],[13,8]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Pale barred breast
      [[8,8],[9,8],[8,9],[9,9],[10,9]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // Barring marks on breast
      [[8,9],[9,9]].forEach(([x,y])=>px(ctx,x,y,'#c8c8b8',s,ox,oy));
      [[8,10],[9,10]].forEach(([x,y])=>px(ctx,x,y,'#b8b8a8',s,ox,oy));
      // === HEAD ===
      [[7,3],[8,3],[9,3],[10,3],[11,3],
       [7,4],[8,4],[9,4],[10,4],[11,4],
       [8,5],[9,5],[10,5],[11,5]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Pale throat / cheek
      [[9,4],[10,4]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // Moustachial stripe — distinctive!
      [[8,5],[9,5]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Eye
      px(ctx,8,3,'#ff8060',s,ox,oy);
      // Hooked beak
      [[11,4],[12,4],[12,5]].forEach(([x,y])=>px(ctx,x,y,'#d0c020',s,ox,oy));
      // === LONG POINTED WINGS ===
      [[2,7],[3,7],[4,7],[5,7],[2,8],[3,8],[4,8],[3,9]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      [[14,7],[15,7],[16,7],[17,7],[14,8],[15,8],[16,8],[16,9]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // === TAIL — long, barred ===
      [[8,11],[9,11],[10,11],[11,11],
       [8,12],[9,12],[10,12],
       [9,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      [[8,12],[10,12]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
    },
  },

  // ── 4. RAPIDS CLUBTAIL ────────────────────────────────────
  {
    id: 'rapids-clubtail',
    name: 'Rapids Clubtail',
    emoji: '🪲',
    habitat: 'Fast-Flowing Rivers & Streams',
    msg: 'I need clean rivers and healthy shorelines. When my waterways are protected, many other species benefit too.',
    worldEffect: 'stream',
    cardColor: '#3a9a8a',
    bgHue: 180,
    soundFile: '/sounds/rapids-clubtail.mp3',
    draw(ctx, ox, oy, s) {
      const TL = '#186060', LT = '#38a080', YL = '#c8c018', BK = '#101818';
      const WING = 'rgba(200,240,255,0.55)';
      // === SEGMENTED ABDOMEN (long) ===
      for (let i = 0; i < 12; i++) {
        const c = i % 2 === 0 ? TL : LT;
        px(ctx, 9, 5 + i, c, s, ox, oy);
        px(ctx, 10, 5 + i, c, s, ox, oy);
      }
      // Club end (wider)
      [[7,14],[8,14],[9,14],[10,14],[11,14],[12,14],
       [7,15],[8,15],[9,15],[10,15],[11,15],[12,15],
       [8,16],[9,16],[10,16],[11,16]].forEach(([x,y])=>px(ctx,x,y,TL,s,ox,oy));
      // Yellow rings on abdomen
      [[9,6],[10,6],[9,8],[10,8],[9,10],[10,10],[9,12],[10,12]].forEach(([x,y])=>px(ctx,x,y,YL,s,ox,oy));
      // === THORAX ===
      [[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],
       [6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5]].forEach(([x,y])=>px(ctx,x,y,YL,s,ox,oy));
      // === HEAD ===
      [[7,2],[8,2],[9,2],[10,2],[11,2],
       [7,3],[8,3],[9,3],[10,3],[11,3]].forEach(([x,y])=>px(ctx,x,y,TL,s,ox,oy));
      // Huge compound eyes
      [[6,2],[7,2],[6,3]].forEach(([x,y])=>px(ctx,x,y,'#30c070',s,ox,oy));
      [[11,2],[12,2],[12,3]].forEach(([x,y])=>px(ctx,x,y,'#30c070',s,ox,oy));
      // === 4 LARGE WINGS ===
      // Upper pair
      [[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
       [1,5],[2,5],[3,5],[4,5],[5,5],
       [2,6],[3,6],[4,6]].forEach(([x,y])=>px(ctx,x,y,WING,s,ox,oy));
      [[14,4],[15,4],[16,4],[17,4],[18,4],[19,4],
       [14,5],[15,5],[16,5],[17,5],[18,5],
       [15,6],[16,6],[17,6]].forEach(([x,y])=>px(ctx,x,y,WING,s,ox,oy));
      // Lower pair (shorter)
      [[2,6],[3,6],[4,6],[5,6],[6,6],
       [3,7],[4,7],[5,7]].forEach(([x,y])=>px(ctx,x,y,'rgba(180,230,255,0.42)',s,ox,oy));
      [[13,6],[14,6],[15,6],[16,6],[17,6],
       [14,7],[15,7],[16,7]].forEach(([x,y])=>px(ctx,x,y,'rgba(180,230,255,0.42)',s,ox,oy));
      // Wing veins
      [[3,4],[3,5]].forEach(([x,y])=>px(ctx,x,y,'rgba(100,200,200,0.35)',s,ox,oy));
      [[16,4],[16,5]].forEach(([x,y])=>px(ctx,x,y,'rgba(100,200,200,0.35)',s,ox,oy));
    },
  },

  // ── 5. REDSIDE DACE ───────────────────────────────────────
  {
    id: 'redside-dace',
    name: 'Redside Dace',
    emoji: '🐟',
    habitat: 'Cool, Clear Streams',
    msg: 'I may be tiny, but I help reveal whether streams are clean, cool, and healthy for everyone downstream.',
    worldEffect: 'stream2',
    cardColor: '#4a6aaa',
    bgHue: 195,
    soundFile: '/sounds/redside-dace.mp3',
    draw(ctx, ox, oy, s) {
      const SL = '#909090', RD = '#c82820', BL = '#1020a0', W = '#e8e8e8';
      // === BODY — compact oval ===
      [[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],
       [4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],
       [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
       [5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],
       [7,10],[8,10],[9,10],[10,10],[11,10]].forEach(([x,y])=>px(ctx,x,y,SL,s,ox,oy));
      // RED lateral stripe — defining feature, runs mid-body
      [[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7]].forEach(([x,y])=>px(ctx,x,y,RD,s,ox,oy));
      // BLUE stripe below red
      [[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8]].forEach(([x,y])=>px(ctx,x,y,BL,s,ox,oy));
      // Pale belly
      [[7,9],[8,9],[9,9],[10,9],[11,9]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      // Scale shimmer
      [[8,6],[10,6],[12,6],[8,8],[10,8]].forEach(([x,y])=>px(ctx,x,y,'rgba(255,255,255,0.25)',s,ox,oy));
      // === HEAD ===
      [[3,7],[4,7],[3,8],[4,8]].forEach(([x,y])=>px(ctx,x,y,SL,s,ox,oy));
      // Eye
      px(ctx,3,7,'#181818',s,ox,oy);
      px(ctx,3,7,'rgba(255,255,200,0.4)',s,ox,oy);
      // Mouth
      px(ctx,2,8,'#c8c0a0',s,ox,oy);
      // === FINS ===
      // Dorsal fin
      [[8,5],[9,5],[10,5],[9,4],[10,4]].forEach(([x,y])=>px(ctx,x,y,'rgba(130,130,130,0.65)',s,ox,oy));
      // Pectoral fin
      [[5,9],[4,10]].forEach(([x,y])=>px(ctx,x,y,'rgba(130,130,130,0.5)',s,ox,oy));
      // Tail fin — forked
      [[14,6],[15,6],[16,6],[15,7],[16,7],[17,7],[14,8],[15,8],[16,8]].forEach(([x,y])=>px(ctx,x,y,'rgba(120,120,120,0.7)',s,ox,oy));
      // Tail fork gap
      px(ctx,15,7,'rgba(0,0,0,0)',s,ox,oy);
    },
  },

  // ── 6. JEFFERSON SALAMANDER ───────────────────────────────
  {
    id: 'jefferson-salamander',
    name: 'Jefferson Salamander',
    emoji: '🦎',
    habitat: 'Deciduous Forests & Wetlands',
    msg: 'I travel between forests and breeding pools. Connected habitats help me survive the journey each spring.',
    worldEffect: 'undergrowth',
    cardColor: '#7a9a4a',
    bgHue: 120,
    soundFile: '/sounds/jefferson-salamander.mp3',
    draw(ctx, ox, oy, s) {
      const DK = '#1a2c10', MD = '#2e5020', SL = '#8aa870', HL = '#b0c890';
      // === LONG BODY ===
      [[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],
       [4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],
       [4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],
       [5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
      // Silver-blue fleck pattern — characteristic markings
      [[5,8],[7,8],[9,8],[11,8],[13,8],
       [4,9],[6,9],[8,9],[10,9],[12,9],[14,9],
       [5,10],[7,10],[9,10],[11,10],[13,10]].forEach(([x,y])=>px(ctx,x,y,SL,s,ox,oy));
      // Pale ventral side
      [[6,10],[7,10],[8,10],[9,10],[10,10],[11,10]].forEach(([x,y])=>px(ctx,x,y,HL,s,ox,oy));
      // === HEAD (blunt, broad) ===
      [[2,9],[3,9],[2,10],[3,10],[4,10]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
      px(ctx,2,9,'#ff9080',s,ox,oy); // eye
      // === 4 SHORT LEGS ===
      // Front left
      [[4,7],[3,7],[3,6],[2,6]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Front right
      [[9,7],[10,7],[10,6],[11,6]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Rear left
      [[5,12],[4,12],[4,13],[3,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Rear right
      [[10,12],[11,12],[11,13],[12,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Toe toes
      [[2,6],[1,7],[3,6]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      [[11,6],[12,6],[12,7]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // === LONG TAPERING TAIL ===
      [[13,9],[14,9],[15,9],[15,10],[16,10],[16,11],[17,11],[17,12],[18,12]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
    },
  },

  // ── 7. COMMON SNAPPING TURTLE ─────────────────────────────
  {
    id: 'common-snapping-turtle',
    name: 'Common Snapping Turtle',
    emoji: '🐢',
    habitat: 'Wetlands, Ponds & Slow Rivers',
    msg: 'I help keep wetlands balanced. Safe roads and protected nesting areas help turtles like me survive.',
    worldEffect: 'wetland',
    cardColor: '#8a7a4a',
    bgHue: 140,
    soundFile: '/sounds/common-snapping-turtle.mp3',
    draw(ctx, ox, oy, s) {
      const DK = '#283810', MD = '#3d5a18', LT = '#6a8a38', SC = '#556828';
      // === SHELL — carapace with scute detail ===
      [[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],
       [5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],
       [4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],
       [4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
       [5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],
       [6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],
       [7,11],[8,11],[9,11],[10,11],[11,11]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
      // Scute (plate) pattern — central vertebral + costal
      [[8,6],[9,6],[8,7],[9,7]].forEach(([x,y])=>px(ctx,x,y,LT,s,ox,oy));  // central
      [[6,7],[7,7],[6,8],[7,8]].forEach(([x,y])=>px(ctx,x,y,SC,s,ox,oy));  // left costal
      [[10,7],[11,7],[10,8],[11,8]].forEach(([x,y])=>px(ctx,x,y,SC,s,ox,oy)); // right costal
      [[7,9],[8,9],[7,10],[8,10]].forEach(([x,y])=>px(ctx,x,y,LT,s,ox,oy)); // lower centre
      [[9,9],[10,9],[9,10],[10,10]].forEach(([x,y])=>px(ctx,x,y,SC,s,ox,oy));
      // Shell edge ridges — keeled
      [[6,5],[8,5],[10,5],[12,5]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // === HEAD on long neck ===
      [[1,8],[2,8],[3,8],[1,9],[2,9],[3,9],[4,9]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Head texture
      [[2,8],[3,8],[2,9],[3,9]].forEach(([x,y])=>px(ctx,x,y,'#3a5818',s,ox,oy));
      // Eye
      px(ctx,2,8,'#ff8070',s,ox,oy);
      px(ctx,2,8,'rgba(255,200,180,0.4)',s,ox,oy);
      // Hooked jaw (snapping!)
      [[1,9],[1,10]].forEach(([x,y])=>px(ctx,x,y,'#4a6820',s,ox,oy));
      // === 4 CLAWED LEGS ===
      // Front left
      [[4,11],[3,11],[3,12],[2,12],[2,13],[1,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Claws front left
      [[1,12],[1,13],[2,13]].forEach(([x,y])=>px(ctx,x,y,'#708040',s,ox,oy));
      // Front right
      [[13,11],[14,11],[14,12],[15,12],[15,13],[16,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      [[16,12],[16,13],[15,13]].forEach(([x,y])=>px(ctx,x,y,'#708040',s,ox,oy));
      // Rear left
      [[5,12],[4,12],[4,13],[3,13],[3,14]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Rear right
      [[12,12],[13,12],[13,13],[14,13],[14,14]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // === SERRATED TAIL (distinctive!) ===
      [[14,8],[15,8],[15,9],[16,9],[16,10],[17,10],[17,11],[18,11],[18,12],[19,13]].forEach(([x,y])=>px(ctx,x,y,DK,s,ox,oy));
      // Serrations on tail
      [[15,8],[16,9],[17,10],[18,11]].forEach(([x,y])=>px(ctx,x,y,MD,s,ox,oy));
    },
  },

  // ── 8. HOODED WARBLER ─────────────────────────────────────
  {
    id: 'hooded-warbler',
    name: 'Hooded Warbler',
    emoji: '🐤',
    habitat: 'Interior Deciduous Forests',
    msg: 'I need quiet interior forests to nest safely. When forests stay connected, birds like me have a better chance.',
    worldEffect: 'birds',
    cardColor: '#aa9a3a',
    bgHue: 110,
    soundFile: '/sounds/hooded-warbler.mp3',
    draw(ctx, ox, oy, s) {
      const YL = '#d8c010', BK = '#101010', GR = '#2a5018', W = '#f0f0e0';
      // === BRIGHT YELLOW BODY ===
      [[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],
       [5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],
       [6,9],[7,9],[8,9],[9,9],[10,9],[11,9],
       [7,10],[8,10],[9,10],[10,10]].forEach(([x,y])=>px(ctx,x,y,YL,s,ox,oy));
      // Belly slightly paler
      [[7,9],[8,9],[9,9]].forEach(([x,y])=>px(ctx,x,y,'#e8d420',s,ox,oy));
      // === BLACK HOOD — head, throat, bib ===
      [[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],
       [5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],
       [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],
       [5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],
       [4,7],[5,7],[12,7],[13,7]].forEach(([x,y])=>px(ctx,x,y,BK,s,ox,oy));
      // Throat bib extends down
      [[6,7],[7,7],[6,8],[7,8]].forEach(([x,y])=>px(ctx,x,y,BK,s,ox,oy));
      // === WHITE EYE RINGS — key field mark ===
      [[8,4],[9,4]].forEach(([x,y])=>px(ctx,x,y,W,s,ox,oy));
      px(ctx,8,3,W,s,ox,oy);
      px(ctx,9,3,W,s,ox,oy);
      px(ctx,7,4,W,s,ox,oy);
      // Eye itself (dark inside ring)
      px(ctx,8,4,'#181818',s,ox,oy);
      // === BEAK (small) ===
      [[11,4],[12,4],[12,5]].forEach(([x,y])=>px(ctx,x,y,'#c0a020',s,ox,oy));
      // === OLIVE-GREEN WINGS ===
      [[3,7],[4,7],[4,8],[3,8],[3,9]].forEach(([x,y])=>px(ctx,x,y,GR,s,ox,oy));
      [[13,7],[14,7],[14,8],[13,8],[13,9]].forEach(([x,y])=>px(ctx,x,y,GR,s,ox,oy));
      // Wing bars (yellowish)
      [[4,8],[5,8]].forEach(([x,y])=>px(ctx,x,y,'#b0a018',s,ox,oy));
      [[12,8],[13,8]].forEach(([x,y])=>px(ctx,x,y,'#b0a018',s,ox,oy));
      // === TAIL with white spots ===
      [[7,11],[8,11],[9,11],[10,11],[7,12],[8,12],[9,12],[10,12]].forEach(([x,y])=>px(ctx,x,y,BK,s,ox,oy));
      // White outer tail spots — field mark!
      px(ctx,7,11,W,s,ox,oy); px(ctx,10,11,W,s,ox,oy);
      px(ctx,7,12,W,s,ox,oy); px(ctx,10,12,W,s,ox,oy);
      // === LEGS ===
      [[8,13],[9,13],[7,14],[10,14]].forEach(([x,y])=>px(ctx,x,y,'#a08030',s,ox,oy));
    },
  },
];
