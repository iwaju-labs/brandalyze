"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AsciiEffectProps {
  readonly videoSrc?: string;
  readonly className?: string;
}

export default function AsciiEffect({ videoSrc, className = "" }: AsciiEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ASCII characters ordered by brightness
    const ASCII_CHARS = ' .:-=+*#%@';
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;    // Create video element for GIF
    const video = document.createElement('video');
    video.src = videoSrc || '/assets/landing/landing.gif';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = 'none'; // Hide the video element
    videoRef.current = video;
    
    // Add video to DOM to ensure it loads
    document.body.appendChild(video);

    // Create canvas for ASCII conversion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const asciiContainer = document.createElement('pre');
    asciiContainer.style.position = 'absolute';
    asciiContainer.style.top = '0';
    asciiContainer.style.left = '0';
    asciiContainer.style.fontFamily = 'monospace';
    asciiContainer.style.fontSize = '8px';
    asciiContainer.style.lineHeight = '6px';
    asciiContainer.style.color = '#00ff00';
    asciiContainer.style.background = 'transparent';
    asciiContainer.style.whiteSpace = 'pre';
    asciiContainer.style.overflow = 'hidden';
    asciiContainer.style.pointerEvents = 'none';
    asciiContainer.style.zIndex = '1';
    
    container.appendChild(asciiContainer);

    const ASCII_WIDTH = 120;
    const ASCII_HEIGHT = 40;

    const convertToAscii = () => {
      if (!ctx || !video.videoWidth) return '';
      
      canvas.width = ASCII_WIDTH;
      canvas.height = ASCII_HEIGHT;
      
      ctx.drawImage(video, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
      const imageData = ctx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
      const pixels = imageData.data;
      
      let ascii = '';
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
        
        ascii += ASCII_CHARS[charIndex];
        
        if ((i / 4 + 1) % ASCII_WIDTH === 0) {
          ascii += '\n';
        }
      }
      
      return ascii;
    };

    const animate = () => {
      if (video.readyState >= 2) {
        const asciiText = convertToAscii();
        asciiContainer.textContent = asciiText;
      }
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start video and animation
    video.addEventListener('loadeddata', () => {
      animate();
    });

    video.load();

    // Handle resize
    const handleResize = () => {
      if (!renderer || !camera) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      video?.parentNode?.removeChild(video);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [videoSrc]);

  return (
    <div 
      ref={containerRef} 
      className={`fixed inset-0 -z-10 opacity-20 ${className}`}
    />
  );
}
