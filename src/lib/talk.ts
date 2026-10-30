/**
 * The slide model behind /talks/<slug>/, and the pure helpers that build and render it.
 * `scripts/talk.mjs` converts a LibreOffice Impress deck (`content/talks/<slug>.odp`) into
 * this model as JSON (`src/data/talks/<slug>.json`); `src/components/talk/` renders it as
 * absolutely positioned HTML on a 16:9 stage, so text stays text in the site's own fonts.
 *
 * Every length in the model is in points on a 960 × 540 pt slide (13.333 × 7.5 in, the
 * deck's 33.867 × 19.05 cm). The stage defines `--pt` as one point at its current size.
 */

export const SLIDE = { width: 960, height: 540 } as const;

export type FontKind = 'sans' | 'mono';

export interface Glow {
  radius: number;
  color: string;
}

export interface Run {
  text: string;
  font: FontKind;
  size: number;
  weight: number;
  color: string;
  italic?: true;
  strike?: true;
  underline?: true;
  letterSpacing?: number;
  transform?: 'uppercase' | 'lowercase' | 'capitalize';
  baseline?: 'super' | 'sub';
  glow?: Glow;
}

export interface Paragraph {
  align: 'left' | 'center' | 'right' | 'justify';
  /** Proportional line spacing (1 is single, the font's own line height), or fixed in pt. */
  lineHeight: number | { pt: number };
  /**
   * Font of the line's strut: the smallest run, so the paragraph never adds height of its
   * own, or the paragraph's font when it is empty (an empty paragraph still takes a line).
   */
  font: FontKind;
  size: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  indent?: number;
  runs: Run[];
}

export interface TextBody {
  /** Slide titles render as `<h2>`. */
  heading?: true;
  /** Distance of the text area from the element's box: top, right, bottom, left. */
  inset: [number, number, number, number];
  valign: 'top' | 'middle' | 'bottom';
  /** Where a text block narrower than the area sits; only matters without wrapping. */
  halign?: 'center' | 'right';
  wrap: boolean;
  paragraphs: Paragraph[];
}

export interface Stroke {
  color: string;
  width: number;
  dash?: number[];
  cap?: 'round' | 'square';
}

export type Geometry =
  | { type: 'rect'; radius?: number }
  | { type: 'ellipse' }
  /** An SVG path in the element's own coordinates (0,0 is its top-left corner). */
  | { type: 'path'; d: string }
  | { type: 'image'; src: string; alt: string };

export interface Element {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees clockwise about the top-left corner. */
  rotate?: number;
  flipX?: true;
  flipY?: true;
  geometry?: Geometry;
  fill?: string;
  fillOpacity?: number;
  stroke?: Stroke;
  /** Arrowheads in the element's coordinates, filled with the stroke colour. */
  arrows?: string[];
  glow?: Glow;
  text?: TextBody;
}

export interface Slide {
  title: string;
  elements: Element[];
}

export interface Talk {
  title: string;
  slides: Slide[];
}

const POINTS_PER: Record<string, number> = {
  pt: 1,
  pc: 12,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
  px: 0.75,
};

/** An ODF length (`1.524cm`, `18pt`, `0.5in`) in points. */
export function toPt(length: string): number {
  const [, value, unit] =
    /^(-?[\d.]+(?:e-?\d+)?)\s*(pt|pc|in|cm|mm|px)$/i.exec(length.trim()) ?? [];
  if (value === undefined || unit === undefined) throw new Error(`Not a length: "${length}"`);
  return Number(value) * (POINTS_PER[unit.toLowerCase()] ?? NaN);
}

/** Rounds to 1/100 pt, which is far below a pixel at any size the slides show at. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Reads an ODF `draw:transform` such as `rotate (-1.5707963267949) translate (11.873cm
 * 6.274cm)`. ODF applies the operations in the order written and turns positive angles
 * counter-clockwise; CSS turns them clockwise, so the angle flips sign. Returns where the
 * shape's top-left corner lands and its clockwise rotation in degrees.
 */
