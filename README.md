# Mushroom Bother

A maze chase game in the spirit of the Commodore 64 lawnmower classics, except
the hero is Stussy, a mushroom-collecting cat, rather than a man with a
borrowed mower.

Nine mushrooms are scattered through a garden of hedges and trees. Collect all
nine and the level is yours. Two people would rather you didn't: a photographer
after his shot, and Maryellen, your landlord, who would like a word about the
rent.

**The catch:** the people can step over the hedges. Stussy cannot. They come at
you in something close to a straight line while you take the long way round the
maze. Trees stop everyone.

Stussy's only defence is to complain. Hold `SPACE` and Stussy lets fly — *that's
not paleo!*, *the lift is broken again!*, *this camera is worth half that!* —
and anyone within earshot turns and runs. It drains the complaint meter, and
when the meter is empty Stussy has lost their voice until it recovers.

## Booting it

The game comes up the way a cracked tape would have. First a crack intro —
rolling raster bars, a scroller, a held synth wash — which sits there until you
press SPACE. Then the loading picture for ten seconds, and then the title
screen. Both are boot-time only: restarting a game does not put you through them
again.

## Playing it

Open `index.html` in any modern browser. No build step, no server, no
dependencies — it is plain HTML, CSS and JavaScript, and every sprite is drawn
from rectangles at runtime, so there are no image or audio files to load.

| Key | Does |
| --- | --- |
| Arrow keys or WASD | Steer Stussy — tap a direction and she keeps going |
| Hold `SPACE` | Complain — scares off anyone nearby, drains the meter |
| `P` | Pause |
| `R` | Restart |
| `M` | Mute |

### On a phone or tablet

Touch devices get on-screen controls drawn over the garden, and the page scales
the whole game to fit the screen — landscape gives you the most room.

- **D-pad, bottom left.** Tap a direction and Stussy keeps going — no need to
  hold it. Slide your thumb around the pad to change direction without lifting
  off. With your thumb away, the pad shows the direction she is still travelling
  in.
- **COMPLAIN button, bottom right.** Hold it to yowl. The ring around the
  button is the complaint meter, so you can watch it drain without looking away
  from the maze; it turns red and reads NO VOICE when you have run it dry.
- Both work at once on separate fingers, so you can run and complain together.
- The controls appear only during a round. On the title and game over screens a
  tap anywhere starts the game — including the corner where the d-pad sits.

## The levels

Most levels are a freshly generated garden, but two are drawn by hand.

| # | Level | Collect | Chasers |
| --- | --- | --- | --- |
| 1, 5+ | the garden | mushrooms | the photographer and Maryellen |
| 2 | **Hawker St Mansion** | cheese and crackers | the photographer and **Charteris Bay Man** |
| 3 | **Strait of Stussy** | sugared doughnuts | the photographer and Maryellen |
| 4 | **The Beach** | life preserver rings | the photographer and **Willie** |

**Hawker St Mansion** is a two-storey Wellington villa of the Mt Victoria sort:
four bedrooms off an upstairs hallway, a staircase down the middle of the house,
and a lounge and kitchen either side of the downstairs hall. The beds and sofas
are what the people step over. The rival here is Charteris Bay Man — an aging
rocker in glasses, denim jacket, black jeans and Chuck Taylors, whose entire
contribution is "FUCK OFF STUSSY". A clinker dinghy called *Chartreuse* is
parked in the downstairs lounge, side on, anchor over the side, as you would
expect.

**Strait of Stussy** is the Victoria Street block: long straight streets, a
grid of lanes and the angled corner where Victoria meets Bond. Planter boxes and
low walls line the footpaths, and the people stride straight over them while
Stussy goes the long way round. The Majestic Centre stands over the block at the
top of the street — banded glass drum, terracotta column, spiked crown.

