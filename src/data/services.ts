export interface Service {
  slug: string;
  title: string;
  tagline: string;
  /** What the client walks away with. */
  outcomes: string[];
  /** Situations where this offering is the right call. */
  goodFitIf: string[];
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
      'Legacy code brought under test and refactored without a big-bang rewrite',
      'Architecture decisions written down and understood by the whole team',
    ],
    goodFitIf: [
      'Your Spring codebase has grown faster than its structure',
      'Releases feel risky and refactoring keeps getting postponed',
      'You need senior capacity now, without a long hiring cycle',
    ],
    engagement: 'Embedded in your team for a fixed scope or on a rolling monthly basis.',
  },
  {
    slug: 'tdd-ddd-coaching',
    title: 'TDD & DDD coaching',
    tagline: 'Turn testing and modelling from a chore into the way your team designs software.',
    outcomes: [
      'Fast, trustworthy test suites that make change cheap',
      'A shared domain model and language across product and engineering',
      'Engineers who drive design from tests without a coach in the room',
    ],
    goodFitIf: [
      'Tests exist but nobody trusts them, or they take too long to run',
      'Business rules are scattered across services, controllers and SQL',
      'You want the practices to stick after the consultant leaves',
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
    goodFitIf: [
      'Deployments are manual, scheduled or something people dread',
      'The pipeline is slow, flaky or understood by one person',
      'You are moving to containers or the cloud and want to get delivery right first',
    ],
    engagement:
      'A short assessment first, then hands-on implementation with your platform or delivery team.',
  },
];
