import Image from "next/image";
import styles from "./site.module.css";

/**
 * An image or a short silent screen recording in a blog post, with a caption. Files live in
 * `public/blog/<slug>/`. Videos are muted, loop and start when the reader presses play (nothing
 * moves on its own, which respects reduced motion); the poster frame shows the result. Without
 * `src` a marked placeholder is shown instead; only draft posts may use one (drafts are not
 * published).
 */
export function BlogFigure({
  src,
  video,
  poster,
  alt,
  caption,
  width = 1200,
  height = 800,
}: {
  src?: string;
  /** An MP4 screen recording (muted, looping). */
  video?: string;
  /** The video's still frame (shown before it plays and with reduced motion). */
  poster?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className={styles.blogFigure}>
      {video ? (
        <video
          className={styles.blogVideo}
          src={video}
          poster={poster}
          width={width}
          height={height}
          muted
          loop
          playsInline
          controls
          preload="metadata"
          aria-label={alt}
        />
      ) : src ? (
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
