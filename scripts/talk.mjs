/**
 * Converts a LibreOffice Impress deck into the slide model behind /talks/<slug>/. Run with
 * `npm run talk -- content/talks/<slug>.odp` after changing the deck; it writes
 * `src/data/talks/<slug>.json` and copies the pictures the slides use to
 * `public/talks/<slug>/`. Both are generated: edit the deck, not them.
 *
 * What it keeps: every shape, text frame, line and picture on each slide, plus the
 * master's own decorations (the footer). What it drops: slide backgrounds (the site's
 * particles take their place), the master's placeholders and the speaker notes.
 *
 * It understands what the decks here use: rectangles, rounded rectangles, ellipses,
 * triangles and right braces (pptx shapes as LibreOffice saves them), lines with arrow
 * markers and dashes, text frames, pictures and groups. Anything else stops the run, so a
 * new kind of shape is noticed rather than silently lost.
 *
 * `content/talks/<slug>.overrides.json`, if present, replaces whole slides with
 * hand-written elements in the same model (`{ "slides": { "1": { title, elements } } }`).
 * Pictures from the deck are referenced there by their path in the archive
 * (`Pictures/….png`); pictures the deck no longer has, by their path from the overrides
 * file (`<slug>/….png`).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

import { XMLParser } from 'fast-xml-parser';

import {
  fitMono,
  fontKind,
  parseTransform,
  round,
  roundRectRadius,
  toPt,
} from '../src/lib/talk.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run talk -- content/talks/<slug>.odp');
  process.exit(1);
}
const slug = path.basename(source, '.odp');

// --- The archive -------------------------------------------------------------------------

/** Reads every entry of a zip archive into memory (an .odp is one). */
function unzip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error(`${source} is not a zip archive`);
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    entries.set(name, method === 8 ? inflateRawSync(data) : data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const archive = unzip(readFileSync(source));

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  ignoreDeclaration: true,
  htmlEntities: true,
});

/** Parses XML into `{ name, attrs, children }` nodes and `{ text }` leaves, in document order. */
function parse(name) {
  const toTree = (nodes) =>
    nodes.map((node) => {
      if ('#text' in node) return { text: String(node['#text']) };
      const tag = Object.keys(node).find((key) => key !== ':@');
      return { name: tag, attrs: node[':@'] ?? {}, children: toTree(node[tag] ?? []) };
    });
  return toTree(parser.parse(archive.get(name).toString('utf8')));
}

const child = (node, name) => node?.children.find((c) => c.name === name);
const children = (node, name) => node?.children.filter((c) => c.name === name) ?? [];
const find = (nodes, name) => {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = node.children && find(node.children, name);
    if (found) return found;
  }
  return undefined;
};
const textOf = (node) => node.text ?? node.children.map((c) => textOf(c)).join('');

const content = find(parse('content.xml'), 'office:document-content');
const styles = find(parse('styles.xml'), 'office:document-styles');
const meta = find(parse('meta.xml'), 'office:meta');

// --- Styles ------------------------------------------------------------------------------

function readStyles(container) {
  const map = new Map();
  for (const node of children(container, 'style:style')) {
    map.set(node.attrs['style:name'], {
      family: node.attrs['style:family'],
      parent: node.attrs['style:parent-style-name'],
      graphic: child(node, 'style:graphic-properties')?.attrs ?? {},
      paragraph: child(node, 'style:paragraph-properties')?.attrs ?? {},
      text: child(node, 'style:text-properties')?.attrs ?? {},
    });
  }
  return map;
}

const officeStyles = child(styles, 'office:styles');
const named = readStyles(officeStyles);
const defaults = new Map(
  children(officeStyles, 'style:default-style').map((node) => [
    node.attrs['style:family'],
    {
      graphic: child(node, 'style:graphic-properties')?.attrs ?? {},
      paragraph: child(node, 'style:paragraph-properties')?.attrs ?? {},
      text: child(node, 'style:text-properties')?.attrs ?? {},
    },
  ]),
);
const markers = new Map(
  children(officeStyles, 'draw:marker').map((node) => [node.attrs['draw:name'], node.attrs]),
);
const dashes = new Map(
  children(officeStyles, 'draw:stroke-dash').map((node) => [node.attrs['draw:name'], node.attrs]),
);
const fonts = new Map(
  [child(content, 'office:font-face-decls'), child(styles, 'office:font-face-decls')]
    .flatMap((decls) => children(decls, 'style:font-face'))
    .map((node) => [node.attrs['style:name'], node.attrs['svg:font-family'].replaceAll("'", '')]),
);

