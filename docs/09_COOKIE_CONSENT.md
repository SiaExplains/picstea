# 09 — Cookies, Consent & Privacy Controls

Picstea targets users in Europe, including Germany.

Cookie/consent implementation must be treated as a product requirement, not a late marketing addition.

## Important principle

Do not load non-essential tracking/advertising technologies before the appropriate user consent is obtained where consent is legally required.

## Categories

Separate:

### Necessary

Examples:

- security
- basic application functionality
- consent preference storage

### Analytics

Examples:

- traffic analytics
- usage measurement

### Advertising

Examples:

- Google advertising technologies
- personalized advertising where applicable
- third-party advertising cookies/storage

### Custom advertising

Picstea's own sponsorship technology must have a documented privacy basis and should not silently become behavioral tracking.

## Consent UI

Implement:

- first-visit consent banner
- Accept all
- Reject non-essential
- Manage preferences
- category descriptions
- persistent privacy settings
- ability to change consent later

Do not use dark patterns.

## Consent architecture

Create:

```text
ConsentManager
 ├── ConsentState
 ├── ConsentBanner
 ├── ConsentPreferences
 ├── ConsentStorage
 └── VendorLoader
```

Third-party scripts should be loaded through controlled wrappers.

Example:

```ts
if (consent.analytics) {
  loadAnalytics()
}

if (consent.advertising) {
  loadAdvertising()
}
```

## Do not hardcode vendor assumptions

Google Ads, Analytics, Tag Manager and future vendors must be replaceable.

Use a vendor registry:

```ts
interface ConsentVendor {
  id: string
  category: ConsentCategory
  load(): Promise<void>
}
```

## Legal pages

At minimum prepare:

- Privacy Policy
- Cookie Policy
- Terms of Use
- Imprint / Impressum where applicable
- Advertising/Sponsorship disclosure

The exact legal wording should be reviewed by a qualified legal/privacy professional.

This handbook is an engineering specification, not legal advice.
