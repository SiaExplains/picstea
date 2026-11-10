import Image from "next/image";
import styles from "./site.module.css";

/**
 * An image in a blog post, with a caption. Images live in `public/blog/<slug>/`. Without `src`
 * a marked placeholder is shown instead; only draft posts may use one (drafts are not published).
 */
export function BlogFigure({
  src,
  alt,
  caption,
  width = 1200,
  height = 800,
}: {
  src?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className={styles.blogFigure}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 760px) 100vw, 720px"
        />
      ) : (
        <div className={styles.blogFigurePlaceholder} role="img" aria-label={alt}>
          Image to come: {alt}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
