export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
}

/**
 * Real client quotes only. Sections that show testimonials render nothing
 * while this list is empty, so the site never displays placeholder praise.
 *
 * Example entry:
 * { quote: 'Boyan helped us ...', name: 'Jane Doe', role: 'CTO', company: 'Acme' }
 */
export const testimonials: Testimonial[] = [];
