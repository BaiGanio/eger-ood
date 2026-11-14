# 12 — SEO (search engine optimization)

Needs: chapter 11 (land page), so that SEO covers both pages. Do this chapter last on the public site.

Goal: people who search Google for a ГТП, gas, a car wash, or farm land near Раковски find ЕГЕР ООД.

For a local business, most visits come from the Google Maps card (Google Business Profile), not from the web page. So part A (accounts) gives more than part B (code).

## Rules for this chapter

- `specs.md` section 4 stays true: no tracking, no cookies, no form. So: **no Google Analytics, no Facebook Pixel, no Google Tag Manager.** Search Console gives search data without code on the page.
- Name, address, and phone (NAP) must be **exactly the same** text everywhere: the site, the structured data, Google, Bing, Apple, every directory. Google compares them. Use this text:
  - Name: `ЕГЕР ООД`
  - Address: `ул. Брезовско шосе, 4150 Раковски, обл. Пловдив` (owner checks the post code and the street before step A1)
  - Phones: `0887979373`, `031514709` (`specs.md` D8)
- Hours (`specs.md` D7): Tuesday–Friday 08:00–18:00, Saturday 09:00–14:00, Sunday and Monday closed. Owner confirms if the gas station has other hours than the ГТП.
- Do not invent text, numbers, or reviews.

## Part A — Accounts and registrations (owner does them)

Use **one Google account for the company** (not a private one). Give the developer "Manager" access, not "Owner". Keep the passwords out of the repo.

