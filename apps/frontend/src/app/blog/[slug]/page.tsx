// src/app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import Image from 'next/image';
import Link from 'next/link';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  
  if (!post) return {};

  return {
    title: `${post.title} | Brandalyze Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: post.image ? [{ url: post.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Link */}
        <Link 
          href="/blog"
          className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-8 font-mono"
        >
          ← Back to Blog
        </Link>

        {/* Hero Image */}
        {post.image && (
          <div className="aspect-video relative mb-8 rounded-xl overflow-hidden video-brutalist">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Post Header */}
        <header className="mb-8">
          <div className="flex gap-2 mb-4 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
            <time>
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
            <span>•</span>
            <span>{post.readingTime}</span>
            <span>•</span>
            <span>{post.author}</span>
          </div>
        </header>

        {/* Post Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none 
                        prose-headings:font-mono prose-headings:font-bold 
                        prose-a:text-purple-600 dark:prose-a:text-purple-400 
                        prose-code:text-purple-600 dark:prose-code:text-purple-400
                        prose-code:bg-purple-50 dark:prose-code:bg-purple-900/20
                        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
                        prose-img:rounded-xl prose-img:shadow-lg">
          <MDXRemote source={post.content} />
        </div>

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.description,
              image: post.image,
              datePublished: post.date,
              author: {
                '@type': 'Person',
                name: post.author,
              },
              publisher: {
                '@type': 'Organization',
                name: 'Brandalyze',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://brandalyze.io/icon.png',
                },
              },
            }),
          }}
        />
      </article>
    </div>
  );
}
