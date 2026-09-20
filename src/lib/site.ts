/**
 * Site-wide constants. Pure data: safe to import from tests and from Astro alike.
 */
export const SITE = {
  name: 'Boyan Zlatanov',
  logo: 'zlatanov',
  domain: 'zlatanov.xyz',
  title: 'Boyan Zlatanov · Java consultant for TDD, DDD and CI/CD',
  description:
    'Independent Java and Spring consultant helping teams ship faster with test-driven development, domain-driven design and reliable CI/CD pipelines.',
  /** The hero prompt on the home page and the social preview image. */
  slogan: 'Ship systems you can change with confidence.',
  url: 'https://zlatanov.xyz',
  author: 'Boyan Zlatanov',
  email: 'boyan@zlatanov.xyz',
  locale: 'en',
  social: {
    github: 'https://github.com/G2HJei',
    linkedin: 'https://www.linkedin.com/in/boyan-zlatanov/',
  },
} as const;
