"use client";

import { useCallback, useEffect, useState } from "react";
import { useProofPlayAuth } from "@/components/ProofPlayAuthProvider";

/**
 * Displays an image fetched with Privy auth headers.
 *
 * Standard <img> / next/image cannot send Authorization headers, so this
 * component fetches the image as a blob with the user's access token and
 * renders it via an Object URL.
 */
export default function AuthenticatedImage({
  src,
  alt,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const auth = useProofPlayAuth();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const loadImage = useCallback(async () => {
    if (!auth.authenticated) return;

    try {
      const headers = await auth.authHeaders();
      const response = await fetch(src, { headers });

      if (!response.ok) {
        setError(true);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
    } catch {
      setError(true);
    }
  }, [auth, src]);

  useEffect(() => {
    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadImage]);

  if (error) {
    return (
      <div
        className={className}
        style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span className="text-xs font-bold opacity-50">Could not load media</span>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div
        className={className}
        style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span className="text-xs font-bold opacity-50">Loading...</span>
      </div>
    );
  }

  /* eslint-disable @next/next/no-img-element */
  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
}
