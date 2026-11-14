# 11 — Public site: land page

Needs: chapter 04. Decision: `specs.md` D14.

ЕГЕР ООД also cultivates and buys agricultural land. This work gets its own page, `site/zemya.html`. The main page gets a short section with a link to it.

## Owner gives first

- [ ] The text: what the company offers (cultivation, buying land, rent/аренда, other), the area (villages, municipalities), who to call.
- [ ] Phone and email for land questions, if they are not the ones in `specs.md` D8.
- [ ] Image rights. Each photo in `site/images/land/` must be the company's own photo, or have a licence that allows use on a website. The repo is public, so a photo there is published. Two file names look like downloads from other sites: `780x440.jpg`, `fenix-fo-5000_2013-hnojice_img_1976_830x470px.jpg`. Replace them if they are not the company's own.

## Steps

- [ ] Rename the photos to plain Latin names (`specs.md` section 4). Example: `site/images/land/tractor.jpg`.
- [ ] Resize the photos (chapter 12, B3). `CIH_Magnum_405_DJI_.jpg` is 2272 × 1515 px, 950 kB.
- [ ] Make `site/zemya.html`. Same navbar, footer, and look as `index.html`. Its own `<title>` and description.
- [ ] Navbar on both pages: a link `Земеделие` to `zemya.html`. Link back to `index.html`.
- [ ] Main page: a short section with 1–2 sentences and a button to `zemya.html`.
- [ ] All paths relative. Check at 360 px width.
- [ ] Add the page to the Pages workflow check (the workflow publishes all of `site/`, so no change is expected).

## Done when

- `zemya.html` opens from the main page and back, on GitHub Pages.
- No 404 in the browser network tab.
- No side scroll at 360 px.
