import type { HTMLAttributes } from 'react';
type MathProps = HTMLAttributes<MathMLElement> & { display?: 'block' | 'inline' };
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: MathProps;
      mrow: MathProps;
      msub: MathProps;
      msup: MathProps;
      mi: MathProps;
      mn: MathProps;
      mo: MathProps;
      mtext: MathProps;
    }
  }
}