/** Slides look styles up among content.xml's automatic styles, masters among styles.xml's. */
function styleSheet(automatic) {
  const local = readStyles(automatic);
  const get = (name) => local.get(name) ?? named.get(name);
  /** Property layers of a style, outermost first: family default, ancestors, the style. */
  const layers = (name, kind) => {
    const chain = [];
    for (let style = get(name); style; style = style.parent ? get(style.parent) : undefined) {
      chain.unshift(style[kind]);
    }
    const family = get(name)?.family;
    const fallback = defaults.get(family === 'presentation' ? 'graphic' : family);
    return name ? [fallback?.[kind] ?? {}, ...chain] : [];
  };
  return {
    layers,
    props: (name, kind) => Object.assign({}, ...layers(name, kind)),
    get,
  };
}

const slideStyles = styleSheet(child(content, 'office:automatic-styles'));
const masterStyles = styleSheet(child(styles, 'office:automatic-styles'));

// --- Text --------------------------------------------------------------------------------

const WEIGHTS = { normal: 400, bold: 700 };

/** Folds text-property layers (outermost first) into a run style. */
function runStyle(layers) {
  const run = { font: 'sans', size: 18, weight: 400, color: '#ffffff' };
  for (const props of layers) {
    const family = props['style:font-name']
      ? fonts.get(props['style:font-name'])
      : props['fo:font-family'];
    if (family) run.font = fontKind(family);
    const size = props['fo:font-size'];
    if (size) run.size = size.endsWith('%') ? (run.size * parseFloat(size)) / 100 : toPt(size);
    const weight = props['fo:font-weight'];
    if (weight) run.weight = WEIGHTS[weight] ?? Number(weight);
    if (props['fo:font-style']) run.italic = props['fo:font-style'] === 'italic';
    if (props['fo:color']) run.color = props['fo:color'];
    const strike = props['style:text-line-through-style'];
    if (strike) run.strike = strike !== 'none';
    const underline = props['style:text-underline-style'];
    if (underline) run.underline = underline !== 'none';
    const spacing = props['fo:letter-spacing'];
    if (spacing) run.letterSpacing = spacing === 'normal' ? undefined : toPt(spacing) || undefined;
    const transform = props['fo:text-transform'];
    if (transform) run.transform = transform === 'none' ? undefined : transform;
    const position = props['style:text-position'];
    if (position) {
      const shift = position.split(' ')[0];
      run.baseline =
        shift === 'super' || parseFloat(shift) > 0
          ? 'super'
          : shift === 'sub' || parseFloat(shift) < 0
            ? 'sub'
            : undefined;
    }
    if (props['loext:glow-text-radius']) {
      const radius = toPt(props['loext:glow-text-radius']);
      const alpha = 1 - parseFloat(props['loext:glow-text-transparency'] ?? '0') / 100;
      run.glow =
        radius > 0
          ? { radius, color: withAlpha(props['loext:glow-text-color'], alpha) }
          : undefined;
    }
  }
  return compact(run);
}

function withAlpha(hex, alpha) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return alpha >= 1 ? hex : `rgb(${r} ${g} ${b} / ${round(alpha)})`;
}

/** Drops unset and false fields so the JSON stays small. */
function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== false),
  );
}

function paragraphStyle(props, strut) {
  const align = {
    start: 'left',
    left: 'left',
    center: 'center',
    end: 'right',
    right: 'right',
    justify: 'justify',
  }[props['fo:text-align'] ?? 'start'];
  const height = props['fo:line-height'];
  const lineHeight =
    height && !height.endsWith('%')
      ? { pt: round(toPt(height)) }
      : parseFloat(height ?? '100%') / 100;
  const length = (name) => (props[name] ? round(toPt(props[name])) || undefined : undefined);
  return compact({
    align,
    lineHeight,
    font: strut.font,
    size: round(strut.size),
    marginTop: length('fo:margin-top'),
    marginBottom: length('fo:margin-bottom'),
    marginLeft: length('fo:margin-left'),
    marginRight: length('fo:margin-right'),
    indent: length('fo:text-indent'),
  });
}

/**
 * The paragraphs of a shape's text. Text styles stack from the shape's graphic style
 * through its default paragraph style (`draw:text-style-name`) and the paragraph's own
 * style to each span. Spaces are kept as written (LibreOffice shows them so) and
 * `text:s` expands to its count. An empty paragraph is as tall as its (empty) span's font.
 */
