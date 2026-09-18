export interface Principle {
  title: string;
  text: string;
}

export const principles: Principle[] = [
  {
    title: 'Tests first, always',
    text: 'Every change starts with a failing test. It keeps the design honest and turns refactoring from a risk into a routine.',
  },
  {
    title: 'Model the domain, not the database',
    text: 'Code that speaks the language of the business stays understandable when the business changes.',
  },
  {
    title: 'Small, releasable steps',
    text: 'Trunk-based development and pipelines that deploy on green. Feedback in minutes, not at the end of the sprint.',
  },
  {
    title: 'Leave the team stronger',
    text: 'I pair, write things down and hand over. The engagement has worked when the team no longer needs me.',
  },
];