**The Beach** is open sand along the water, with rock groynes and driftwood
between you and the nine life preserver rings somebody has left lying about. Maryellen stays home: the rival here is Willie, a
pear-shaped man in light blue speedos and sunglasses who greets Stussy, when he
catches her, with "HELLO DARLING". On the way over he will let you know it is
windy, that it's raining, or that he is getting a beard trim tomorrow. His Pit
Vipers stay on throughout.

### The bonus item

There is a bonus item out on every level, worth 250. Picking it up sets Stussy
off — *guys look what I found!* — and brings a policeman out
at the far end.

In town the item is a single smart speaker, and the policeman comes after
Stussy, telling her it isn't hers. He steps over hedges like the rest of them
and runs from a complaint like the rest of them, and he is gone again next
level.

At the beach the item is a jar of Tumjal relish, and the policeman takes one
look at Willie and forgets all about the cat. He follows him up and down the
sand telling him to *put that away*, backing off whenever he closes, and never
gets him. He is no danger to Stussy at all on that level — she can walk straight
through him.

The item shows in the status bar while the policeman is out.

## Steering

Stussy steers like Pac-Man rather than a remote-control car: a tap points her
somewhere and she keeps going until she is turned or runs into something, where
she parks square on a tile until you point her somewhere else. She stands still
at the start of a level until you do.

Turns are buffered, so a corner asked for slightly early still happens — but the
request lapses after about half a second, rather than sitting in the queue and
turning her at some junction you have long since forgotten about.

## The rules in full

- **Nine mushrooms per level.** Clear them all to move on. Every level is a
  fresh maze, generated from the level number, so level 4 is always the same
  level 4.
- **Hedges** are low. The photographer and Maryellen step straight over them;
  Stussy has to go around.
- **Trees** are tall. Nobody gets through a tree, cat or human.
- **Complaining** empties the meter at 30 units a second out of 100. Let go and
  after a short pause it refills at 13 a second. Run it all the way down and
  Stussy loses their voice until the meter climbs back past 22 — so short, timed
  yowls beat one long one.
- **Getting caught** costs a Stussy. You start with three, plus one more every
  5,000 points. An enemy that is currently fleeing cannot catch you.
- **The bonus item** is out on every level and scores 250. It brings a policeman
  out for the rest of that level — after Stussy in town, after Willie at the
  beach.
- **Scoring:** 100 a mushroom, 25 each time you send someone running, and
  500 + 100 × level for clearing the garden.
- **They talk.** Get within seven tiles and they start on you — Maryellen wants
  to know where your rent is, the photographer threatens a bad review on
  Trademe or wonders about her white balance, Charteris Bay Man just tells Stussy
  to get lost, Willie has four observations about the weather and his grooming — and whoever catches Stussy
  gets the last word. Scare one off and it shuts up while it runs.
- **The two chasers behave differently.** The photographer heads straight for
  Stussy. Maryellen aims a few tiles ahead of where Stussy is going, trying to
  cut them off — so doubling back can beat her.

Later levels grow more hedges and the chasers get quicker.

## Layout

```
index.html      page shell, C64-ish framing, loads the four scripts
src/maze.js     level building: generated gardens, plus the two hand-drawn maps
src/sprites.js  all the art — characters and tiles drawn as rectangles
src/audio.js    WebAudio bleeps, synthesised on the fly
src/music.js    the soundtrack, sequenced live, plus the crack-screen wash
src/screens.js  the crack intro and the loading picture, both drawn
src/game.js     game loop, movement, chase AI, complaint meter, level themes,
                touch controls, HUD, screens
tests/          headless browser tests
```

Levels are themed rather than special-cased: a theme names the painters for the
ground, the low obstacles and the solid ones, the collectible, and who the
second chaser is, so a new level is a map plus a table entry.

Stussy moves in the Pac-Man style: walking along a corridor and turning when
near enough to a tile centre. The chasers step tile to tile, picking each
step from a breadth-first distance field over everything they can cross —
grass *and* hedges. When they are fleeing they read the same field backwards.

## The music

