/** Copy for the home page cards that is neither a service nor a principle. */
export const profile = {
  /** One line under the name in the profile card. */
  tagline: 'Independent Java & Spring consultant | TDD | DDD | CI/CD',

  // TODO: prune to the tools you actually use.
  tools: [
    'Java 17 / 21',
    'Spring Boot',
    'JUnit 5',
    'Mockito',
    'Testcontainers',
    'ArchUnit',
    'Maven',
    'Gradle',
    'PostgreSQL',
    'Kafka',
    'Docker',
    'Kubernetes',
    'GitHub Actions',
    'GitLab CI',
  ],

  /** Shown in the contact card under "what helps me reply well". */
  contactTips: [
    'The size of the team and the stack you run',
    'What is slowing you down or worrying you right now',
    'Whether you are after hands-on delivery, coaching, or an assessment',
    'Rough timeline and where the team is based',
  ],
} as const;
