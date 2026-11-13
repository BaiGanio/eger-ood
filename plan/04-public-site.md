# 04 — Public site: static and on GitHub Pages

Needs: chapter 03. Open questions: Q1, Q2, Q6 in `README.md`.

## Findings to fix

| Finding | Where |
|---|---|
| The calendar calls `/api/holidays`. There is no server on GitHub Pages. | `index.html:502` |
| Phone link is `tel:+359888000000`, visible text is `0887979373`. | `index.html:428` |
| Phone link is `tel:+359888000001`, visible text is `031514709`. | `index.html:429` |
| Email link is `info@eger.bg`, visible text is `eger@b-trust.org`. | `index.html:451` |
| Old comments talk about placeholder images. | `index.html:55`, `:140` |
| Image file names have Cyrillic letters and a space (`Technical inspection.jpg`). They work, but they are fragile in URLs. | `images/` |

## Steps
- [ ] Create `site/holidays.json`: `{ "holidays": ["2027-01-01", ...] }` with the Bulgarian public holidays.
- [ ] Change the calendar script to `fetch('holidays.json')` (relative path).
- [ ] Fix the phone and email links to match the visible text (confirm Q6 first).
- [ ] Rename image files to plain Latin names without spaces. Update the references.
- [ ] Check that every path in `index.html` is relative.
- [ ] Add a page title, a description meta tag, and a favicon.
- [ ] Remove the old placeholder comments.
- [ ] Add a GitHub Actions workflow `.github/workflows/pages.yml` that publishes the `site/` folder. (The simple Pages setting can only publish the repo root or `/docs`, not `/site`.)
- [ ] In the GitHub repo settings: Pages → Source → "GitHub Actions".
- [ ] Open the live URL. Check images, calendar, phone links on a phone.

## Design notes
- Keep Bootstrap from the CDN. No build step.
- No form, no tracking, no cookies. Then no cookie banner is necessary.
- Later item (not now): a custom domain.

## Done when
- The live GitHub Pages URL shows the full page.
- The browser network tab shows no failed request.
- A tap on the phone number starts a call to the correct number.
