// src/lib/blog.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const postsDirectory = path.join(process.cwd(), 'src/content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
  tags: string[];
  content: string;
  readingTime: string;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  // Check if directory exists, if not return empty array
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        author: data.author,
        image: data.image,
        tags: data.tags || [],
        content,
        readingTime: readingTime(content).text,
      };
    })
    .sort((a, b) => (new Date(a.date) > new Date(b.date) ? -1 : 1));

  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      author: data.author,
      image: data.image,
      tags: data.tags || [],
      content,
      readingTime: readingTime(content).text,
    };
  } catch {
    return null;
  }
}