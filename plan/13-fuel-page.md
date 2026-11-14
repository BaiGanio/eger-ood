# 13 — Public site: fuel and lubricants page

Needs: chapter 04. Decision: `specs.md` D16.

ЕГЕР ООД sells fuels and lubricants wholesale. This work gets its own page, `site/goriva.html`.

**Status 2026-11-14: demo page built.** The client list (Раковски, Брезово, НЕК ЕАД regions) comes from the main page. The rest of the text is invented by the developer (products, delivery by tanker, "why us"). The page has `<meta name="robots" content="noindex">`.

Photos in `site/images/energy/`:

| File | Source |
|---|---|
| `barrels.jpg` | Looks like the company's own photo (Viber, 2023). Owner confirms. Resized to 1200 px, 220 kB. |
| `warehouse.jpg` | Unknown. Owner confirms. |
| `pumps.jpg` | Stock photo. Replace. |

`barrels.jpg` shows other companies' brand names on the barrels (Castrol, Газпром, Texaco Delo). Owner decides if that is fine.

## Owner gives first

- [ ] Real text: which fuels and oils, minimum order, delivery (own tanker or not), area, who to call.
- [ ] Photo rights for each photo above.

## Steps

- [x] Rename the photos to Latin names. Delete the duplicate `odit7 (1).jpg`.
- [x] Make `site/goriva.html` with the same look as `zemya.html`.
- [x] Links: navbar and footer on `index.html`, navbar on `zemya.html`, card in the "Още от ЕГЕР ООД" section on `index.html`.
- [x] Check at 360 px: no side scroll.
- [ ] Replace demo text and photos. Then chapter 12 removes `noindex`.

## Done when

- `goriva.html` opens from the main page and back, on GitHub Pages.
- No 404 in the browser network tab.
- No side scroll at 360 px.
