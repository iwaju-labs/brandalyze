import {
  Zap,
  BarChart02,
  Target01,
  ArrowSquareRight,
  Award03,
} from "@untitledui/icons";
import { Vortex } from "@/components/ui/vortex";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title:
    "Brandalyze - AI Brand Voice Analysis | Ensure Consistent Brand Messaging",
  description:
    "Transform your brand consistency with AI-powered voice analysis. Get instant feedback on tone, messaging alignment, and brand coherence across all your content. Start your free trial today.",
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

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white relative overflow-hidden transition-colors">
      <div className="fixed inset-0 z-0">
        <Vortex
          backgroundColor="transparent"
          baseHue={280}
          particleCount={50}
          className="opacity-10 dark:opacity-50"
          baseSpeed={0.1}
          rangeY={3000}
          baseRadius={0.5}
        />
      </div>
      {/* Dark overlay with gradient for better text readability - only in dark mode */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/70 via-black/50 to-black/70 z-10 dark:block hidden" />{" "}
      <main className="relative z-20 mx-auto max-w-7xl px-4 py-16 min-h-screen flex items-center">
        <div className="w-full">
          {/* Two Column Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            {/* Left Column - Title and Subtext */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 select-none">
                <span className="text-gray-900 dark:text-white">
                  brandalyze
                </span>
                <span className="text-purple-600 dark:text-purple-400">.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-mono mb-4">
                &gt; Ensure your content stays on-brand
              </p>{" "}
              {/* Get started button call to action */}
              <Link
                className="flex flex-row border border-black dark:border-[#f8f8ff] rounded-lg ml-6 px-4 py-2 mb-2 text-black dark:text-[#f8f8ff] w-full text-2xl items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600/80 transition-colors"
                href={"/analyze"}
              >
                Get Started For Free <ArrowSquareRight className="ml-2" />
              </Link>
              {/* Chrome Extension plug */}
              <Link
                className="flex flex-row ml-6 text-xs text-purple-700 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-500 items-center"
                href="https://chromewebstore.google.com/detail/brandalyze-social-media-b/chnffppbmnlchenodfkbldobgmfgpbph"
              >
                <Award03 size={20} /> &nbsp; Featured on Chrome Webstore
              </Link>
            </div>

            {/* Right Column - Description and Image Space */}
            <div className="text-center lg:text-left space-y-6">
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                Upload your brand samples, analyze new content, and get
                AI-powered feedback on tone, style, and messaging consistency.
                Keep your brand voice unified across all channels.
              </p>

              {/* Image placeholder space */}
              <Image
                src="/assets/landing/profile-analysis.png"
                alt="example profile analysis results"
                width={580}
                height={296}
                style={{
                  width: "100%",
                  height: "auto",
                }}
                className="rounded-md mx-auto lg:mx-0 mb-2"
              />
            </div>
          </div>

          {/* Demo Videos Section */}
          <div className="mt-20 max-w-5xl mx-auto">
            {" "}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-mono">
                &gt; See Brandalyze in Action
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Watch how our AI-powered brand analysis works to ensure your
                content stays perfectly on-brand
              </p>
            </div>
            <div className="space-y-16">
              {/* First Demo Video */}
              <div className="text-center">
                <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl mb-6">
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  >
                    <source
                      src="/assets/landing/landing page demos_1.webm"
                      type="video/webm"
                    />
                    Your browser does not support this video format.
                  </video>
                </div>{" "}
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3 font-mono">
                    &gt; Upload Brand Samples & Get Instant Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                    Upload your existing brand content samples, and our AI
                    instantly learns your unique voice, tone, and messaging
                    style. Get detailed insights into what makes your brand
                    distinctive and how to maintain consistency across all
                    content.
                  </p>
                </div>
              </div>

              {/* Second Demo Video */}
              <div className="text-center">
                <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl mb-6">
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  >
                    <source
                      src="/assets/landing/landing page demos_2.webm"
                      type="video/webm"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>{" "}
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3 font-mono">
                    &gt; Real-Time Social Media Profile Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                    Analyze social media profiles based on previously set
                    handles. Get feedback on tone, style, and messaging to
                    ensure every piece of content perfectly matches your brand
                    identity.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">
                AI Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Advanced AI compares your content against brand samples using
                semantic understanding
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <BarChart02 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">
                Alignment Score
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Get precise 0-100 brand alignment scores with detailed feedback
                and reasoning
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <Target01 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">
                Actionable Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Receive specific suggestions to improve brand consistency and
                messaging
              </p>
            </div>
          </div>
          {/* Tech stack indicator */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 dark:text-gray-500 text-xs font-mono mb-2">
              POWERED BY
            </p>
            <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-600">
              <span className="text-sm">OpenAI</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
