"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Particle = {
    id: number;
    x: number;
    y: number;
    content: string;
    size: number;
    rotate: number;
    opacity: number;
}

type ParticleLinkProps = {
    readonly href: string;
    readonly children: React.ReactNode;
    readonly emojis?: string[];
    readonly images?: string[];
    readonly particleCount?: number;
    readonly particleSizeRange: [number, number];
    readonly className?: string;
}

const Particle = ({ x, y, content, size, rotate, opacity = 1}: Particle) => (
    <motion.div
        className='absolute pointer-events-none'
        style={{
            top: "50%",
            left: "50%",
        }}
        initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: 0}}
        animate={{ x, y, opacity: opacity, scale: 1.2, rotate}}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 1.5, ease: "easeOut"}}
    >
        {typeof content === "string" && (content.startsWith("http") || content.startsWith("/")) ? (
            <img src={content} alt="particle" style={{ width: size, height: size, opacity }} />
        ) : (
            <span style={{ fontSize: size, opacity }}>{content}</span>
        )}
    </motion.div>
);

export default function ParticleLink({
  href,
  children,
  emojis = ["✨", "⭐"],
  images = [],
  particleCount = 12,
  particleSizeRange = [16, 24],
  className = "",
} : ParticleLinkProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setParticles([]);
  };

  // Continuously generate particles while hovering
  useEffect(() => {
    if (!isHovering) return;

    const createParticle = () => {
      const content =
        Math.random() > 0.5 && images.length
          ? images[Math.floor(Math.random() * images.length) * 2]
          : emojis[Math.floor(Math.random() * emojis.length) / 2];

      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 50;

      return {
        id: Math.random(),
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        content,
        size: Math.random() * (particleSizeRange[1] - particleSizeRange[0]) + particleSizeRange[0],
        rotate: Math.random() * 360,
        opacity: Math.random() * 0.3 + 0.7
      };
    };

    const interval = setInterval(() => {
      const newParticles = Array.from({ length: 3 }).map(createParticle);
      setParticles((prev) => [...prev, ...newParticles]);
    }, 200);

    return () => clearInterval(interval);
  }, [isHovering, images, emojis, particleSizeRange]);

  // Clean up old particles
  useEffect(() => {
    const cleanup = setInterval(() => {
      setParticles((prev) => prev.slice(-particleCount * 2));
    }, 1500);

    return () => clearInterval(cleanup);
  }, [particleCount]);

  return (
    <Link href={href} passHref>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative inline-block cursor-pointer ${className}`}
      >
        {children}
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>
    </Link>
  );
}