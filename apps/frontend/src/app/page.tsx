import {
  Zap,
  BarChart02,
  Target01,
  ArrowSquareRight,
  Award03,
} from "@untitledui/icons";
import { FaChrome } from "react-icons/fa";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import Typewriter from "@/components/utils/Typewriter";
import MotionFadeUp from "@/components/framer/motion-fade-up";
import ParticleLink from "@/components/framer/particle-link";
import NativeVideoFacade from "@/components/ui/video-facade/native-vide-facade";
import TestimonialSection from "@/components/ui/testimonial/testimonal";

export const metadata: Metadata = {
  title: "Brandalyze - Best Social Media Brand Analysis Tool",
  description:
    "Transform your brand consistency with AI-powered voice analysis. Get instant feedback on tone, and brand alignment across all your content.",
  keywords: [
    "AI brand analysis",
    "brand voice consistency",
    "content marketing automation",
    "brand messaging tool",
    "AI copywriting assistant",
    "marketing analytics",
    "brand alignment checker",
    "content optimization",
  ],
  openGraph: {
    title:
      "Brandalyze - AI Brand Voice Analysis | Ensure Consistent Brand Messaging",
    description:
      "Transform your brand consistency with AI-powered voice analysis. Get instant feedback on tone, messaging alignment, and brand coherence across all your content.",
    type: "website",
    url: "https://brandalyze.io",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Brandalyze - AI Brand Voice Analysis | Ensure Consistent Brand Messaging",
    description:
      "Transform your brand consistency with AI-powered voice analysis. Get instant feedback on tone, messaging alignment, and brand coherence across all your content.",
  },
  alternates: {
    canonical: "https://brandalyze.io",
  },
};

const words: string[] = [
  "your brand already has a voice.",
  "it's time to listen to it.",
];

