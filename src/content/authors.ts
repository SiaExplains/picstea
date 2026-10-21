/**
 * The people who write Picstea's guides (docs/10 "E-E-A-T"). Shown as bylines and an author box
 * on blog posts, on /authors/<slug>, and as Person structured data. Photos are self-hosted in
 * /public/authors (the site's CSP allows only its own images).
 */
export interface Author {
  readonly slug: string;
  readonly name: string;
  readonly photo: string;
  /** One sentence, under each post. */
  readonly short: string;
  /** A short paragraph, on the author page. */
  readonly bio: string;
  /** Profiles that are the same person (`sameAs`, `rel="me"`). */
  readonly links: readonly { readonly label: string; readonly url: string }[];
}

export const AUTHORS: readonly Author[] = [
  {
    slug: "siavash-ghanbari",
    name: "Siavash Ghanbari",
    photo: "/authors/siavash-ghanbari.jpg",
    short: "Siavash Ghanbari builds Picstea and explains technology on YouTube (SiaBarry).",
    bio: "Siavash Ghanbari builds Picstea, the free photo editor that runs in your browser and keeps your images on your device, and FocusCrew, an app for doing focused work together. On the SiaBarry YouTube channel, Siavash explains technology and software in plain English. Every guide on this blog is written and checked against the editor itself.",
    links: [
      { label: "YouTube (SiaBarry)", url: "https://www.youtube.com/@SiaBarry" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/siavash-ghanbari/" },
    ],
  },
];

/** Every post is by the founder until a second author exists. */
export const DEFAULT_AUTHOR = AUTHORS[0];

export const authorBySlug = (slug: string) => AUTHORS.find((a) => a.slug === slug);

export const authorPath = (author: Author) => `/authors/${author.slug}`;
