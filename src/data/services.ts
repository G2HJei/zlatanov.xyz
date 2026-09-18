export interface Service {
  slug: string;
  title: string;
  tagline: string;
  /** What the client walks away with. */
  outcomes: string[];
  /** Typical shape of the engagement. */
  engagement: string;
}

// TODO: review and edit the copy; it is a realistic draft, not final wording.
export const services: Service[] = [
  {
    slug: 'java-delivery',
    title: 'Java & Spring delivery',
    tagline:
      'Senior hands on the systems that matter, from greenfield services to legacy modernisation.',
    outcomes: [
      'Production-ready Spring Boot services with clear module boundaries',
      'Legacy code brought under test and safely refactored',
      'Architecture decisions documented and understood by the whole team',
    ],
    engagement: 'Embedded in your team for a fixed scope or a rolling monthly retainer.',
  },
  {
    slug: 'tdd-ddd-coaching',
    title: 'TDD & DDD coaching',
    tagline: 'Turn testing and modelling from a chore into the way your team designs software.',
    outcomes: [
      'Fast, trustworthy test suites that make change cheap',
      'A shared domain model and ubiquitous language across product and engineering',
      'Engineers who can drive design from tests without a coach in the room',
    ],
    engagement: 'Pairing and mob sessions on your real codebase, plus short focused workshops.',
  },
  {
    slug: 'ci-cd',
    title: 'CI/CD & developer experience',
    tagline: 'Pipelines that make every commit deployable and every deployment boring.',
    outcomes: [
      'Trunk-based delivery with automated quality gates and fast feedback',
      'Repeatable builds, environments and releases as code',
      'Lead time and change-failure rate you can actually measure',
    ],
    engagement:
      'Assessment first, then hands-on implementation with your platform or delivery team.',
  },
];
