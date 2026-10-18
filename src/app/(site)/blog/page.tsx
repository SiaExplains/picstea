import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/site/ContentPage";
import styles from "@/components/site/site.module.css";
import { visiblePosts } from "@/content/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides and explanations about editing images in the browser with Picstea.",
  alternates: { canonical: "/blog" },
  openGraph: { url: "/blog", title: "Picstea blog" },
};

export default function BlogIndex() {
  const posts = visiblePosts();
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ]}
      title="Blog"
      lead="Guides and explanations about editing images in your browser."
    >
      {posts.length === 0 ? (
        <p>The first articles are coming soon.</p>
      ) : (
        <ul className={styles.list}>
          {posts.map((post) => (
            <li key={post.slug}>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                {post.draft && " (draft)"}
              </h2>
              <p>{post.description}</p>
            </li>
          ))}
        </ul>
      )}
    </ContentPage>
  );
}
