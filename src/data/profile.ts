/** Copy for the home page cards that is neither a service nor a principle. */
export const profile = {
  /** The intro card at the top of the home page: hook, pitch, introduction and call to action. */
  intro: {
    /** Two sentences; the second is the punch line and gets its own line from `sm` up. */
    hook: ['The Dwarves delved too greedily and too deep.', 'So did your codebase.'],
    subtitle: 'drums in the deep',
    moria:
      'Every long-lived system has a Moria: the module that was built fast, built deep, and woke something nobody wants to face.',
    /** On its own line under `moria`, leading into the drums. */
    drumsLead: 'You can hear the drums.',
    /** Rendered as a stair: each one a step deeper and a shade darker. */
    drums: [
      'Releases that need a weekend.',
      'Fixes that break two other things.',
      'Estimates that start with "it depends".',
    ],
    wayThrough: 'The way through is TDD, clean code and CI/CD.',
    practices: [
      { name: 'TDD', text: 'A test before every change, so nothing breaks in the dark.' },
      {
        name: 'clean code',
        text: 'Refactoring under that cover, so the code says what it means.',
      },
      { name: 'CI/CD', text: 'A pipeline that judges every commit, so the lights stay on.' },
    ],
    /** One paragraph each: the track record, then the offer. */
    introduction: [
      "I'm Boyan Zlatanov, a software architect with 19 years in enterprise software. On my last platform ~1,500 unit tests, ~70 end-to-end tests and an 80% coverage gate kept bug recurrence near zero and let us drop manual QA; trunk-based development and CI/CD took releases from two weeks to under an hour.",
      'I bring that to teams as an independent consultant: talks that make the case, workshops that build the skills, and time embedded in your team until your engineers can walk the mine on their own.',
    ],
    cta: 'Tell me which module everybody is afraid of.',
  },

  /** Shown in the contact card under "what helps me reply well". */
  contactTips: [
    'The size of the team and the stack you run',
    'What is slowing you down or worrying you right now',
    'Whether you are after hands-on delivery, coaching, or an assessment',
    'Rough timeline and where the team is based',
  ],
} as const;