function paragraphs(nodes, sheet, shape, slideNumber) {
  const textLayers = [...shape.textLayers];
  const paragraphLayers = [...shape.paragraphLayers];
  const result = [];
  for (const node of nodes) {
    if (node.name === 'text:list') throw new Error('Lists are not supported yet');
    if (node.name !== 'text:p') continue;
    const style = node.attrs['text:style-name'];
    const baseLayers = [...textLayers, ...sheet.layers(style, 'text')];
    let base = runStyle(baseLayers);
    const runs = [];
    const push = (text, layers) => {
      const run = { text, ...runStyle(layers) };
      const last = runs.at(-1);
      if (last && JSON.stringify({ ...last, text: '' }) === JSON.stringify({ ...run, text: '' })) {
        last.text += text;
      } else {
        runs.push(run);
      }
    };
    const walk = (items, layers) => {
      for (const item of items) {
        if (item.text !== undefined) push(item.text, layers);
        else if (item.name === 'text:span') {
          const spanLayers = [...layers, ...sheet.layers(item.attrs['text:style-name'], 'text')];
          if (item.children.length === 0) base = runStyle(spanLayers);
          walk(item.children, spanLayers);
        } else if (item.name === 'text:s')
          push(' '.repeat(Number(item.attrs['text:c'] ?? 1)), layers);
        else if (item.name === 'text:tab') push('\t', layers);
        else if (item.name === 'text:line-break') push('\n', layers);
        else if (item.name === 'text:page-number') push(String(slideNumber), layers);
        else walk(item.children, layers);
      }
    };
    walk(node.children, baseLayers);
    const props = Object.assign({}, ...paragraphLayers, ...sheet.layers(style, 'paragraph'));
    const strut = runs.reduce(
      (smallest, run) => (run.size < smallest.size ? run : smallest),
      runs[0] ?? base,
    );
    result.push({
      ...paragraphStyle(props, strut),
      runs: runs.map((run) => ({ ...run, size: round(run.size) })),
    });
  }
  return result;
}

// --- Shapes ------------------------------------------------------------------------------

/** Fill, stroke and text-area settings of a shape from its graphic or presentation style. */
function shapeStyle(node, sheet) {
  const name = node.attrs['draw:style-name'] ?? node.attrs['presentation:style-name'];
  const textStyle = node.attrs['draw:text-style-name'];
  return {
    graphic: sheet.props(name, 'graphic'),
    textLayers: [...sheet.layers(name, 'text'), ...sheet.layers(textStyle, 'text')],
    paragraphLayers: [...sheet.layers(name, 'paragraph'), ...sheet.layers(textStyle, 'paragraph')],
  };
}

function paint(graphic) {
  const result = {};
  const opacity = parseFloat(graphic['draw:opacity'] ?? '100%') / 100;
  if (
    graphic['draw:fill'] === 'solid' &&
    graphic['loext:fill-use-slide-background'] !== 'true' &&
    opacity > 0
  ) {
    result.fill = graphic['draw:fill-color'];
    if (opacity < 1) result.fillOpacity = round(opacity);
  } else if (graphic['draw:fill'] && !['none', 'solid'].includes(graphic['draw:fill'])) {
    throw new Error(`Unsupported fill: ${graphic['draw:fill']}`);
  }
  const stroke = graphic['draw:stroke'];
  if (stroke && stroke !== 'none') {
    const width = Math.max(toPt(graphic['svg:stroke-width'] ?? '0pt'), 0.5);
    result.stroke = { color: graphic['svg:stroke-color'], width: round(width) };
    if (stroke === 'dash') {
      const dash = dashes.get(graphic['draw:stroke-dash']);
      if (!dash) throw new Error(`Unknown dash: ${graphic['draw:stroke-dash']}`);
      const length = (value) =>
        round(value.endsWith('%') ? (width * parseFloat(value)) / 100 : toPt(value));
      const gap = length(dash['draw:distance'] ?? '100%');
      result.stroke.dash = [
        ...Array.from({ length: Number(dash['draw:dots1'] ?? 0) }, () => [
          length(dash['draw:dots1-length'] ?? '100%'),
          gap,
        ]),
        ...Array.from({ length: Number(dash['draw:dots2'] ?? 0) }, () => [
          length(dash['draw:dots2-length'] ?? '100%'),
          gap,
        ]),
      ].flat();
      if (dash['draw:style'] === 'round') result.stroke.cap = 'round';
    }
    if (graphic['svg:stroke-linecap'] && graphic['svg:stroke-linecap'] !== 'butt') {
      result.stroke.cap = graphic['svg:stroke-linecap'];
    }
  }
  return result;
}

