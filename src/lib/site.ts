/**
 * Site-wide constants. Pure data: safe to import from tests and from Astro alike.
 */
export const SITE = {
  name: 'Boyan Zlatanov',
  title: 'Boyan Zlatanov · Java consultant for TDD, DDD and CI/CD',
  description:
    'Independent Java and Spring consultant helping teams ship faster with test-driven development, domain-driven design and reliable CI/CD pipelines.',
  url: 'https://zlatanov.xyz',
  author: 'Boyan Zlatanov',
  // TODO: replace with the real address.
  email: 'hello@zlatanov.xyz',
  locale: 'en',
  social: {
    github: 'https://github.com/G2HJei',
    // TODO: replace with the real LinkedIn profile URL.
    linkedin: 'https://www.linkedin.com/in/boyan-zlatanov/',
  },
} as const;