export function parseTransform(transform: string): { x: number; y: number; rotate: number } {
  let x = 0;
  let y = 0;
  let angle = 0;
  for (const [, op, args = ''] of transform.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const [first = '0', second] = args.trim().split(/[\s,]+/);
    if (op === 'rotate') {
      const theta = Number(first);
      // Rotating an already translated point turns it about the origin too.
      [x, y] = [
        x * Math.cos(theta) + y * Math.sin(theta),
        -x * Math.sin(theta) + y * Math.cos(theta),
      ];
      angle += theta;
    } else if (op === 'translate') {
      x += toPt(first);
      y += second ? toPt(second) : 0;
    } else {
      throw new Error(`Unsupported transform: ${op}`);
    }
  }
  const degrees = -(angle * 180) / Math.PI;
  return { x, y, rotate: Math.abs(degrees) < 1e-6 ? 0 : degrees };
}

/**
 * JetBrains Mono is about a tenth wider than the mono font LibreOffice falls back to, which
 * the deck was laid out with, so some code lines no longer fit their boxes and would wrap.
 * Where a line set wholly in mono (code, labels) is wider than the text area, every mono
 * run in the box is tracked in by the same share of its size, just enough for the widest
 * line to fit: lines get no breaks they lack in the deck, and code columns stay aligned.
 */
export function fitMono(text: TextBody, width: number): TextBody {
  const available = width - text.inset[1] - text.inset[3];
  let squeeze = 0;
  for (const paragraph of text.paragraphs) {
    const runs = paragraph.runs.filter((run) => run.text.trim() !== '');
    if (runs.length === 0 || runs.some((run) => run.font !== 'mono')) continue;
    for (const line of lines(paragraph.runs)) {
      const count = (part: string) => [...part].length;
      const ems = line.reduce((sum, [run, part]) => sum + count(part) * run.size, 0);
      const advance = line.reduce(
        (sum, [run, part]) =>
          sum + count(part) * (MONO_ADVANCE * run.size + (run.letterSpacing ?? 0)),
        0,
      );
      if (advance > available) squeeze = Math.max(squeeze, (advance - available) / ems + 0.002);
    }
  }
  if (squeeze === 0) return text;
  return {
    ...text,
    paragraphs: text.paragraphs.map((paragraph) => ({
      ...paragraph,
      runs: paragraph.runs.map((run) =>
        run.font === 'mono'
          ? { ...run, letterSpacing: round((run.letterSpacing ?? 0) - squeeze * run.size) }
          : run,
      ),
    })),
  };
}

/** The lines of a paragraph as (run, text) pieces, trailing spaces left out: they hang. */
function lines(runs: Run[]): [Run, string][][] {
  const result: [Run, string][][] = [[]];
  for (const run of runs) {
    run.text.split('\n').forEach((part, index) => {
      if (index > 0) result.push([]);
      result.at(-1)!.push([run, part]);
    });
  }
  return result.map((line) => {
    const trimmed = [...line];
    while (trimmed.length > 0) {
      const [run, part] = trimmed.at(-1)!;
      if (part.trimEnd() !== '') {
        trimmed[trimmed.length - 1] = [run, part.trimEnd()];
        break;
      }
      trimmed.pop();
    }
    return trimmed;
  });
}

/** Corner radius of an `ooxml-roundRect`: its adjustment is a share of the shorter side. */
export function roundRectRadius(w: number, h: number, adjustment = 16667): number {
  return (Math.min(w, h) * Math.min(Math.max(adjustment, 0), 50000)) / 100000;
}

/** JetBrains Mono (and any other monospace face) maps to the site's mono font, the rest to Inter. */
export function fontKind(family: string): FontKind {
  return /mono|courier|consolas/i.test(family) ? 'mono' : 'sans';
}

/** A length in points as CSS, scaled to the stage. */
export function pt(value: number): string {
  return `calc(${round(value)} * var(--pt))`;
}

function glowShadow({ radius, color }: Glow): string {
  return `0 0 ${pt(radius)} ${color}, 0 0 ${pt(radius * 2)} ${color}`;
}

