import { useState, useEffect } from "react";
import { fixSupabaseStorageUrl, checkImageAccessibility } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

export function Image({
  src,
  alt,
  fallbackSrc,
  className,
  ...props
}: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset state when src changes
    setHasError(false);

    // Fix the URL using our utility
    const fixedUrl = fixSupabaseStorageUrl(src);

    // If we have a URL, check if it's accessible
    if (fixedUrl) {
      // Set the image source immediately to avoid visible delay
      setImageSrc(fixedUrl);

      // Check accessibility in the background
      const checkAccess = async () => {
        const isAccessible = await checkImageAccessibility(fixedUrl);
        if (!isAccessible) {
          console.warn("Image is not accessible:", fixedUrl);
          // Try alternative formatting if needed, but don't change the UI
        }
      };

      checkAccess().catch(console.error);
    } else {
      setImageSrc(null);
    }
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Image failed to load:", imageSrc);

    if (props.onError) {
      props.onError(e);
    }

    // Don't set hasError to avoid UI changes
    // setHasError(true);
  };

  // Use the same img tag the same way it was used before
  return (
    <img
      src={imageSrc || ""}
      alt={alt}
      className={className}
      crossOrigin="anonymous"
      onError={handleError}
      {...props}
    />
  );
}
