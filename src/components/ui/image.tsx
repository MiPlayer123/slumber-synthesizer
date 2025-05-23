import { useState, useEffect } from "react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function Image({ src, alt, className, ...props }: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    setImageSrc(src || null);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Image failed to load:", imageSrc);

    if (props.onError) {
      props.onError(e);
    }
  };

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