| # | Service | Where | What it gives | When |
|---|---|---|---|---|
| A1 | Google Business Profile | https://business.google.com | The card on Google Search and Google Maps: pin, hours, phone, photos, reviews. **The most important step.** | Now. It does not need the domain. |
| A2 | Google Search Console | https://search.google.com/search-console | Shows which searches find the site, errors, and lets you send the sitemap. | Now for the GitHub Pages URL. Again for the domain. |
| A3 | Bing Webmaster Tools | https://www.bing.com/webmasters | The same for Bing, DuckDuckGo, and some AI search tools. It can import the sites from Search Console in one click. | After A2. |
| A4 | Bing Places | https://www.bingplaces.com | The Bing Maps card. It can import from Google Business Profile. | After A1. |
| A5 | Apple Business Connect | https://businessconnect.apple.com | The Apple Maps card (iPhone users). | After A1. |
| A6 | Domain + Cloudflare | Domain: a registrar for `.bg` (example: https://www.register.bg). Hosting: https://dash.cloudflare.com | The real address of the site (`specs.md` D3). | Later. Part D. |

### A1 — Google Business Profile, how to

1. Sign in with the company Google account. Search for "ЕГЕР ООД Раковски" on Google Maps first. A card can already exist (made by Google or by a customer). If it exists, click "Claim this business". Do not make a second card.
2. Main category: `Станция за технически преглед на МПС` (vehicle inspection service). Extra categories: `Бензиностанция`, `Автомивка`, `Пункт за пълнене на газови бутилки` (pick the nearest names Google offers).
3. Put the pin on the exact place. Enter NAP and hours exactly as above. Add holiday hours each year (use `site/holidays.json`).
4. Website: the GitHub Pages URL now. Change it to the domain later.
5. Verify. Google asks for a video of the place (sign, entrance, a work tool) or sends a postcard with a code. This can take days or weeks.
6. Add real photos: front, sign, station, inspection hall, car wash. At least 5.
7. Ask happy customers for a review. Answer every review, also the bad ones, politely and in Bulgarian.
8. The land work (chapter 11) is a different service. Add it as a "Service" or a "Product" on the same card. Make a second card only if the land office has its own address and staff (Google rule).
9. Send the developer the **pin link**: Google Maps → open the company card → "Share" (Сподели) → "Copy link" (Копиране на връзката). It looks like `https://maps.app.goo.gl/...`. Paste it in a chat or an email. It is not a secret. The developer puts it in the two map buttons of `site/index.html` (search for `google.com/maps`) and in `sameAs` (B4).

### A1 — Text to send to the owners (Bulgarian)

The owners make the profile with their own Google account. Copy this text to them.

> **Как да направите профил на ЕГЕР ООД в Google (Google Business Profile)**
>
> Профилът показва фирмата в Google Търсене и Google Maps: точка на картата, работно време, телефон, снимки и отзиви. Безплатен е. Отнема около 20 минути, плюс няколко дни за проверка от Google.
>
> 1. Използвайте Google акаунт (Gmail) на фирмата, не личен. Ако няма — направете нов на https://accounts.google.com.
> 2. Отворете Google Maps и потърсете „ЕГЕР ООД Раковски“. Ако фирмата вече излиза, натиснете „Заявете собственост върху този бизнес“. Не правете втори профил.
> 3. Ако не излиза: отворете https://business.google.com и натиснете „Управление на сега“ / „Добавяне на бизнес“.
> 4. Име: **ЕГЕР ООД**. Основна категория: пункт за технически преглед на МПС. Добавете и: бензиностанция, автомивка, газови бутилки.
> 5. Адрес: **ул. Брезовско шосе, 4150 Раковски, обл. Пловдив**. Сложете точката на картата точно на входа.
> 6. Телефон: **0887979373**. Уебсайт: адресът, който ще ви даде разработчикът.
> 7. Работно време (ГТП): вторник – петък 08:00 – 18:00, събота 09:00 – 14:00, неделя и понеделник — почивни. Горивната станция: всеки ден 06:00 – 22:00 (ако е различно, пишете).
> 8. Проверка: Google ще поиска кратко видео на място (табела, вход, работно място) или ще изпрати писмо с код по пощата. Следвайте указанията.
> 9. Качете поне 5 истински снимки: фасада, табела, станция, пункт за преглед, автомивка.
> 10. Добавете разработчика като **Мениджър** (Настройки → Хора и достъп). Не като Собственик.
> 11. Изпратете на разработчика връзката към фирмата в Google Maps: отворете профила → „Сподели“ → „Копиране на връзката“.
>
> Отговаряйте учтиво на всеки отзив — и на добрите, и на лошите.

### A2 — Search Console, how to

1. "Add property" → type **URL prefix** → `https://baiganio.github.io/eger-ood/`.
2. Verify with the **HTML tag** method. Google gives one `<meta name="google-site-verification" ...>` line. The developer adds it to the `<head>` of `site/index.html`. It is not a secret. It can be in the public repo.
3. After the push: click "Verify".
4. Sitemaps → submit `https://baiganio.github.io/eger-ood/sitemap.xml` (step B6).
5. URL inspection → paste the page URL → "Request indexing". Do it for each page.
6. Look at the "Performance" report once a month.

## Part B — Code on the site (developer does it)

Do each step on `site/index.html` and on the land page. Check each change at 360 px width (`specs.md` section 4).

### B1 — Title and description

- One `<title>` and one `<meta name="description">` per page. Each page has its own text.
- Title: the main search words first, 50–60 characters. Example: `ГТП и горивна станция в Раковски | ЕГЕР ООД`.
- Description: 120–155 characters. Say what, where, and how to call.
- Land page example: `Обработка и покупка на земеделска земя в Раковски | ЕГЕР ООД`. Use the owner's real text.

### B2 — Headings

- **Exactly one `<h1>` per page.** Now the carousel has four (`index.html:57`, `:74`, `:91`, `:108`). Keep `<h1>` on the first slide. Change the others to `<h2>` with the same classes. The look does not change.
- Then `<h2>` for each section, `<h3>` inside a section. No skipped levels.
- Use the words people search for in the headings: "Годишен технически преглед", "Раковски", "газ бутилки", "автомивка".

### B3 — Images

- The carousel photos are CSS `background-image`. Google does not read them, and they have no `alt` text. Change the first slide to a real `<img>` with `alt`, `width`, `height`, and `fetchpriority="high"`. Use `object-fit: cover` to keep the look.
- Every `<img>` gets an `alt` text in Bulgarian that says what is in the photo. Example: `Пункт за ГТП на ЕГЕР ООД в Раковски`.
- Every `<img>` below the first screen gets `loading="lazy"`.
- Resize before you commit. Largest width 1600 px for a full-width photo, 800 px for a card. Quality about 80. Target below 250 kB per photo.
  - On a Mac, no install: `sips --resampleWidth 1600 -s formatOptions 80 eger2.jpg --out eger2.jpg`
  - Or by hand: https://squoosh.app (runs in the browser, the file stays on your computer).
- `site/images/eger2.jpg` is 2592 × 1944 px, 870 kB. `site/images/land/CIH_Magnum_405_DJI_.jpg` is 2272 × 1515 px, 950 kB. Resize both.
- Note: ImgBot (a GitHub app) is **not** installed on this repo. Even with it, ImgBot only makes the same image smaller without loss (often 5–15 %). It does not change the size in pixels. The resize is the big win. ImgBot is optional after that.

### B4 — Structured data (JSON-LD)

A small hidden block in `<head>`. It tells Google the name, address, hours, and phone in a form a machine reads. It is not visible on the page, so it does not break the "all visible text in HTML" rule.

- Type: `["AutoRepair", "GasStation", "AutoWash"]` on the main page. Fields: `name`, `url`, `logo`, `image`, `telephone` (`+359887979373`), `address` (`PostalAddress`), `geo` (latitude, longitude from the Google pin), `openingHoursSpecification` (hours above), `sameAs` (the Google Maps link from A1).
- Land page: a `Service` with `provider` = the same company and `areaServed` = the area from the owner.
- The values must match the visible text and the Google card (NAP rule).
- Test: https://search.google.com/test/rich-results and https://validator.schema.org. Both must show no error.

### B5 — Share preview (Open Graph)

Viber, Facebook, and Messenger show a card when someone sends the link.

- Per page: `og:title`, `og:description`, `og:type` = `website`, `og:url`, `og:image`, `og:locale` = `bg_BG`.
- `og:image`: one photo 1200 × 630 px, below 300 kB, for example `site/images/share.jpg`. It must be a **full URL** (`https://...`), not a relative path. This is the one exception to the "relative paths" rule. Write it down in `specs.md` section 4 before you add it. Change it when the domain comes (part D).
- Test: https://developers.facebook.com/tools/debug/ (needs a Facebook login) or send the link to yourself in Viber.

### B6 — sitemap.xml and robots.txt

- `site/sitemap.xml`: a list of the page URLs (full URLs). Two lines now: the main page and the land page. Add a page = add a line.
- `site/robots.txt`: allow all, point to the sitemap.
- **Catch:** robots.txt works only at the root of a domain. On GitHub Pages the site lives at `baiganio.github.io/eger-ood/`, so a robots.txt there is not read. The sitemap still works when you submit it in Search Console (A2 step 4). So: add `sitemap.xml` now. Add `robots.txt` with the domain (part D).

### B7 — Canonical URL

- Each page gets `<link rel="canonical" href="https://...full URL of this page">`. It tells Google which address is the real one. It matters in part D, when the same page lives at two addresses.

### B8 — Speed (Core Web Vitals)

Google ranks slow phone pages lower.

- Test each page at https://pagespeed.web.dev (choose "Mobile"). Target: 90+ for Performance, Accessibility, Best Practices, SEO.
- Most gain comes from B3 (images).
- Add `width` and `height` to images, so the page does not jump while it loads.
- Load only the Bootstrap parts that are used, if the score asks for it. Keep the CDN (`specs.md` D10).
- Fix the double `background-image` on each slide (see `progress.md`, ch04).

### B9 — Content and words

- Write the words that people type into Google. Examples: "ГТП Раковски", "технически преглед Раковски", "газ бутилки Раковски", "автомивка Раковски", "земеделска земя Раковски", "аренда земя Брезово". Owner checks which services are real.
- Put them in normal sentences in titles, headings, and the first paragraph. Do not repeat a word many times. Google punishes that.
- Name the nearby villages and towns the company serves (Раковски, Брезово, the villages around). Only the true ones.
- Main page links to the land page, and back. Use link text that says what it is (`Земеделска дейност`), not `тук`.

### B10 — Basic checks

- `<html lang="bg">` on each page (main page has it).
- Every link and button has text or an `aria-label`.
- Phone numbers are `tel:` links (done in ch04).
- No broken link. No image 404 in the browser network tab.

## Part C — After launch (owner, once a month, 10 minutes)

- Search Console → Performance: which searches bring visitors.
- Search Console → Pages: any error.
- Google Business Profile: new reviews (answer them), new questions, photos from customers.
- Every January: holiday hours in Google Business Profile, after `tools/update-holidays.mjs` runs.

## Part D — Move to the domain (later, `specs.md` D3)

1. Buy the domain (A6). Set up Cloudflare Pages from this repo, folder `site/`.
2. Change all full URLs: canonical (B7), `og:url`, `og:image` (B5), sitemap (B6), JSON-LD `url` (B4).
3. Add `site/robots.txt` (B6).
4. Search Console: add the new domain as a **Domain** property (DNS check in Cloudflare). Submit the new sitemap.
5. The old GitHub Pages address: turn Pages off in the repo settings after the new site works, or keep it with the canonical pointing to the domain. Do not keep two full live copies without canonical.
6. Change the website link in Google Business Profile, Bing Places, Apple Business Connect.

## Steps

- [ ] A1 Google Business Profile (owner)
- [ ] A2 Search Console + verification tag (owner + developer)
- [ ] A3 Bing Webmaster Tools (owner)
- [ ] A4 Bing Places (owner)
- [ ] A5 Apple Business Connect (owner)
- [ ] B1 Titles and descriptions
- [ ] B2 One `<h1>` per page
- [ ] B3 Images: resize, `alt`, lazy load, real `<img>` for the first slide
- [ ] B4 JSON-LD, tested with no error
- [ ] B5 Open Graph + share image
- [ ] B6 `sitemap.xml`, submitted
- [ ] B7 Canonical
- [ ] B8 PageSpeed mobile 90+
- [ ] B9 Text with the search words (owner checks the text)
- [ ] B10 Basic checks
- [ ] Part D when the domain exists

## Done when

- Google Business Profile is verified and shows the right hours and phone.
- Search Console shows both pages as "indexed".
- Rich Results Test shows no error on both pages.
- PageSpeed Insights (mobile) shows 90+ in all four scores on both pages.
- A link sent in Viber shows the share card with the photo.
