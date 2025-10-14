"use client";

import { useEffect, useRef, useState } from "react";

interface AsciiGifEffectProps {
  readonly gifSrc?: string;
  readonly className?: string;
}

export default function AsciiGifEffect({
  gifSrc = "/assets/landing/landing1.mp4",
  className = "",
}: AsciiGifEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ASCII characters ordered by brightness
    const ASCII_CHARS = " .:-=+*#%@";    // Create ASCII display container
    const asciiContainer = document.createElement("pre");
    asciiContainer.className = "ascii-effect-container";
    asciiContainer.style.position = "absolute";
    asciiContainer.style.top = "50%";
    asciiContainer.style.left = "50%";
    asciiContainer.style.transform = "translate(-50%, -50%) scale(2.0)";
    asciiContainer.style.fontFamily = "monospace";
    asciiContainer.style.fontSize = "6px";
    asciiContainer.style.lineHeight = "5px";
    asciiContainer.style.background = "transparent";
    asciiContainer.style.whiteSpace = "pre";
    asciiContainer.style.overflow = "visible";
    asciiContainer.style.pointerEvents = "none";
    asciiContainer.style.letterSpacing = "1px";
    asciiContainer.style.textAlign = "center";

    container.appendChild(asciiContainer);

    // Canvas setup (hidden, used for processing)
    canvas.style.display = "none";
    container.appendChild(canvas);
    const ASCII_WIDTH = 120;
    const ASCII_HEIGHT = 50;

    canvas.width = ASCII_WIDTH;
    canvas.height = ASCII_HEIGHT;

    // Create video element to load MP4
    const video = document.createElement("video");
    video.src = gifSrc;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = "none";
    document.body.appendChild(video);
    const convertToAscii = () => {
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
        const imageData = ctx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
        const pixels = imageData.data;

        let ascii = "";
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // Calculate brightness
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          const charIndex = Math.floor(
            (brightness / 255) * (ASCII_CHARS.length - 1)
          );

          ascii += ASCII_CHARS[charIndex];

          // Add newline at end of row
          if ((i / 4 + 1) % ASCII_WIDTH === 0) {
            ascii += "\n";
          }
        }

        asciiContainer.textContent = ascii;
      } else if (video.paused) {
        // Try to restart the video if it's paused
        video.play().catch((e) => console.log("Failed to restart video:", e));
      }
    };

    const animate = () => {
      convertToAscii();
      animationRef.current = requestAnimationFrame(animate);
    }; // Start animation when video loads
    video.addEventListener("loadeddata", () => {
      console.log("Video loaded successfully, attempting to play");
      video
        .play()
        .then(() => {
          console.log("Video is now playing, starting animation");
          setIsLoaded(true);
          animate();
        })
        .catch((e) => {
          console.error("Failed to play video:", e);
          // Start fallback animation if video won't play
          video.dispatchEvent(new Event("error"));
        });
    });

    // Also try to start when video can play
    video.addEventListener("canplay", () => {
      console.log("Video can play, attempting to play");
      if (!video.paused) return; // Already playing

      video
        .play()
        .then(() => {
          console.log("Video is playing from canplay event");
          setIsLoaded(true);
          animate();
        })
        .catch((e) => {
          console.error("Failed to play video from canplay:", e);
        });
    });

    // Log video loading attempts
    video.addEventListener("loadstart", () => {
      console.log("Video loading started");
    });

    // Fallback if video fails to load - animated matrix pattern
    video.addEventListener("error", (e) => {
      console.error("Video failed to load:", e);
      let frameCount = 0;
      const fallbackAnimate = () => {
        frameCount++;
        let ascii = "";

        for (let y = 0; y < ASCII_HEIGHT; y++) {
          for (let x = 0; x < ASCII_WIDTH; x++) {
            const time = frameCount * 0.1;
            const wave1 = Math.sin((x + y + time) * 0.3);
            const wave2 = Math.cos((x - y + time * 0.7) * 0.2);
            const combined = (wave1 + wave2) * 0.5;

            const noise = (Math.sin(x * 1234.5 + y * 5678.9 + time) + 1) * 0.5;
            const brightness = (combined + 1) * 0.5 * noise;

            const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
            ascii +=
              ASCII_CHARS[
                Math.max(0, Math.min(charIndex, ASCII_CHARS.length - 1))
              ];
          }
          ascii += "\n";
        }

        asciiContainer.textContent = ascii;
        animationRef.current = requestAnimationFrame(fallbackAnimate);
      };

      setIsLoaded(true);
      fallbackAnimate();
    });

    // Force start fallback animation after 2 seconds if video doesn't load
    setTimeout(() => {
      console.log("Checking if video loaded after 2 seconds");
      if (!video.readyState || video.readyState < 2) {
        console.log("Video not loaded, starting fallback animation");
        video.dispatchEvent(new Event("error"));
      }
    }, 2000);    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      container.innerHTML = "";
    };
  }, [gifSrc]);
  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full pointer-events-none ${className} ${
        isLoaded ? "opacity-100" : "opacity-0"
      } transition-opacity duration-1000 rounded-lg`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