/**
 * The text area: padding from the style, plus the shape's own text inset (rounded corners,
 * ellipses). A text frame that grows with its text (LibreOffice's default for frames drawn
 * in Impress) is exactly as tall as its lines in the fallback fonts the deck was laid out
 * with; centring the text in it keeps the lines where they were, whatever the fonts' heights.
 */
function textBody(nodes, sheet, shape, slideNumber, extraInset, heading, width, frame) {
  const body = paragraphs(nodes, sheet, shape, slideNumber);
  if (body.every((p) => p.runs.length === 0)) return undefined;
  const g = shape.graphic;
  const padding = (side) => (g[`fo:padding-${side}`] ? toPt(g[`fo:padding-${side}`]) : 0);
  const [it, ir, ib, il] = extraInset;
  const halign = { center: 'center', right: 'right' }[g['draw:textarea-horizontal-align']];
  const grows = frame && g['draw:auto-grow-height'] !== 'false';
  const text = compact({
    heading: heading || undefined,
    inset: [
      padding('top') + it,
      padding('right') + ir,
      padding('bottom') + ib,
      padding('left') + il,
    ].map(round),
    valign: grows
      ? 'middle'
      : ({ middle: 'middle', bottom: 'bottom' }[g['draw:textarea-vertical-align']] ?? 'top'),
    halign,
    wrap: (g['fo:wrap-option'] ?? 'wrap') !== 'no-wrap',
    paragraphs: body,
  });
  return fitMono(text, width);
}

function box(node) {
  const transform = node.attrs['draw:transform'];
  const w = toPt(node.attrs['svg:width']);
  const h = toPt(node.attrs['svg:height']);
  if (transform) {
    const { x, y, rotate } = parseTransform(transform);
    return { x, y, w, h, rotate };
  }
  return { x: toPt(node.attrs['svg:x'] ?? '0cm'), y: toPt(node.attrs['svg:y'] ?? '0cm'), w, h };
}

function rightBrace(w, h, [a = 1800, m = 10800]) {
  const X = (v) => round((v / 21600) * w);
  const Y = (v) => round((v / 21600) * h);
  return [
    `M0 0C${X(5400)} 0 ${X(10800)} ${Y(a / 2)} ${X(10800)} ${Y(a)}`,
    `L${X(10800)} ${Y(m - a)}`,
    `C${X(10800)} ${Y(m - a / 2)} ${X(16200)} ${Y(m)} ${X(21600)} ${Y(m)}`,
    `C${X(16200)} ${Y(m)} ${X(10800)} ${Y(m + a / 2)} ${X(10800)} ${Y(m + a)}`,
    `L${X(10800)} ${Y(21600 - a)}`,
    `C${X(10800)} ${Y(21600 - a / 2)} ${X(5400)} ${Y(21600)} 0 ${Y(21600)}`,
  ].join('');
}