/** Position, size and rotation of an element's box on the stage. */
export function boxStyle(element: Element): Record<string, string> {
  const style: Record<string, string> = {
    left: pt(element.x),
    top: pt(element.y),
    width: pt(element.w),
    height: pt(element.h),
  };
  const transforms = [
    element.rotate ? `rotate(${round(element.rotate)}deg)` : '',
    element.flipX ? 'scaleX(-1)' : '',
    element.flipY ? 'scaleY(-1)' : '',
  ].filter(Boolean);
  if (element.rotate) style['transform-origin'] = '0 0';
  if (transforms.length > 0) style.transform = transforms.join(' ');
  if (element.glow)
    style.filter = `drop-shadow(0 0 ${pt(element.glow.radius)} ${element.glow.color})`;
  return style;
}

/** The text area inside an element's box. */
export function textAreaStyle(text: TextBody): Record<string, string> {
  const [top, right, bottom, left] = text.inset;
  const justify = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[text.valign];
  const style: Record<string, string> = {
    top: pt(top),
    right: pt(right),
    bottom: pt(bottom),
    left: pt(left),
    'justify-content': justify,
    'white-space': text.wrap ? 'pre-wrap' : 'pre',
  };
  if (text.halign) style['align-items'] = text.halign === 'center' ? 'center' : 'flex-end';
  return style;
}

const FONT_FAMILY: Record<FontKind, string> = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
};

/**
 * Single line spacing in em: Inter's own (ascent plus descent). JetBrains Mono's is taller
 * (1.32), but the deck was laid out with a narrower mono fallback, so mono lines use Inter's
 * spacing too and keep the deck's rhythm.
 */
export const SINGLE_LINE = 1.21;

/** Advance of every JetBrains Mono glyph, in em. */
export const MONO_ADVANCE = 0.6;

/** CSS line height within `paragraph`, the same for every run in it. */
function lineHeight(paragraph: Paragraph): string {
  return typeof paragraph.lineHeight === 'number'
    ? String(round(paragraph.lineHeight * SINGLE_LINE))
    : pt(paragraph.lineHeight.pt);
}

export function paragraphStyle(paragraph: Paragraph): Record<string, string> {
  const style: Record<string, string> = {
    'font-family': FONT_FAMILY[paragraph.font],
    'font-size': pt(paragraph.size),
    'text-align': paragraph.align,
    'line-height': lineHeight(paragraph),
  };
  if (paragraph.marginTop) style['margin-top'] = pt(paragraph.marginTop);
  if (paragraph.marginBottom) style['margin-bottom'] = pt(paragraph.marginBottom);
  if (paragraph.marginLeft) style['margin-left'] = pt(paragraph.marginLeft);
  if (paragraph.marginRight) style['margin-right'] = pt(paragraph.marginRight);
  if (paragraph.indent) style['text-indent'] = pt(paragraph.indent);
  return style;
}

export function runStyle(run: Run, paragraph: Paragraph): Record<string, string> {
  const style: Record<string, string> = {
    'font-family': FONT_FAMILY[run.font],
    'font-size': pt(run.baseline ? run.size * 0.58 : run.size),
    'font-weight': String(run.weight),
    'line-height': lineHeight(paragraph),
    color: run.color,
  };
  if (run.italic) style['font-style'] = 'italic';
  const decorations = [run.strike ? 'line-through' : '', run.underline ? 'underline' : ''];
  if (run.strike || run.underline) style['text-decoration'] = decorations.filter(Boolean).join(' ');
  if (run.letterSpacing) style['letter-spacing'] = pt(run.letterSpacing);
  if (run.transform) style['text-transform'] = run.transform;
  if (run.baseline) style['vertical-align'] = run.baseline;
  if (run.glow) style['text-shadow'] = glowShadow(run.glow);
  return style;
}

/** Inline `style` attribute text from a property map. */
export function css(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([property, value]) => `${property}:${value}`)
    .join(';');
}

/** A slide's label for assistive tech: `Slide 3 of 28: What is TDD?`. */
export function slideLabel(index: number, total: number, title: string): string {
  return `Slide ${index + 1} of ${total}: ${title}`;
}