const features = [
  {
    icon: Zap,
    title: "AI Analysis",
    description:
      "Advanced AI compares your content against brand samples using semantic understanding",
  },
  {
    icon: BarChart02,
    title: "Alignment Score",
    description:
      "Get precise 0-100 brand alignment scores with detailed feedback and reasoning",
  },
  {
    icon: Target01,
    title: "Actionable Insights",
    description:
      "Receive specific suggestions to improve brand consistency and messaging",
  },
  {
    icon: FaChrome,
    title: "Chrome Extension",
    description:
      "Pro users and above gain access to the chrome extension that gives access to direct social media profile analysis",
  },
];

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-12 lg:pt-16 pb-8 sm:pb-12 lg:pb-16 min-h-screen flex items-start">
        <div className="w-full">
          {/* Grammarly comparison ink stamp */}
          <MotionFadeUp delay={0.5} duration={1}>
            <div className="grammarly-comp flex items-center justify-center -mt-8">
              <Image
                src="/assets/landing/inkstamp.png"
                alt="Like Grammarly but for brands!"
                width={300}
                height={300}
                priority
                className="flex items-center justify-center pointer-events-none -rotate-12 dark:invert md:block lg:block"
              />
            </div>
            {/* Two Column Hero Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mb-12 lg:mb-16">
              {/* Left Column - Title and Subtext */}
              <div className="text-center lg:text-left space-y-6">
                <div className="relative">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight select-none relative z-10">
                    <span className="text-gray-900 dark:text-white">
                      brandalyze
                    </span>
                    <span className="text-purple-600 dark:text-purple-400">
                      .
                    </span>
                  </h1>
                </div>

                <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-mono select-none">
                  <Typewriter words={words} pauseTime={1500} deleteSpeed={10} />
                </p>

                {/* Get started button call to action */}
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0">
                  <ParticleLink
                    className="flex items-center justify-center border border-black dark:border-[#f8f8ff] rounded-lg px-6 py-3 text-black dark:text-[#f8f8ff] text-lg sm:text-xl font-medium hover:bg-purple-300 dark:hover:bg-purple-600/80 transition-colors w-full sm:flex-1"
                    href={"/analyze"}
                    images={["/icon.png"]}
                    particleCount={12}
                    particleSizeRange={[12, 24]}
                  >
                    Check Brand Alignment For Free
                    <ArrowSquareRight className="ml-2 h-5 w-5" />
                  </ParticleLink>
                </div>

                {/* Chrome Extension plug */}
                <div className="flex justify-center lg:justify-start">
                  <Link
                    className="inline-flex items-center text-sm text-purple-700 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    href="https://chromewebstore.google.com/detail/brandalyze-social-media-b/chnffppbmnlchenodfkbldobgmfgpbph"
                  >
                    <Award03 size={18} className="mr-2" />
                    Featured on Chrome Webstore
                  </Link>
                </div>
              </div>


              {/* Right Column - Description and Image Space */}
              <div className="text-center lg:text-left space-y-6">
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Upload brand samples, analyze social profiles, and audit
                  content before posting. Get AI-powered brand alignment scores
                  with actionable feedback. Pro users unlock the browser
                  extension for real-time profile analysis and pre-publish
                  auditing across Twitter/X and LinkedIn.
                </p>
              </div>
            </div>
          </MotionFadeUp>

          {/* Demo Videos Section */}
          <div className="mt-16 sm:mt-20 max-w-6xl mx-auto">
            <MotionFadeUp delay={1} duration={1.5}>
              <div>
                <TestimonialSection />
              </div>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-mono">
                  &gt; See Brandalyze in Action
                </h2>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
                  Watch how our AI-powered brand analysis works to ensure your
                  content stays perfectly on-brand
                </p>
              </div>
            </MotionFadeUp>

            <div className="space-y-8 sm:space-y-12">
              <MotionFadeUp delay={0.75} duration={1.5}>
                {/* First Demo - Brand Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Left Column - Title and Description */}
                  <div className="text-center lg:text-left px-4 order-2 lg:order-1">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4 font-mono">
                      &gt; Upload Brand Samples & Get Instant Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-lg">
                      Upload your existing brand content samples, and our AI
                      instantly learns your unique voice, tone, and messaging
                      style. Get detailed insights into what makes your brand
                      distinctive and how to maintain consistency across all
                      content.
                    </p>
                  </div>
                  {/* Right Column - Video */}
                  <div className="order-1 lg:order-2">
                    <NativeVideoFacade
                      videoSrc="/assets/landing/brandalyze-content-input-demo.mp4"
                      posterImage="/assets/landing/brandalyze-content-input.png"
                      title="Upload Brand Samples & Get Instant Analysis"
                      aspectRatio="16/9"
                      priority={false}
                    />
                  </div>
                </div>
              </MotionFadeUp>

              <MotionFadeUp>
                {/* Second Demo - Social Media Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Left Column - Video */}
                  <div className="order-1">
                    <NativeVideoFacade
                      videoSrc="/assets/landing/brandalyze-profile-analysis.mp4"
                      posterImage="/assets/landing/brandalyze-profile-analysis.png"
                      title="Real-Time Social Media Profile Analysis"
                      aspectRatio="16/9"
                      priority={false}
                    />
                  </div>
                  {/* Right Column - Title and Description */}
                  <div className="text-center lg:text-left px-4 order-2">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4 font-mono">
                      &gt; Real-Time Social Media Profile Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-lg">
                      Analyze social media profiles based on previously set
                      handles. Get feedback on tone, style, and messaging to
                      ensure every piece of content perfectly matches your brand
                      identity.
                    </p>
                  </div>
                </div>
              </MotionFadeUp>

              <MotionFadeUp delay={0.25} duration={1.5}>
                {/* Third Demo - Placeholder for new video */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Left Column - Title and Description */}
                  <div className="text-center lg:text-left px-4 order-2 lg:order-1">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4 font-mono">
                      &gt; Post Audits
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-lg">
                      Test your post for tone and style alignment before
                      publishing. Get real-time suggestions to improve phrasing
                      and tone. All to help you get better engagement on your
                      posts.
                    </p>
                  </div>
                  {/* Right Column - Video */}
                  <div className="order-1 lg:order-2">
                    <NativeVideoFacade
                      videoSrc="/assets/landing/post-audits.mp4"
                      posterImage="/assets/landing/post-audits.png"
                      title="Post Audits"
                      aspectRatio="16/9"
                      priority={false}
                    />
                  </div>
                </div>
              </MotionFadeUp>
            </div>
          </div>

          {/* Feature highlights */}
          <MotionFadeUp delay={0.5} duration={1}>
            <div className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="text-center p-6 bg-[#f8f8ff] dark:bg-black rounded-xl border border-gray-900 dark:border-white transition-colors hover:shadow-md w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)]"
                  >
                    <div className="flex justify-center mb-4">
                      <Icon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-3 font-mono text-lg">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </MotionFadeUp>

          {/* PROMOTIONS/TRUST/CREDIT */}
          <div className="flex mt-12 sm:mt-16 text-center justify-center items-center space-x-4">
            <a
              href="https://yourwebsitescore.com/certified-websites/brandalyze.io"
              target="_blank"
              rel="noopener"
            >
              <Image
                src="https://yourwebsitescore.com/api/badge/brandalyze.io"
                alt="Monitor your website with YourWebsiteScore"
                height={54}
                width={216}
                unoptimized
                className="shadow-md"
              />
            </a>
            <Link
              className="text-gray-500 dark:text-gray-500 text-xs font-mono mb-2 dark:text-white"
              href="https://x.com/_dngi"
              target="_blank"
            >
              contact me: @_dngi
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
