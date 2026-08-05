import { useEffect, useState } from "react";

export function useFloorPlanImage(url: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const nextImage = new Image();
    nextImage.decoding = "async";
    nextImage.onload = () => setImage(nextImage);
    nextImage.onerror = () => setImage(null);
    nextImage.src = url;
    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [url]);

  return image;
}
