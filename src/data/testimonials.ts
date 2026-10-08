export interface Testimonial {
  /** Each line break starts a new paragraph. */
  quote: string;
  name: string;
  role?: string;
  company?: string;
  /** The author's public profile; their name links to it. */
  url?: string;
}

/**
 * Real client quotes only. Sections that show testimonials render nothing while this list is
 * empty, so the site never displays placeholder praise.
 */
export const testimonials: Testimonial[] = [
  {
    quote:
      "I've worked with many architects throughout my career, and Boyan stands out because his contribution went far beyond architecture. He supported the team with hands-on management, proposed new processes that made us work better, and consistently defended the domain model so it stayed clean, clear, and meaningful to the business. \n\n He also championed acceptance test driven development, which cut our bugs to almost zero, with only a handful of edge cases. That's a level of quality I haven't seen on many other projects. I'd gladly work with Boyan again and recommend him to any team that needs a technical leader who cares about both people and product quality.",
    name: 'Tsvetomir Ivanov',
    role: 'Product Manager',
    company: 'TINQIN (part of BeYs group)',
    url: 'https://www.linkedin.com/in/tsvetomir-ivanov',
  },
  {
    quote:
      'A dedicated professional who takes every task to heart. He delivers solid solutions with clear costs, pros, and cons analysis.',
    name: 'Nikolay Oblakoff',
    role: 'Founder',
    company: 'Conservative.bg',
    url: 'https://www.linkedin.com/in/oblakoff',
  }
];