`src/music.js` sequences an original chiptune trance loop — 136 BPM,
four-on-the-floor kick, offbeat bass, a sixteenth-note arpeggio through an
i–VI–III–VII progression in A minor, a detuned supersaw hook, a dotted-eighth
delay, and a 32-bar arrangement that drops to a breakdown and builds back in on
a snare roll. Nothing is sampled: it is oscillators and a noise buffer,
scheduled a fraction of a second ahead of the audio clock so the timing does not
depend on the frame rate.

It starts with the game, stops when you pause, and `M` mutes it along with
everything else.

## Tests

The tests drive the real game in headless Chromium.

```bash
npm install playwright-core          # plus a Chromium build
CHROMIUM=/path/to/chrome node tests/boot.test.js         # 13 boot checks
CHROMIUM=/path/to/chrome node tests/rules.test.js        # 26 rule checks
CHROMIUM=/path/to/chrome node tests/steer.test.js        # 5 steering checks
CHROMIUM=/path/to/chrome node tests/sonos.test.js        # 9 bonus-item checks
CHROMIUM=/path/to/chrome node tests/beach.test.js        # 12 beach checks
CHROMIUM=/path/to/chrome node tests/mobile.test.js       # 11 touch checks
CHROMIUM=/path/to/chrome node tests/music.test.js        # 6 soundtrack checks
CHROMIUM=/path/to/chrome node tests/autoplay.test.js 90  # bot plays for 90s
```

`boot.test.js` covers the boot sequence: that the crack screen comes up first
and stays until SPACE (and only SPACE), that its bars really are rolling —
compared frame to frame — that the loading picture is actually drawn rather than
left black, that the wash plays under it and stops at the title, that the ten
seconds is ten seconds of wall clock, and that restarting skips the lot.

`rules.test.js` checks the things that make this game what it is: that Stussy
never ends up on a hedge or a tree, that the humans do cross hedges and don't
cross trees, the whole complaint-meter lifecycle including losing your voice,
scaring, capture, life loss, respawn, game over, restart, and that levels 1–12
each contain nine mushrooms Stussy can actually walk to. It also covers the two
hand-drawn levels: that they are themed and stocked correctly, that Charteris
Bay Man replaces Maryellen in the villa and says his piece, and that indoors the
hedge rule still bites — Stussy cannot cross the furniture while a chaser walks
straight over a sofa to reach her. It exits non-zero on failure.

`mobile.test.js` runs an emulated touch phone in landscape and drives the
on-screen controls: that the canvas fits the viewport, that the d-pad walks and
steers (including sliding the thumb between directions), that the complain
button drains the meter and scares a chaser, that walking and complaining work
together on two fingers, and that taps start and restart the game without the
d-pad corner swallowing them.

`steer.test.js` covers the Pac-Man steering: that she waits at the start, that
one tap carries her across the garden with nothing held, that she parks square
against a wall, that tapping back turns her around, and that a turn asked for
too early lapses instead of firing later.

`sonos.test.js` covers the bonus item: that it turns up on every level
(measured over 400 loads), that taking it scores and sets Stussy off, that a
policeman appears as a third chaser across the level rather than on top of her,
that he closes in, that yelling scares him too, and that he is gone next level.

`beach.test.js` covers level 4: that the jar out on the sand really is the
Tumjal drawing and really reaches the screen — the test reads the canvas pixels
back at the jar's tile and counts label purple and lid gold. It also covers that
it is the beach with nine rings, that
Willie's line on catching Stussy is right, that the jar of Tumjal brings a
policeman who chases *Willie* rather than her, that he trails without closing
and never troubles her, and that Willie can still catch her.

`music.test.js` taps the music bus with an analyser, records a loudness envelope
and autocorrelates it: the track has to be audible and to pulse on the beat at
136 BPM, the arrangement has to advance, pausing has to stop it and `M` has to
silence it.

`autoplay.test.js` runs a pathfinding bot that plays for real, clearing levels
while yelling at anyone who gets close — a check that a full session runs
without errors.
