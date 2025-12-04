"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

interface NativeVideoFacadeProps {
  videoSrc: string;
  posterImage: string;
  title: string;
  aspectRatio?: "16/9" | "4/3" | "21/9";
  priority?: boolean;
}

export default function NativeVideoFacade({
  videoSrc,
  posterImage,
  title,
  aspectRatio = "16/9",
  priority = false,
}: NativeVideoFacadeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoad = () => {
    setIsLoaded(true);
    setTimeout(() => {
      videoRef.current?.play();
    }, 100);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio }}
    >
      {!isLoaded ? (
        <button
          onClick={handleLoad}
          className="relative w-full h-full group cursor-pointer"
          aria-label={`Play video: ${title}`}
        >
          <Image
            src={posterImage}
            alt={title}
            fill
            className="object-cover"
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-20 h-20 flex items-center justify-center bg-white/90 rounded-full group-hover:bg-white transition-colors shadow-xl">
              <Play className="w-8 h-8 text-black ml-1 fill-current" />
            </div>
          </div>
        </button>
      ) : (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          preload="none"
          className="absolute inset-0 w-full h-full"
          title={title}
        />
      )}
    </div>
  );
}
