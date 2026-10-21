import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentPage } from "@/components/site/ContentPage";
import styles from "@/components/site/site.module.css";
import { AUTHORS, authorBySlug, authorPath } from "@/content/authors";
import { publishedPosts } from "@/content/blog";
import { profilePage } from "@/lib/seo/jsonld";

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/authors/[slug]">): Promise<Metadata> {
  const author = authorBySlug((await params).slug);
  if (!author) return {};
  const path = authorPath(author);
  return {
    title: author.name,
    description: author.short,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({
      url: path,
      title: author.name,
      description: author.short,
      type: "profile",
    }),
  };
}

/** The URL is read inside Suspense so the route's shared shell doesn't depend on it. */
export default function AuthorPage({ params }: PageProps<"/[lang]/authors/[slug]">) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}

/** Who writes the guides (docs/10 "E-E-A-T"): photo, bio, profiles elsewhere and every post. */
async function Profile({ params }: Pick<PageProps<"/[lang]/authors/[slug]">, "params">) {
  const author = authorBySlug((await params).slug);
  if (!author) notFound();
  const path = authorPath(author);
  // Every post is by the one author for now (DEFAULT_AUTHOR).
  const posts = publishedPosts();
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: author.name, path },
      ]}
      title={author.name}
      structuredData={[profilePage(author)]}
    >
      <div className={styles.authorProfile}>
        <Image
          src={author.photo}
          alt={author.name}
          width={160}
          height={160}
          className={styles.authorPhoto}
          unoptimized
          priority
        />
        <ul>
          {author.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} rel="me noopener" target="_blank">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p>{author.bio}</p>
      <h2>Guides by {author.name}</h2>
      <ul>
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
