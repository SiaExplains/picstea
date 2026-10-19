"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/**
 * A sponsor's short, silent, looping video (self-hosted, ADR-0034). It plays muted and inline;
 * with "reduce motion" it stays on its still frame. No sound, no controls, no tracking.
 *
 * The video is added only in the browser and only while online: the editor also opens offline
 * (ADR-0029), where the file is not cached, so an empty box of the same size keeps its place.
 */
export function SponsorVideo({
  src,
  poster,
  size,
}: {
  src: string;
  poster?: string;
  size: number;
}) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => false,
  );
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query?.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {
          // Autoplay blocked: the still frame stays.
        });
      }
    };
    apply();
    query?.addEventListener("change", apply);
    return () => query?.removeEventListener("change", apply);
  }, [online]);
  if (!online) {
    return <span aria-hidden style={{ display: "block", width: "100%", aspectRatio: "1" }} />;
  }
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      width={size}
      height={size}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      disablePictureInPicture
    />
  );
}
