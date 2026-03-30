"use client";

import { useState } from "react";
import Image from "next/image";

interface Testimonal {
  id: number;
  username: string;
  twitterHandle: string;
  avatar: string;
  testimonial?: string;
}

const testimonials: Testimonal[] = [
  {
    id: 0,
    username: "emanueledpt",
    twitterHandle: "@emanueledpt",
    avatar: "/assets/testimonial/emanuele.jpeg",
    testimonial: `I needed something like this

Everytime I’m posting I’m using it to see if it aligns with my style

Because I want to bring myself to others and do not want to fall off character

And this extension allows me to do that!`,
  },
  {
    id: 1,
    username: "offpaths",
    twitterHandle: "@offpaths",
    avatar: "/assets/testimonial/offpaths.jpg",
    testimonial: `I have actually been looking for a solution like this, something that can help me stay true to my voice while being X algorithm friendly.

Brandalyze helps me do just that. I would recommend anyone trying grow personal brand to use this tool.`,
  },
  {
    id: 2,
    username: "andi_losing",
    twitterHandle: "@andi_losing",
    avatar: "/assets/testimonial/andi_losing.jpg",
    testimonial: "",
  },
  {
    id: 3,
    username: "kappaemme",
    twitterHandle: "@kappaemme",
    avatar: "/assets/testimonial/kappaemme.jpg",
    testimonial: "I love it! It's easy to use!",
  },
  {
    id: 4,
    username: "VynseDev",
    twitterHandle: "@vynsedev",
    avatar: "/assets/testimonial/vynsedev.png",
    testimonial: "",
  },
  {
    id: 5,
    username: "Anna",
    twitterHandle: "_annakulina",
    avatar: "/assets/testimonial/annakulina.jpg"
  }
];

export default function TestimonialSection() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const totalUsers = 800;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-5 py-8">
      {/* Avatar Group */}
      <div className="group inline-flex -space-x-2 relative">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="relative">
            <a
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow @${testimonial.twitterHandle} on Twitter`}
              href={`https://twitter.com/${testimonial.twitterHandle}`}
              className="block"
              onMouseEnter={() => setHoveredId(testimonial.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(testimonial.id)}
              onBlur={() => setHoveredId(null)}
            >
              <span className="relative flex size-8 shrink-0 overflow-hidden rounded-full h-9 w-9 sm:h-11 sm:w-11 border border-gray-200 dark:border-gray-700 ring-2 ring-white dark:ring-black shadow-sm transition-transform duration-200 ease-out hover:scale-105 hover:z-10 bg-gray-100 dark:bg-gray-800">
                <Image
                  className="aspect-square size-full object-cover"
                  alt={`@${testimonial.username}`}
                  src={testimonial.avatar}
                  width={44}
                  height={44}
                />
              </span>
            </a>

            {/* Testimonial Dialog */}
            {hoveredId === testimonial.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start gap-2 mb-2">
                  <Image
                    className="rounded-full"
                    alt={testimonial.username}
                    src={testimonial.avatar}
                    width={32}
                    height={32}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {testimonial.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {testimonial.twitterHandle}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {testimonial.testimonial}
                </p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="border-8 border-transparent border-t-white dark:border-t-gray-800" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trusted By Section */}
      {totalUsers > 0 && (
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Trusted by{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {totalUsers > 5 ? Math.floor(totalUsers / 5) * 5 : totalUsers}+ users
          </span>
        </p>
      )}
    </div>
  );
}
