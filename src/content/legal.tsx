import type { ReactNode } from "react";
import Link from "next/link";
import { ADSENSE_CLIENT, ADSENSE_CMP } from "@/lib/ads/adsense";

/**
 * Legal pages (docs/09 "Legal pages"). DRAFTS: they describe what Picstea actually does, but the
 * operator details are placeholders and the wording must be reviewed by a qualified lawyer.
 * Until `finalized` is set, each page shows a draft note and is not indexed.
 *
 * This is an engineering draft, not legal advice.
 */

export interface LegalPage {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly finalized: boolean;
  readonly body: () => ReactNode;
}

/** Ad consent is collected by Google's certified CMP instead of our banner (ADR-0024). */
const GOOGLE_CMP = !!ADSENSE_CLIENT && ADSENSE_CMP === "google";

const GoogleCmpNote = () =>
  GOOGLE_CMP ? (
    <p>
      Where the law requires it, consent for advertising is collected with Google&apos;s consent
      message, a Google-certified consent platform using the IAB Transparency and Consent Framework.
      It lets you accept or refuse personalised ads and choose individual purposes and vendors.
      &ldquo;Privacy settings&rdquo; at the bottom of every website page opens it again.
    </p>
  ) : null;

/** Visible marker for details only the operator can provide. */
function Todo({ children }: { children: ReactNode }) {
  return <mark>[TO COMPLETE: {children}]</mark>;
}

const OPERATOR = (
  <>
    <Todo>operator name or company</Todo>
    <br />
    <Todo>street and number</Todo>
    <br />
    <Todo>postcode, city, country</Todo>
    <br />
    Email: <Todo>contact email</Todo>
  </>
);

