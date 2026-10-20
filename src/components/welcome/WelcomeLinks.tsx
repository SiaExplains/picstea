import { publishedPosts } from "@/content/blog";
import { LocalLink } from "@/components/site/LocalLink";

/** "Learn more" links in the welcome dialog: open in a new tab, in the page's language. */
export function WelcomeLinks({ links }: { links: readonly (readonly [string, string])[] }) {
  return (
    <ul>
      {links.map(([href, label]) => (
        <li key={href}>
          <LocalLink href={href} target="_blank" rel="noopener" prefetch={false}>
            {label}
          </LocalLink>
        </li>
      ))}
    </ul>
  );
}

/** The three newest blog posts (English). */
export function LatestPosts() {
  const posts = [...publishedPosts()]
    .sort((a, b) => (b.updated ?? b.published).localeCompare(a.updated ?? a.published))
    .slice(0, 3);
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener">
            {post.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
