# Mushroom Bother

A maze chase game in the spirit of the Commodore 64 lawnmower classics, except
the hero is a mushroom-collecting cat rather than a man with a borrowed mower.

Nine mushrooms are scattered through a garden of hedges and trees. Collect all
nine and the level is yours. Two people would rather you didn't: a photographer
after his shot, and Mary Ellen, your landlord, who would like a word about the
rent.

**The catch:** the people can step over the hedges. The cat cannot. They come
at you in something close to a straight line while you take the long way round
the maze. Trees stop everyone.

Your only defence is to complain. Hold `SPACE` and the cat yowls; anyone within
earshot turns and runs. It drains the complaint meter, and when the meter is
empty the cat has lost its voice until it recovers.

## Playing it

Open `index.html` in any modern browser. No build step, no server, no
dependencies — it is plain HTML, CSS and JavaScript, and every sprite is drawn
from rectangles at runtime, so there are no image or audio files to load.

| Key | Does |
| --- | --- |
| Arrow keys or WASD | Walk the cat (it only moves while a key is held) |
| Hold `SPACE` | Complain — scares off anyone nearby, drains the meter |
| `P` | Pause |
| `R` | Restart |
| `M` | Mute |

## The rules in full

- **Nine mushrooms per level.** Clear them all to move on. Every level is a
  fresh maze, generated from the level number, so level 4 is always the same
  level 4.
- **Hedges** are low. The photographer and Mary Ellen step straight over them;
  the cat has to go around.
- **Trees** are tall. Nobody gets through a tree, cat or human.
- **Complaining** empties the meter at 30 units a second out of 100. Let go and
  after a short pause it refills at 13 a second. Run it all the way down and the
  cat loses its voice until the meter climbs back past 22 — so short, timed
  yowls beat one long one.
- **Getting caught** costs a cat. You start with three, plus one more every
  5,000 points. An enemy that is currently fleeing cannot catch you.
- **Scoring:** 100 a mushroom, 25 each time you send someone running, and
  500 + 100 × level for clearing the garden.
- **The two chasers behave differently.** The photographer heads straight for
  the cat. Mary Ellen aims a few tiles ahead of where the cat is going, trying
  to cut it off — so doubling back can beat her.

Later levels grow more hedges and the chasers get quicker.

## Layout

```
index.html      page shell, C64-ish framing, loads the four scripts
src/maze.js     level generation: maze carving, hedge/tree mix, mushroom placing
src/sprites.js  all the art — characters and tiles drawn as rectangles
src/audio.js    WebAudio bleeps, synthesised on the fly
src/game.js     game loop, movement, chase AI, complaint meter, HUD, screens
tests/          headless browser tests
```

The cat moves in the Pac-Man style: it walks along a corridor and turns when it
is near enough to a tile centre. The chasers step tile to tile, picking each
step from a breadth-first distance field over everything they can cross —
grass *and* hedges. When they are fleeing they read the same field backwards.

## Tests

The tests drive the real game in headless Chromium.

```bash
npm install playwright-core          # plus a Chromium build
CHROMIUM=/path/to/chrome node tests/rules.test.js      # 14 rule checks
CHROMIUM=/path/to/chrome node tests/autoplay.test.js 90  # bot plays for 90s
```

`rules.test.js` checks the things that make this game what it is: that the cat
never ends up on a hedge or a tree, that the humans do cross hedges and don't
cross trees, the whole complaint-meter lifecycle including losing your voice,
scaring, capture, life loss, respawn, game over, restart, and that levels 1–12
each contain nine mushrooms the cat can actually walk to. It exits non-zero on
failure.

`autoplay.test.js` runs a pathfinding bot that plays for real, clearing levels
while yelling at anyone who gets close — a check that a full session runs
without errors.