export const LEGAL: Record<"privacy" | "cookies" | "terms" | "imprint" | "sponsorship", LegalPage> =
  {
    privacy: {
      path: "/privacy",
      title: "Privacy policy",
      description:
        "How Picstea handles personal data: images stay on your device; what the website and its hosting process.",
      finalized: false,
      body: () => (
        <>
          <h2>Controller</h2>
          <p>{OPERATOR}</p>
          <h2>Summary</h2>
          <ul>
            <li>
              <strong>Your images and projects never leave your device.</strong> The editor runs in
              your browser and stores projects only in your browser&apos;s storage (IndexedDB). We
              cannot see, access or recover them.
            </li>
            <li>We do not require an account and do not use analytics.</li>
            <li>
              Google advertising on the website and blog is only loaded if you agree (see{" "}
              <Link href="/cookies">cookies</Link>). The editor never loads advertising code.
            </li>
          </ul>
          <h2>Hosting and server logs</h2>
          <p>
            The website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
            When you visit, the hosting provider processes technical data such as your IP address,
            the time, the page requested and your browser&apos;s user agent to deliver the site and
            keep it secure. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in a secure, working
            website). Data may be processed in the USA;{" "}
            <Todo>
              transfer mechanism, e.g. EU–US Data Privacy Framework / standard contractual clauses,
              and log retention period
            </Todo>
            .
          </p>
          <h2>Storage on your device</h2>
          <p>
            The editor stores your projects, images and a few preferences in your browser so they
            are there when you return. This is necessary for the service you request and is not
            transmitted to us. Details are in the <Link href="/cookies">cookie policy</Link>.
          </p>
          <h2>Advertising (only with consent)</h2>
          <p>
            If you accept advertising, website pages load Google AdSense from Google Ireland
            Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Google may set cookies or use
            similar technologies and process data such as your IP address to show and measure
            {GOOGLE_CMP ? " ads (personalised only if you agree)" : " non-personalised ads"}. Legal
            basis: your consent, Art. 6(1)(a) GDPR and § 25(1) TDDDG. You can withdraw consent at
            any time with &ldquo;Privacy settings&rdquo; at the bottom of every page. See
            Google&apos;s privacy policy:{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
              policies.google.com/privacy
            </a>
            .
          </p>
          <GoogleCmpNote />
          <h2>Sponsorships</h2>
          <p>
            Picstea&apos;s own sponsorships are plain images and links served from our site. They
            use no cookies and no tracking; we do not record who sees or clicks them.
          </p>
          <h2>Your rights</h2>
          <p>
            You have the right to access, rectification, erasure, restriction of processing, data
            portability and objection (Art. 15–21 GDPR), and to withdraw consent at any time. You
            may complain to a data protection supervisory authority, for example{" "}
            <Todo>competent authority for the operator&apos;s location</Todo>.
          </p>
          <h2>Contact</h2>
          <p>
            <Todo>contact email for privacy requests</Todo>
          </p>
        </>
      ),
    },
    cookies: {
      path: "/cookies",
      title: "Cookie policy",
      description: "What Picstea stores in your browser, why, and how to change your consent.",
      finalized: false,
      body: () => (
        <>
          <p>
            You can change your choice at any time with &ldquo;Privacy settings&rdquo; at the bottom
            of every website page.
          </p>
          <h2>Necessary (always on)</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Purpose</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>picstea</code>
                </td>
                <td>IndexedDB</td>
                <td>Your projects and images, saved in this browser by the editor.</td>
                <td>Until you delete them or clear site data</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.consent</code>
                </td>
                <td>Local storage</td>
                <td>Remembers your privacy choice.</td>
                <td>Until changed or cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.welcomeSeen</code>
                </td>
                <td>Local storage</td>
                <td>Remembers that you have seen the welcome dialog.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.view</code>
                </td>
                <td>Local storage</td>
                <td>Remembers your view settings: rulers, guides, grid and snapping.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.swatches</code>
                </td>
                <td>Local storage</td>
                <td>Remembers your colour swatches.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.actions</code>
                </td>
                <td>Local storage</td>
                <td>Remembers the actions you recorded (names and steps, no images).</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.recentSizes</code>
                </td>
                <td>Local storage</td>
                <td>Remembers the last few document sizes you created.</td>
                <td>Until cleared</td>
              </tr>
              <tr>
                <td>
                  <code>picstea.panelSizes</code>
                </td>
                <td>Local storage</td>
                <td>Remembers how wide and tall you made the editor&apos;s panels.</td>
                <td>Until cleared</td>
              </tr>
            </tbody>
          </table>
          <p>This data stays on your device and is never sent to us.</p>
          <h2>Analytics</h2>
          <p>Picstea currently uses no analytics.</p>
          <h2>Advertising (only with consent)</h2>
          <p>
            {GOOGLE_CMP
              ? "Google AdSense is loaded on website pages (never in the editor) to show its consent message, and uses advertising cookies only as your choice allows."
              : "If you accept advertising, Google AdSense is loaded on website pages (never in the editor)."}{" "}
            Google may set cookies such as <code>__gads</code>, <code>__gpi</code> or{" "}
            <code>IDE</code> to deliver and measure ads and prevent fraud. See{" "}
            <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer">
              how Google uses cookies in advertising
            </a>
            . <Todo>verify the current list of Google cookies and durations</Todo>
          </p>
          <GoogleCmpNote />
        </>
      ),
    },
    terms: {
      path: "/terms",
      title: "Terms of use",
      description: "The terms for using the Picstea image editor and website.",
      finalized: false,
      body: () => (
        <>
          <h2>The service</h2>
          <p>
            Picstea is a free, browser-based image editor provided by{" "}
            <Todo>operator name or company</Todo>. No account is needed. The editor runs on your
            device; we do not receive or store your images or projects.
          </p>
          <h2>Your content</h2>
          <p>
            You keep all rights to the images and projects you create or open. Because they are
            stored only in your browser, you are responsible for keeping copies (for example with
            File → Save Project As…). Browsers may delete their storage.
          </p>
          <h2>Acceptable use</h2>
          <p>
            Do not use Picstea to create or process content that is illegal or infringes the rights
            of others, and do not attempt to disrupt or attack the website.
          </p>
          <h2>Availability and warranty</h2>
          <p>
            Picstea is provided free of charge and without guarantee of availability or fitness for
            a particular purpose. <Todo>liability clause under applicable (German) law</Todo>
          </p>
          <h2>Changes</h2>
          <p>We may update these terms; the current version is always on this page.</p>
          <h2>Governing law</h2>
          <p>
            <Todo>governing law and place of jurisdiction</Todo>
          </p>
        </>
      ),
    },
    imprint: {
      path: "/imprint",
      title: "Imprint (Impressum)",
      description: "Legal information about the operator of Picstea.",
      finalized: false,
      body: () => (
        <>
          <h2>Information according to § 5 DDG</h2>
          <p>{OPERATOR}</p>
          <p>
            <Todo>
              phone (or another fast contact), commercial register and number, VAT ID (if any),
              authorised representative (for companies)
            </Todo>
          </p>
          <h2>Responsible for content according to § 18(2) MStV</h2>
          <p>
            <Todo>name and address</Todo>
          </p>
          <h2>EU dispute resolution</h2>
          <p>
            <Todo>
              statement on consumer dispute resolution (participation or non-participation)
            </Todo>
          </p>
        </>
      ),
    },
    sponsorship: {
      path: "/sponsorship",
      title: "Advertising and sponsorship",
      description:
        "How advertising and sponsorships work on Picstea, how they are labelled, and how to sponsor Picstea.",
      finalized: false,
      body: () => (
        <>
          <h2>How Picstea is funded</h2>
          <p>
            Picstea is free. It is funded by advertising on the website and blog, and by
            sponsorships.
          </p>
          <h2>Labelling</h2>
          <ul>
            <li>
              Google ads are labelled &ldquo;Advertisement&rdquo; and appear only on website pages,
              and only if you agree.
            </li>
            <li>
              Sponsorships are labelled &ldquo;Sponsored&rdquo;. One sponsorship may appear on the
              editor&apos;s start screen, never over the canvas, tools or your work.
            </li>
            <li>Sponsor links are marked as sponsored for search engines.</li>
          </ul>
          <h2>No tracking, no targeting by your work</h2>
          <p>
            Sponsorships are plain images and links. We do not use cookies or tracking for them, and
            advertising is never chosen based on the images you edit — the editor never sends them
            anywhere.
          </p>
          <h2>Sponsor Picstea</h2>
          <p>
            Interested in reaching people who create and edit images? Contact{" "}
            <Todo>sponsorship contact email</Todo>.
          </p>
        </>
      ),
    },
  };