/** Geometry of a custom shape, and how far its text area sits inside its box. */
function customGeometry(geometry, w, h) {
  const type = geometry.attrs['draw:type'];
  const modifiers = (geometry.attrs['draw:modifiers'] ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  switch (type) {
    case 'ooxml-rect':
    case 'rectangle':
      return { geometry: { type: 'rect' }, inset: [0, 0, 0, 0] };
    case 'ooxml-roundRect': {
      const radius = roundRectRadius(w, h, modifiers[0]);
      const inset = radius * 0.29289;
      return {
        geometry: { type: 'rect', radius: round(radius) },
        inset: [inset, inset, inset, inset],
      };
    }
    case 'ooxml-ellipse':
    case 'ellipse': {
      const [dx, dy] = [w * 0.14645, h * 0.14645];
      return { geometry: { type: 'ellipse' }, inset: [dy, dx, dy, dx] };
    }
    case 'ooxml-triangle': {
      const apex = round((w * (modifiers[0] ?? 50000)) / 100000);
      return {
        geometry: { type: 'path', d: `M${apex} 0L${round(w)} ${round(h)}H0Z` },
        inset: [h / 2, w / 4, 0, w / 4],
      };
    }
    case 'right-brace':
      return { geometry: { type: 'path', d: rightBrace(w, h, modifiers) }, inset: [0, 0, 0, 0] };
    default:
      throw new Error(`Unsupported shape: ${type}`);
  }
}

/** An arrowhead from a `draw:marker`, its tip on `tip`, pointing away from `from`. */
function arrowhead(markerName, width, tip, from) {
  const marker = markers.get(markerName);
  if (!marker) throw new Error(`Unknown marker: ${markerName}`);
  const [, , vbWidth] = marker['svg:viewBox'].split(/\s+/).map(Number);
  const scale = width / vbWidth;
  const points = [];
  let [x, y] = [0, 0];
  for (const [, command, args] of marker['svg:d'].matchAll(/([MmLlHhVvZz])([^MmLlHhVvZz]*)/g)) {
    const values = args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (command === 'Z' || command === 'z') continue;
    for (let i = 0; i < Math.max(values.length, 1);) {
      if (command === 'M' || command === 'L') [x, y] = [values[i++], values[i++]];
      else if (command === 'm' || command === 'l') [x, y] = [x + values[i++], y + values[i++]];
      else if (command === 'H') x = values[i++];
      else if (command === 'h') x += values[i++];
      else if (command === 'V') y = values[i++];
      else if (command === 'v') y += values[i++];
      points.push([x, y]);
    }
  }
  const length = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  const [dx, dy] = [(tip[0] - from[0]) / length, (tip[1] - from[1]) / length];
  const placed = points.map(([px, py]) => {
    const [u, v] = [(px - vbWidth / 2) * scale, py * scale];
    return [tip[0] - v * dx - u * dy, tip[1] - v * dy + u * dx];
  });
  const depth = Math.max(...points.map(([, py]) => py)) * scale;
  return { d: `M${placed.map(([px, py]) => `${round(px)} ${round(py)}`).join('L')}Z`, depth };
}

function line(node, sheet) {
  const { graphic } = shapeStyle(node, sheet);
  const [x1, y1, x2, y2] = ['svg:x1', 'svg:y1', 'svg:x2', 'svg:y2'].map((name) =>
    toPt(node.attrs[name]),
  );
  const { stroke } = paint(graphic);
  if (!stroke) return undefined;
  const pad = stroke.width * 6;
  const origin = [Math.min(x1, x2) - pad, Math.min(y1, y2) - pad];
  const local = ([x, y]) => [x - origin[0], y - origin[1]];
  let start = local([x1, y1]);
  let end = local([x2, y2]);
  const arrows = [];
  for (const [which, tip, from] of [
    ['end', end, start],
    ['start', start, end],
  ]) {
    const name = graphic[`draw:marker-${which}`];
    if (!name) continue;
    const head = arrowhead(name, toPt(graphic[`draw:marker-${which}-width`] ?? '0.2cm'), tip, from);
    arrows.push(head.d);
    // Pull the line back under the arrowhead so its square end can't poke out of the tip.
    const length = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
    const back = [
      tip[0] - ((tip[0] - from[0]) / length) * head.depth * 0.5,
      tip[1] - ((tip[1] - from[1]) / length) * head.depth * 0.5,
    ];
    if (which === 'end') end = back;
    else start = back;
  }
  return compact({
    x: origin[0],
    y: origin[1],
    w: Math.abs(x2 - x1) + pad * 2,
    h: Math.abs(y2 - y1) + pad * 2,
    geometry: {
      type: 'path',
      d: `M${round(start[0])} ${round(start[1])}L${round(end[0])} ${round(end[1])}`,
    },
    stroke,
    arrows: arrows.length > 0 ? arrows : undefined,
  });
}

const pictures = new Set();

function convert(node, sheet, slideNumber, onMaster) {
  const name = node.name;
  if (name === 'draw:g')
    return node.children.flatMap((c) => convert(c, sheet, slideNumber, onMaster));
  // Notes, themes, animations and the like: only `draw:*` elements are drawn.
  if (!name?.startsWith('draw:')) return [];
  // On a master only its own decorations show; title, outline and number are placeholders.
  if (onMaster && node.attrs?.['presentation:class']) return [];
  if (node.attrs?.['presentation:placeholder'] === 'true' && !find(node.children, 'text:span'))
    return [];

  if (name === 'draw:line') {
    const element = line(node, sheet);
    return element ? [roundBox(element)] : [];
  }
  const shape = shapeStyle(node, sheet);
  const heading = node.attrs['presentation:class'] === 'title';
  if (name === 'draw:custom-shape') {
    const geometryNode = child(node, 'draw:enhanced-geometry');
    const placed = box(node);
    const { geometry, inset } = customGeometry(geometryNode, placed.w, placed.h);
    const text = textBody(node.children, sheet, shape, slideNumber, inset, heading, placed.w);
    return [
      roundBox(
        compact({
          ...placed,
          flipX: geometryNode.attrs['draw:mirror-horizontal'] === 'true' || undefined,
          flipY: geometryNode.attrs['draw:mirror-vertical'] === 'true' || undefined,
          geometry,
          ...paint(shape.graphic),
          text,
        }),
      ),
    ];
  }
  if (name === 'draw:frame') {
    const placed = box(node);
    const image = child(node, 'draw:image');
    if (image) {
      const href = image.attrs['xlink:href'];
      pictures.add(href);
      const desc = child(node, 'svg:desc') ?? child(node, 'svg:title');
      return [
        roundBox({
          ...placed,
          geometry: { type: 'image', src: publicPath(href), alt: desc ? textOf(desc).trim() : '' },
        }),
      ];
    }
    const textBox = child(node, 'draw:text-box');
    if (textBox) {
      const text = textBody(
        textBox.children,
        sheet,
        shape,
        slideNumber,
        [0, 0, 0, 0],
        heading,
        placed.w,
        true,
      );
      const painted = paint(shape.graphic);
      if (!text && !painted.fill && !painted.stroke) return [];
      return [roundBox(compact({ ...placed, geometry: { type: 'rect' }, ...painted, text }))];
    }
  }
  throw new Error(`Unsupported element on slide ${slideNumber}: ${name}`);
}

function roundBox(element) {
  return {
    ...element,
    x: round(element.x),
    y: round(element.y),
    w: round(element.w),
    h: round(element.h),
    ...(element.rotate ? { rotate: round(element.rotate) } : {}),
  };
}

const publicPath = (href) => `/talks/${slug}/${path.basename(href)}`;

// --- Slides ------------------------------------------------------------------------------

const masters = new Map(
  children(child(styles, 'office:master-styles'), 'style:master-page').map((node) => [
    node.attrs['style:name'],
    node,
  ]),
);
const presentation = child(child(content, 'office:body'), 'office:presentation');
const pages = children(presentation, 'draw:page');

const overridesFile = path.join(path.dirname(source), `${slug}.overrides.json`);
const overrides = existsSync(overridesFile)
  ? JSON.parse(readFileSync(overridesFile, 'utf8')).slides
  : {};

const slides = pages.map((page, index) => {
  const number = index + 1;
  const override = overrides[number];
  if (override) {
    const elements = override.elements.map((element) => {
      if (element.geometry?.type !== 'image') return element;
      pictures.add(element.geometry.src);
      return {
        ...element,
        geometry: { ...element.geometry, src: publicPath(element.geometry.src) },
      };
    });
    return { title: override.title, elements };
  }
  const pageProps =
    child(
      children(child(content, 'office:automatic-styles'), 'style:style').find(
        (style) => style.attrs['style:name'] === page.attrs['draw:style-name'],
      ),
      'style:drawing-page-properties',
    )?.attrs ?? {};
  const master = masters.get(page.attrs['draw:master-page-name']);
  const fromMaster =
    pageProps['presentation:background-objects-visible'] === 'false'
      ? []
      : master.children.flatMap((node) => convert(node, masterStyles, number, true));
  const own = page.children.flatMap((node) => convert(node, slideStyles, number, false));
  const titleNode = page.children.find((node) => node.attrs?.['presentation:class'] === 'title');
  const title = titleNode ? textOf(titleNode).trim() : page.attrs['draw:name'];
  return { title, elements: [...fromMaster, ...own] };
});

// --- Output ------------------------------------------------------------------------------

const metaTitle = child(meta, 'dc:title');
const talk = { title: metaTitle ? textOf(metaTitle).trim() : slug, slides };

const dataDir = path.join(root, 'src', 'data', 'talks');
mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, `${slug}.json`), `${JSON.stringify(talk, null, 2)}\n`);

const pictureDir = path.join(root, 'public', 'talks', slug);
rmSync(pictureDir, { recursive: true, force: true });
mkdirSync(pictureDir, { recursive: true });
for (const href of pictures) {
  const file = path.join(path.dirname(source), href);
  const data = href.startsWith('Pictures/')
    ? archive.get(href)
    : existsSync(file)
      ? readFileSync(file)
      : undefined;
  if (!data) throw new Error(`Missing picture: ${href}`);
  writeFileSync(path.join(pictureDir, path.basename(href)), data);
}

console.log(
  `${slides.length} slides, ${pictures.size} pictures → src/data/talks/${slug}.json, public/talks/${slug}/`,
);
