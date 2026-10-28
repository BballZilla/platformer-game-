// ---------------------------------------------------------------------------
// level.js — the level map and tile collision.
//
// Each level is drawn as text: one character per 32x32 tile. Edit the maps
// below to redesign a level, or add another entry to LEVELS to add a level.
// Rows can be any length (they're padded), and a level can be taller than
// the screen — the camera follows the player up and down.
//
//   #  ground (solid)          B  brick (solid)
//   -  one-way platform        ^  spikes (deadly)
//   P  player start            E  enemy (walker)
//   o  coin                    S  spring
//   C  checkpoint              F  goal flag
//   G  ghost (floats back and forth, ignores walls)
// ---------------------------------------------------------------------------

const LEVELS = [
  {
    name: "Haunted Hills",
    sky: ["#120a24", "#2e1747", "#7a3b55"],   // top, middle, horizon
    moon: "#fdf3c4",
    map: [
      "#                                                                                                                                                              #",
      "#                                                                                                                                                              #",
      "#                                                                                                                                                              #",
      "#                                                                                                                                                              #",
      "#                                                                                                                                                              #",
      "#                                                                         oooooooo                                                                             #",
      "#                                                                        ----------                                                                            #",
      "#                                                                                                                                                              #",
      "#                                                                                                                                                     o        #",
      "#                                                                                                     o    oooE                            oo        ---       #",
      "#                oooo                                                                                ---  BBBBBB                           BB     oo           #",
      "#                BBBB     oo         ooo     ooo oo                                    ooo        o               ooo                      BB     BB           #",
      "#       ooo              o  o       -----       ----      BBB     Boooo               -----      ---             -----                 BB  BB  BB BB        F  #",
      "#            BB                  BB                       BBB    BB     S                                                       BB     BB  BB  BB BB     #######",
      "#  P         BB      E           BB ^^^^^              E  BBB C BBB    BBB    ^^^^     E     S              E           C     E BB  E  BB  BB  BB BB     #######",
      "#########################    ############    ###    ###################     ####################^^^^^^^^#########     ##########################################",
      "#########################    ############    ###    ###################     #####################################     ##########################################",
    ],
  },
  {
    name: "Graveyard Crypt",
    sky: ["#06141a", "#123a3a", "#3f6b4a"],
    moon: "#e6ffd9",
    map: [
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#                             G                              ooooooooooooo                                      oo",
      "#                                             G             BBBBBBBBBBBBBBB                                     BB",
      "#                                                           BBBBBBBBBBBBBBB                  G                  BB",
      "#            G              ooooo          oo                                           oooo                 BB BB   G               o",
      "#     oooo            oo  ---------   oo   BB   oo                                   G  ----          o      BB BB        o         ---           F",
      "#                    o  o             BB   BB   BB           o o o   o o o                                BB BB BB                             ######",
      "#  P             E         ^^^^^^^    BB   BB   BB    C  S      E  ^^  E           E           ^^^      C BB BB BB              E  ^   E       ######",
      "#####################    ##########   ##   ##   ##   #######################    #####################   #################   ##########################",
      "#####################    ##########   ##   ##   ##   #######################    #####################   #################   ##########################",
    ],
  },
  {
    name: "Witch's Peak",
    sky: ["#14040a", "#3d0c1c", "#8a2b1f"],
    moon: "#ff8a66",
    map: [
      "#",
      "#",
      "#                                                                                                ooo",
      "#",
      "#                                                         G",
      "#                                                   ooo       ooo",
      "#                                      ooo     C           E         E",
      "#                                     ----- BBBBBBBB   BBBBBBB   BBBBBBBBBBB                               o",
      "#                                           BB                                                       G          E   F",
      "#                                 ooo       BB                                              o                ###########",
      "#                                -----      BB                                                    S          ###########",
      "#                                           BB                                ooo     ooo     ############   ###########",
      "#                                      ooo  BB                                    E           ############   ###########",
      "#                                     ----- BB                              ###############   ############   ###########",
      "#                                           BB                              ###############   ############   ###########",
      "#                                 ooo       BB                              ###############   ############   ###########",
      "#                                -----      BB                              ###############   ############   ###########",
      "#                                           BB                              ###############   ############   ###########",
      "#          o    G        oooo          ooo  BB                              ###############   ############   ###########",
      "#    ooo  o o        o   ----         ----- BB                              ###############   ############   ###########",
      "#                                           BB                              ###############   ############   ###########",
      "#  P    E         E       ^^  C             BB^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^###############   ############   ###########",
      "##########   #######   ####################################################################   ############   ###########",
      "##########   #######   ####################################################################   ############   ###########",
    ],
  },
];

const SOLID_TILES = new Set(["#", "B"]);

