import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdSlot } from "@/components/site/AdSlot";
import { ContentPage } from "@/components/site/ContentPage";
import { postBySlug, publishedPosts } from "@/content/blog";
import { article } from "@/lib/seo/jsonld";

/** Only published posts are built; drafts and unknown slugs are 404 in production. */
export function generateStaticParams() {
  const posts = publishedPosts();
  // At least one entry keeps the route statically analysable while every post is a draft.
  return posts.length > 0 ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: path },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      url: path,
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.published,
    },
  };
}

/** The URL is read inside Suspense so the route's shared shell doesn't depend on it. */
export default function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense>
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const path = `/blog/${post.slug}`;
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: post.title, path },
      ]}
      title={post.title}
      meta={`Published ${post.published}`}
      note={post.draft ? "Draft — not published. Only visible during development." : undefined}
      structuredData={post.draft ? [] : [article({ ...post, path })]}
    >
      {post.body()}
      <AdSlot placement="blog-inline" />
    </ContentPage>
  );
}
