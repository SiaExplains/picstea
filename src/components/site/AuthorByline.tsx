import Image from "next/image";
import Link from "next/link";
import { authorPath, type Author } from "@/content/authors";
import styles from "./site.module.css";

const date = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "By Siavash Ghanbari · Published 20 Oct 2026 · Updated 21 Oct 2026" under a post's title. */
export function AuthorByline({
  author,
  published,
  updated,
}: {
  author: Author;
  published: string;
  updated?: string;
}) {
  return (
    <span className={styles.byline}>
      <Image
        src={author.photo}
        alt=""
        width={28}
        height={28}
        className={styles.bylinePhoto}
        unoptimized
      />
      <span>
        By <Link href={authorPath(author)}>{author.name}</Link> · Published{" "}
        <time dateTime={published}>{date(published)}</time>
        {updated && updated !== published && (
          <>
            {" "}
            · Updated <time dateTime={updated}>{date(updated)}</time>
          </>
        )}
      </span>
    </span>
  );
}

/** Who wrote this, under each post. */
export function AuthorBox({ author }: { author: Author }) {
  return (
    <aside className={styles.authorBox} aria-label="About the author">
      <Image
        src={author.photo}
        alt={author.name}
        width={64}
        height={64}
        className={styles.authorPhoto}
        unoptimized
      />
      <div>
        <p className={styles.authorName}>
          <Link href={authorPath(author)}>{author.name}</Link>
        </p>
        <p>{author.short}</p>
      </div>
    </aside>
  );
}