class Level {
  constructor({ name, sky, moon, map }) {
    this.name = name;
    this.sky = sky;
    this.moon = moon;
    this.rows = map.length;
    this.cols = Math.max(...map.map((row) => row.length));
    this.width = this.cols * TILE;
    this.height = this.rows * TILE;

    // Entity spawn points found in the map. Their tiles become empty space.
    this.spawns = { player: null, enemies: [], ghosts: [], coins: [], springs: [], checkpoints: [], flag: null };
    this.tiles = [];

    for (let r = 0; r < this.rows; r++) {
      const line = map[r].padEnd(this.cols, " ");
      const tileRow = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = line[c];
        const spawn = { col: c, row: r };
        switch (ch) {
          case "P": this.spawns.player = spawn; break;
          case "E": this.spawns.enemies.push(spawn); break;
          case "G": this.spawns.ghosts.push(spawn); break;
          case "o": this.spawns.coins.push(spawn); break;
          case "S": this.spawns.springs.push(spawn); break;
          case "C": this.spawns.checkpoints.push(spawn); break;
          case "F": this.spawns.flag = spawn; break;
        }
        tileRow.push("#B-^".includes(ch) ? ch : " ");
      }
      this.tiles.push(tileRow);
    }

    if (!this.spawns.player) throw new Error("Level has no player start (P)");
    if (!this.spawns.flag) throw new Error("Level has no goal flag (F)");
  }

  tileAt(col, row) {
    // Left/right edges of the world act as walls; above and below are open
    // (above so springs can launch you high, below so you can fall to your doom).
    if (col < 0 || col >= this.cols) return "#";
    if (row < 0 || row >= this.rows) return " ";
    return this.tiles[row][col];
  }

  isSolid(col, row)   { return SOLID_TILES.has(this.tileAt(col, row)); }
  isOneWay(col, row)  { return this.tileAt(col, row) === "-"; }
  isSpike(col, row)   { return this.tileAt(col, row) === "^"; }
  isStandable(col, row) { return this.isSolid(col, row) || this.isOneWay(col, row); }

  // ---- Collision ----------------------------------------------------------
  // Bodies are axis-aligned boxes {x, y, w, h}. We move one axis at a time and
  // push the body back out of any solid tile it ends up inside. Moving X and Y
  // separately is what makes sliding along walls and floors "just work".
  // (Speeds are capped so a body never moves more than one tile per step,
  // which means it can't tunnel through a wall.)

  // Returns true if the body hit a wall.
  moveX(body, dx) {
    if (dx === 0) return false;
    body.x += dx;
    const top = Math.floor(body.y / TILE);
    const bottom = Math.floor((body.y + body.h - 0.01) / TILE);
    const col = dx > 0 ? Math.floor((body.x + body.w - 0.01) / TILE) : Math.floor(body.x / TILE);

    for (let row = top; row <= bottom; row++) {
      if (this.isSolid(col, row)) {
        body.x = dx > 0 ? col * TILE - body.w : (col + 1) * TILE;
        body.vx = 0;
        return true;
      }
    }
    return false;
  }

  // Sets body.onGround when landing. Returns true if the body bumped its head.
  moveY(body, dy) {
    body.onGround = false;
    if (dy === 0) return false;
    const prevBottom = body.y + body.h;
    body.y += dy;
    const left = Math.floor(body.x / TILE);
    const right = Math.floor((body.x + body.w - 0.01) / TILE);

    if (dy > 0) {
      const row = Math.floor((body.y + body.h - 0.01) / TILE);
      for (let col = left; col <= right; col++) {
        // One-way platforms only block you if you were above them last step.
        const oneWayBlocks = this.isOneWay(col, row) && prevBottom <= row * TILE + 0.01 && !body.dropThrough;
        if (this.isSolid(col, row) || oneWayBlocks) {
          body.y = row * TILE - body.h;
          body.vy = 0;
          body.onGround = true;
          return false;
        }
      }
    } else {
      const row = Math.floor(body.y / TILE);
      for (let col = left; col <= right; col++) {
        if (this.isSolid(col, row)) {
          body.y = (row + 1) * TILE;
          body.vy = 0;
          return true;
        }
      }
    }
    return false;
  }

  // Is the body standing only on one-way platforms (so it may drop through)?
  onlyOneWayBelow(body) {
    const row = Math.floor((body.y + body.h + 1) / TILE);
    const left = Math.floor(body.x / TILE);
    const right = Math.floor((body.x + body.w - 0.01) / TILE);
    let anyOneWay = false;
    for (let col = left; col <= right; col++) {
      if (this.isSolid(col, row)) return false;
      if (this.isOneWay(col, row)) anyOneWay = true;
    }
    return anyOneWay;
  }

  // Does the body touch a spike? Spikes only hurt in their lower, pointy part
  // so grazing the very top corner is forgiving.
  touchesSpike(body) {
    const left = Math.floor(body.x / TILE);
    const right = Math.floor((body.x + body.w - 0.01) / TILE);
    const top = Math.floor(body.y / TILE);
    const bottom = Math.floor((body.y + body.h - 0.01) / TILE);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!this.isSpike(col, row)) continue;
        const spikeBox = { x: col * TILE + 4, y: row * TILE + 14, w: TILE - 8, h: TILE - 14 };
        if (overlaps(body, spikeBox)) return true;
      }
    }
    return false;
  }
}

// Axis-aligned bounding box overlap test, used all over the game.
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
