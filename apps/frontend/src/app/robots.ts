import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://brandalyze.io'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/analyze',
        '/settings',
        '/subscription/',
        '/user-profile/',
        '/sign-in',
        '/sign-up',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
