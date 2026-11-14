# 11 — Public site: land page

Needs: chapter 04. Decision: `specs.md` D14.

**Status 2026-11-14: demo page built.** The text is invented by the developer. The photos are stock photos (manufacturer and web photos), not the company's own. The owner chose this so that the owners see a demo and then give real text and photos. The page has `<meta name="robots" content="noindex">`, so Google does not list it. Replace text and photos before chapter 12 removes `noindex`.

ЕГЕР ООД also cultivates and buys agricultural land. This work gets its own page, `site/zemya.html`. The main page gets a short section with a link to it.

## Owner gives first

- [ ] The real text (demo text is in place): what the company offers (cultivation, buying land, rent/аренда, other), the area (villages, municipalities), who to call.
- [ ] Phone and email for land questions, if they are not the ones in `specs.md` D8.
- [ ] Real photos (stock photos are in place for the demo). Each photo in `site/images/land/` must be the company's own photo, or have a licence that allows use on a website. The repo is public, so a photo there is published. All three demo photos (`harvest.jpg`, `tillage.jpg`, `field-check.jpg`) are not the company's own. Replace them all.

## Steps

- [x] Rename the photos to plain Latin names (`specs.md` section 4). Example: `site/images/land/tractor.jpg`.
- [x] Resize the photos (chapter 12, B3). `harvest.jpg` is now 1400 × 933 px, 320 kB.
- [x] Make `site/zemya.html`. Same navbar, footer, and look as `index.html`. Its own `<title>` and description.
- [x] Navbar on both pages: a link `Земеделие` to `zemya.html`. Link back to `index.html`.
- [x] Main page: a short section with 1–2 sentences and a button to `zemya.html`.
- [x] All paths relative. Check at 360 px width.
- [x] Pages workflow: no change. It publishes all of `site/`.
- [ ] Owner opens the live URL and shows the demo to the owners.

## Done when

- `zemya.html` opens from the main page and back, on GitHub Pages.
- No 404 in the browser network tab.
- No side scroll at 360 px.
