# Launch checklist — things done outside the code

Everything here happens in dashboards (Vercel, Google, Bing, AdSense) or needs the operator's
details. The code side is finished unless a step says otherwise. Last checked: 2026-10-19.

## Domains (Vercel)

- [x] `www.picstea.com` is the production domain; `picstea.com` redirects to it (308).
- [x] `NEXT_PUBLIC_SITE_URL=https://www.picstea.com` in Production, redeployed. Verify any time:
      `https://www.picstea.com/sitemap.xml` — every `<loc>` starts with `https://www.picstea.com/`.
- [ ] **Redirect `mylper.com` and `www.mylper.com`** to `https://www.picstea.com` (308, keep the
      path). Today `mylper.com` returns 404, so old links and Google results for it are lost.
      In Vercel: add both domains to the project → Edit → "Redirect to" `www.picstea.com`.

## Google Search Console (also feeds Gemini)

- [x] Domain property `picstea.com` verified.
- [ ] Remove the `https://picstea.com/sitemap.xml` row (it redirects, so it can't be fetched).
- [ ] Resubmit `https://www.picstea.com/sitemap.xml` and check it reads 59 URLs without errors.
- [ ] After the mylper.com redirect is live: in the old `mylper.com` property, Settings →
      Change of address → `picstea.com`.
- [ ] URL Inspection → Request indexing for `/`, `/online-photo-editor`, `/psd-editor`,
      `/photoshop-alternative`, `/photopea-alternative`, `/faq`, `/png-editor`, `/jpeg-editor`,
      `/webp-editor`, `/image-resizer`, `/image-compressor`, `/photo-filters`.

## Bing Webmaster Tools (feeds ChatGPT search and Copilot)

- [ ] Add the site (import from Google Search Console is fastest) and submit the sitemap.

## Legal pages (needed for search trust and AdSense)

- [ ] Send the operator details: name or company, address, email, phone, VAT ID (if any),
      data-protection authority, governing law, dispute-resolution statement.
- [ ] Code: fill `src/content/legal.tsx`, set `finalized: true` (pages become indexed and enter the
      sitemap). A lawyer or a generator such as eRecht24 should check the wording.

## Google AdSense (ADR-0024)

- [ ] Create the account, add `picstea.com`; set `NEXT_PUBLIC_ADSENSE_CLIENT` in Vercel
      (Production), redeploy; verify with the meta tag or `/ads.txt`.
- [ ] After approval: create a responsive display unit → `NEXT_PUBLIC_ADSENSE_SLOT`, redeploy.
- [ ] Privacy & messaging → publish the European regulations message for picstea.com, then
      `NEXT_PUBLIC_ADSENSE_CMP=google`, redeploy.

## Brand profiles (optional)

- [ ] Social profiles (X, YouTube, Instagram, LinkedIn…): send the URLs; they go into the
      Organization structured data (`sameAs`) and the footer.
- [ ] GitHub repository: set the website to `https://www.picstea.com`.

## After launch — check weekly for a month

- [ ] Search Console → Pages: indexed count rising, no "Duplicate, Google chose different
      canonical" for picstea pages.
- [ ] Search Console → Core Web Vitals: all good URLs.
- [ ] `https://www.picstea.com/llms.txt` loads and lists the current features.
