# 14 — Public site: redesign

Needs: chapters 04, 11, 13. Decision: `specs.md` D18.

The owner said on 2026-11-14: the site is chaotic, the basic data is not on the first screen, and the inner pages are boring. This chapter gives the three pages a new layout and one look. It does not change the facts in the text.

## What was wrong

- The top of the home page was a slider with 4 slides and 4 main titles.
- Phone, address and work hours were at the bottom only.
- The big calendar was in the middle of the page.
- The menu was different on each page. "Автосервиз" opened the calendar.
- All pages were default Bootstrap. The two inner pages had the same pattern.

## The design

- **Colours** come from the real station (photo `images/station.jpg`): blue roof, red sign letters. Navy and gold come from the logo. Each inner page changes one accent colour: amber for fuel, green for land.
- **Font:** Sofia Sans and Sofia Sans Extra Condensed. Open licence (OFL), made in Bulgaria, real Bulgarian letter forms. The files are in `site/fonts/`. No font service.
- **Home, top:** the old carousel stays exactly as it was: same markup, same font, same height (owner, 2026-11-14). `site.css` switches the new fonts off inside `#heroCarousel`. Do not restyle it.
- **Home, hours board:** a board that copies the price sign of the station. It shows the four services and the work hours. It says "Отворено сега" or "Затворено сега" (Sofia time; ГТП also reads `holidays.json`). It sits inside the "Намерете ни" section. That section has three columns: contacts, board, map (owner, 2026-11-14).
- **Home, order of sections (agreed with the owner, 2026-11-14):** carousel → about ("Семеен бизнес от Раковски", the core section) → station → ГТП (hours, check list, small calendar) → the two other businesses (photo links) → contact with the hours board and the map.
- **Menu and footer:** the same on all three pages. The menu starts with "Начало". No phone button in the menu (owner, 2026-11-14).
- **Fuel page:** full photo top, like the land page (title at the bottom on a dark fade, no box; owner, 2026-11-14). Then a product list like a price list, and town names as big text.
- **Land page:** full photo top. The title is at the bottom on a dark fade, with no box, so the photo stays visible (owner, 2026-11-14). Then three offers and numbered steps (they are a real order).

## Files

| File | Job |
|---|---|
| `site/css/site.css` | All styles of the public site. Loaded after Bootstrap. |
| `site/js/site.js` | Home page only: status, calendar, map. No visible text inside. |
| `site/fonts/` | Font files and `OFL.txt` (licence). |
| `site/images/station.jpg` | `eger2.jpg` made small (1400 px, 212 kB) for the top of the home page. |

Rule from the owner (2026-11-14): show a proposal and get an OK before a layout change. Do not remove or move a section without it.

## Steps

- [x] Write `site/css/site.css`. Put the fonts in `site/fonts/`.
- [x] New `index.html`: carousel on top, about section second, hours board in the contact section. (The first try removed the carousel and put the about section low. The owner did not agree. Fixed the same day.)
- [x] Move the script to `site/js/site.js`. No inline `onclick`. Tooltip texts are in the HTML. Day and time come from the Sofia time zone, from `Intl` parts.
- [x] New `goriva.html` and `zemya.html`. The demo text and `noindex` stay.
- [x] Same menu and footer in all three pages.
- [x] Text fix: the ГТП SMS note does not say "автоматично" (D4).
- [x] Remove the wrong turnover number "€ 2 100 00" from the about block.
- [x] Check at 1280 px and at 360 px: no side scroll on all three pages. No console error.
- [x] Owner looks at the three pages and says what to change.
- [x] Owner checks on a real phone and on the live URL after the push.

## Owner gives (not blocking)

- More photos for the carousel. Slides 1 and 2 show the same photo. Slide 3 uses a small photo (400 px). Slide 4 has no photo.

- Real photos: ГТП hall, car wash, gas for bottles, the people. The home page has one real photo now.
- The right work hours of the station. The sign on the photo says "0/24". The site says 06:00 – 22:00.
- Does the station sell A98? The sign on the photo shows it. The site does not.
- Real numbers for the about block ("3 000+", "29+").

## Done when

- The home page has the agreed order of sections. The hours board is in the contact section.
- All three pages have the same menu and footer and their own top block.
- No side scroll at 360 px. No 404 and no console error.
