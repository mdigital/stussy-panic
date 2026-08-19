Stussy64.ttf is an original pixel font drawn for Stussy Panic: an 8x8,
double-stroke face in the C64 idiom, designed from scratch for this game (no
character ROM or existing font was used). Public domain (CC0).

make-font.py is its source. Every glyph is an 8x8 bitmap in that file: rows 0-6
sit above the baseline, row 7 is the single descender row. Edit the bitmaps and
regenerate with:

    pip install fonttools
    python3 assets/fonts/make-font.py

Notes on the awkward glyphs, learned the hard way:
  - m's top bar must span the full width of its three stems, or it reads as 'rn'
  - w and W need the middle peak run most of the way up, or they read as u
  - p, q and g close their bowls on the baseline (row 6), like the o
  - y and g descend through the baseline and hook, rather than sitting a
    detached bar underneath
