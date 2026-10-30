import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import tdd from '../../src/data/talks/tdd.json';
import {
  fitMono,
  fontKind,
  paragraphStyle,
  parseTransform,
  roundRectRadius,
  runStyle,
  type Paragraph,
  type Run,
  type Talk,
  type TextBody,
  toPt,
} from '../../src/lib/talk';

describe('toPt', () => {
  it('converts ODF lengths to points', () => {
    expect(toPt('2.54cm')).toBeCloseTo(72);
    expect(toPt('25.4mm')).toBeCloseTo(72);
    expect(toPt('1in')).toBe(72);
    expect(toPt('18pt')).toBe(18);
    expect(toPt('-0.5cm')).toBeCloseTo(-14.17, 2);
  });

  it('rejects anything that is not a length', () => {
    expect(() => toPt('100%')).toThrow();
    expect(() => toPt('wide')).toThrow();
  });
});

describe('parseTransform', () => {
  it('turns a counter-clockwise ODF rotation into a clockwise CSS one at the translated corner', () => {
    const { x, y, rotate } = parseTransform('rotate (-1.5707963267949) translate (2.54cm 1.27cm)');
    expect(x).toBeCloseTo(72);
    expect(y).toBeCloseTo(36);
    expect(rotate).toBeCloseTo(90);
  });

  it('reads a half turn and a plain translation', () => {
    expect(parseTransform('rotate (3.14159265358979) translate (0cm 0cm)').rotate).toBeCloseTo(
      -180,
    );
    expect(parseTransform('translate (1in 2in)')).toEqual({ x: 72, y: 144, rotate: 0 });
  });

  it('refuses transforms it cannot reproduce', () => {
    expect(() => parseTransform('skewX (0.2)')).toThrow();
  });
});

describe('roundRectRadius', () => {
  it('is a share of the shorter side, 1/6 by default and at most half', () => {
    expect(roundRectRadius(300, 60, 10000)).toBeCloseTo(6);
    expect(roundRectRadius(300, 60)).toBeCloseTo(10, 1);
    expect(roundRectRadius(300, 60, 90000)).toBe(30);
  });
});

it('maps JetBrains Mono to the mono font and everything else to the sans', () => {
  expect(fontKind('JetBrains Mono')).toBe('mono');
  expect(fontKind('Inter')).toBe('sans');
  expect(fontKind('Liberation Sans')).toBe('sans');
});

const run = (text: string, font: Run['font'] = 'mono', size = 10): Run => ({
  text,
  font,
  size,
  weight: 400,
  color: '#ffffff',
});
const paragraph = (runs: Run[], lineHeight: Paragraph['lineHeight'] = 1): Paragraph => ({
  align: 'left',
  lineHeight,
  font: 'mono',
  size: 10,
  runs,
});
const body = (paragraphs: Paragraph[]): TextBody => ({
  inset: [0, 0, 0, 0],
  valign: 'top',
  wrap: true,
  paragraphs,
});

describe('fitMono', () => {
  it('tracks a box’s mono text in just enough for its widest code line to fit', () => {
    // 20 characters of 10 pt mono are 120 pt wide; the box is 110 pt.
    const text = body([paragraph([run('x'.repeat(20))]), paragraph([run('short')])]);
    const fitted = fitMono(text, 110);
    const spacing = fitted.paragraphs.map((p) => p.runs[0]?.letterSpacing ?? 0);
    expect(spacing[0]).toBeLessThan(0);
    expect(spacing[1]).toBe(spacing[0]);
    expect(20 * (6 + (spacing[0] ?? 0))).toBeLessThanOrEqual(110);
  });

  it('leaves text alone when it fits, and ignores trailing spaces and mixed prose', () => {
    const fits = body([paragraph([run('x'.repeat(18) + '      ')])]);
    expect(fitMono(fits, 110)).toBe(fits);
    const prose = body([
      paragraph([run('> ', 'mono'), run('a long line of prose'.repeat(3), 'sans')]),
    ]);
    expect(fitMono(prose, 110)).toBe(prose);
  });
});

describe('line height', () => {
  it('is Inter’s single spacing times the paragraph’s proportion, for every run alike', () => {
    const p = paragraph([run('a', 'sans')], 1.5);
    expect(paragraphStyle(p)['line-height']).toBe('1.82');
    expect(runStyle(run('b', 'mono'), p)['line-height']).toBe('1.82');
  });

  it('is a fixed height when the deck gives one', () => {
    const p = paragraph([run('a')], { pt: 18 });
    expect(runStyle(run('a'), p)['line-height']).toBe('calc(18 * var(--pt))');
  });
});

describe('the TDD talk', () => {
  const talk = tdd as Talk;
  const texts = talk.slides.flatMap((slide) =>
    slide.elements.flatMap((element) =>
      (element.text?.paragraphs ?? []).flatMap((p) => p.runs.map((r) => r.text)),
    ),
  );

  it('has all 28 slides, each with a title and something on it', () => {
    expect(talk.slides).toHaveLength(28);
    for (const slide of talk.slides) {
      expect(slide.title.trim()).not.toBe('');
      expect(slide.elements.length).toBeGreaterThan(0);
    }
  });

  it('places every element at finite coordinates', () => {
    for (const element of talk.slides.flatMap((slide) => slide.elements)) {
      for (const value of [element.x, element.y, element.w, element.h]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('carries no master placeholder text', () => {
    expect(texts.some((text) => /click to edit/i.test(text))).toBe(false);
  });

  it('numbers its slides from the deck’s page-number fields', () => {
    expect(texts).toContain('2');
    expect(texts).toContain('28');
  });

  it('finds every picture it uses in public/', () => {
    const sources = talk.slides
      .flatMap((slide) => slide.elements)
      .flatMap((element) => (element.geometry?.type === 'image' ? [element.geometry.src] : []));
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) expect(existsSync(path.join('public', src)), src).toBe(true);
  });
});
