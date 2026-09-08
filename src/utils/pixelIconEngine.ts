// High-precision anti-aliased icon rasterizer for React Native
// Emits 100% valid standalone PNG data URIs (48x48) with zero dependencies.
// Supported natively by React Native Image on all platforms (Android, iOS, Web).

const WIDTH = 48;
const HEIGHT = 48;

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array, offset: number, length: number): number {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(bytes: Uint8Array): string {
  let res = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    res += b64Chars[b0 >> 2];
    res += b64Chars[((b0 & 3) << 4) | (b1 >> 4)];
    res += i + 1 < len ? b64Chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    res += i + 2 < len ? b64Chars[b2 & 63] : '=';
  }
  return res;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(colorStr: string): RGBA {
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 255,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 255,
      };
    }
  }
  return { r: 15, g: 23, b: 42, a: 255 };
}

class Canvas48 {
  private buffer: Uint8Array = new Uint8Array(WIDTH * HEIGHT * 4);

  clear() {
    this.buffer.fill(0);
  }

  blendPixel(x: number, y: number, color: RGBA, alphaMultiplier: number) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const idx = (y * WIDTH + x) * 4;
    const srcA = (color.a * alphaMultiplier) / 255;
    if (srcA <= 0) return;

    const dstA = this.buffer[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;

    const r = (color.r * srcA + this.buffer[idx] * dstA * (1 - srcA)) / outA;
    const g = (color.g * srcA + this.buffer[idx + 1] * dstA * (1 - srcA)) / outA;
    const b = (color.b * srcA + this.buffer[idx + 2] * dstA * (1 - srcA)) / outA;

    this.buffer[idx] = Math.round(r);
    this.buffer[idx + 1] = Math.round(g);
    this.buffer[idx + 2] = Math.round(b);
    this.buffer[idx + 3] = Math.round(outA * 255);
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, color: RGBA, strokeWidth: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    const radius = strokeWidth / 2;

    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - radius - 1));
    const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(x0, x1) + radius + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - radius - 1));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(y0, y1) + radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let t = lenSq === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x0 + t * dx;
        const projY = y0 + t * dy;
        const dist = Math.hypot(px - projX, py - projY);
        const alpha = Math.max(0, Math.min(1, radius + 0.65 - dist));
        if (alpha > 0) {
          this.blendPixel(x, y, color, alpha);
        }
      }
    }
  }

  drawCircle(cx: number, cy: number, r: number, color: RGBA, strokeWidth: number) {
    const radius = strokeWidth / 2;
    const minX = Math.max(0, Math.floor(cx - r - radius - 1));
    const maxX = Math.min(WIDTH - 1, Math.ceil(cx + r + radius + 1));
    const minY = Math.max(0, Math.floor(cy - r - radius - 1));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + r + radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const diff = Math.abs(dist - r);
        const alpha = Math.max(0, Math.min(1, radius + 0.65 - diff));
        if (alpha > 0) {
          this.blendPixel(x, y, color, alpha);
        }
      }
    }
  }

  drawFilledCircle(cx: number, cy: number, r: number, color: RGBA) {
    const minX = Math.max(0, Math.floor(cx - r - 1));
    const maxX = Math.min(WIDTH - 1, Math.ceil(cx + r + 1));
    const minY = Math.max(0, Math.floor(cy - r - 1));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + r + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const alpha = Math.max(0, Math.min(1, r + 0.5 - dist));
        if (alpha > 0) {
          this.blendPixel(x, y, color, alpha);
        }
      }
    }
  }

  drawArc(
    cx: number,
    cy: number,
    r: number,
    startAngleRad: number,
    endAngleRad: number,
    color: RGBA,
    strokeWidth: number
  ) {
    const radius = strokeWidth / 2;
    const minX = Math.max(0, Math.floor(cx - r - radius - 1));
    const maxX = Math.min(WIDTH - 1, Math.ceil(cx + r + radius + 1));
    const minY = Math.max(0, Math.floor(cy - r - radius - 1));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + r + radius + 1));

    // Normalize angle diff
    const twoPi = Math.PI * 2;
    let arcLen = endAngleRad - startAngleRad;
    while (arcLen < 0) arcLen += twoPi;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const dist = Math.hypot(px - cx, py - cy);
        const diff = Math.abs(dist - r);
        let ang = Math.atan2(py - cy, px - cx);
        let angDiff = ang - startAngleRad;
        while (angDiff < 0) angDiff += twoPi;

        if (angDiff <= arcLen) {
          const alpha = Math.max(0, Math.min(1, radius + 0.65 - diff));
          if (alpha > 0) this.blendPixel(x, y, color, alpha);
        } else {
          // Check distance to endpoints for rounded caps
          const xStart = cx + r * Math.cos(startAngleRad);
          const yStart = cy + r * Math.sin(startAngleRad);
          const xEnd = cx + r * Math.cos(endAngleRad);
          const yEnd = cy + r * Math.sin(endAngleRad);
          const distEnd = Math.min(Math.hypot(px - xStart, py - yStart), Math.hypot(px - xEnd, py - yEnd));
          const alpha = Math.max(0, Math.min(1, radius + 0.65 - distEnd));
          if (alpha > 0) this.blendPixel(x, y, color, alpha);
        }
      }
    }
  }

  drawRoundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    color: RGBA,
    strokeWidth: number
  ) {
    const r = Math.min(radius, w / 2, h / 2);
    // 4 straight lines
    this.drawLine(x + r, y, x + w - r, y, color, strokeWidth);
    this.drawLine(x + w, y + r, x + w, y + h - r, color, strokeWidth);
    this.drawLine(x + w - r, y + h, x + r, y + h, color, strokeWidth);
    this.drawLine(x, y + h - r, x, y + r, color, strokeWidth);

    // 4 corner arcs
    this.drawArc(x + w - r, y + r, r, -Math.PI / 2, 0, color, strokeWidth);
    this.drawArc(x + w - r, y + h - r, r, 0, Math.PI / 2, color, strokeWidth);
    this.drawArc(x + r, y + h - r, r, Math.PI / 2, Math.PI, color, strokeWidth);
    this.drawArc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2, color, strokeWidth);
  }

  toPngDataUri(): string {
    // 48 scanlines, each = 1 filter byte + 48*4 = 193 bytes
    const rawLen = HEIGHT * (1 + WIDTH * 4);
    const raw = new Uint8Array(rawLen);
    let rawIdx = 0;
    for (let y = 0; y < HEIGHT; y++) {
      raw[rawIdx++] = 0; // Filter: None
      const rowStart = y * WIDTH * 4;
      for (let x = 0; x < WIDTH * 4; x++) {
        raw[rawIdx++] = this.buffer[rowStart + x];
      }
    }

    // Adler32
    let s1 = 1;
    let s2 = 0;
    for (let i = 0; i < rawLen; i++) {
      s1 = (s1 + raw[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    const adler = ((s2 << 16) | s1) >>> 0;

    // Deflate uncompressed block (len = rawLen)
    const zlibLen = 2 + 5 + rawLen + 4;
    const zlib = new Uint8Array(zlibLen);
    zlib[0] = 0x78;
    zlib[1] = 0x01;
    zlib[2] = 0x01; // BFINAL=1, BTYPE=00
    zlib[3] = rawLen & 0xff;
    zlib[4] = (rawLen >> 8) & 0xff;
    zlib[5] = ~rawLen & 0xff;
    zlib[6] = (~rawLen >> 8) & 0xff;
    zlib.set(raw, 7);
    const adlerOffset = 7 + rawLen;
    zlib[adlerOffset] = (adler >> 24) & 0xff;
    zlib[adlerOffset + 1] = (adler >> 16) & 0xff;
    zlib[adlerOffset + 2] = (adler >> 8) & 0xff;
    zlib[adlerOffset + 3] = adler & 0xff;

    // Build PNG chunks
    // Header (8) + IHDR (25) + IDAT (12 + zlibLen) + IEND (12)
    const totalPngLen = 8 + 25 + 12 + zlibLen + 12;
    const png = new Uint8Array(totalPngLen);
    let p = 0;

    // PNG Signature
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], p);
    p += 8;

    // IHDR
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = 13; // len
    const ihdrStart = p;
    png.set([0x49, 0x48, 0x44, 0x52], p);
    p += 4; // type
    // width=48
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = WIDTH;
    // height=48
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = 0;
    png[p++] = HEIGHT;
    png[p++] = 8; // bit depth
    png[p++] = 6; // color type: RGBA
    png[p++] = 0; // compression
    png[p++] = 0; // filter
    png[p++] = 0; // interlace
    const ihdrCrc = crc32(png, ihdrStart, 17);
    png[p++] = (ihdrCrc >> 24) & 0xff;
    png[p++] = (ihdrCrc >> 16) & 0xff;
    png[p++] = (ihdrCrc >> 8) & 0xff;
    png[p++] = ihdrCrc & 0xff;

    // IDAT
    png[p++] = (zlibLen >> 24) & 0xff;
    png[p++] = (zlibLen >> 16) & 0xff;
    png[p++] = (zlibLen >> 8) & 0xff;
    png[p++] = zlibLen & 0xff;
    const idatStart = p;
    png.set([0x49, 0x44, 0x41, 0x54], p);
    p += 4;
    png.set(zlib, p);
    p += zlibLen;
    const idatCrc = crc32(png, idatStart, 4 + zlibLen);
    png[p++] = (idatCrc >> 24) & 0xff;
    png[p++] = (idatCrc >> 16) & 0xff;
    png[p++] = (idatCrc >> 8) & 0xff;
    png[p++] = idatCrc & 0xff;

    // IEND
    png.set([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], p);

    return 'data:image/png;base64,' + toBase64(png);
  }
}

const canvas = new Canvas48();
const iconCache: Record<string, string> = {};

export function getIconPngUri(iconName: string, colorHex: string): string {
  const cacheKey = `${iconName}_${colorHex}`;
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey];
  }

  canvas.clear();
  const col = parseColor(colorHex);
  const stroke = 3.4; // 3.4px at 48x48 = 1.7px at 24x24 (exact Lucide stroke width!)

  switch (iconName) {
    case 'users': {
      // Main figure on left (cx=17, cy=14, r=8)
      canvas.drawCircle(17, 14, 7.5, col, stroke);
      // Main body: arch from x=5 to x=29, top at y=29
      canvas.drawArc(17, 43, 14, -Math.PI + 0.35, -0.35, col, stroke);
      canvas.drawLine(5, 43, 5, 40, col, stroke);
      canvas.drawLine(29, 43, 29, 40, col, stroke);

      // Secondary figure on right
      // Head arc
      canvas.drawArc(33, 14, 7.5, -Math.PI / 3, Math.PI / 3, col, stroke);
      // Body arc
      canvas.drawArc(33, 43, 14, -Math.PI / 3, -0.2, col, stroke);
      canvas.drawLine(44, 43, 44, 40, col, stroke);
      break;
    }

    case 'activity': {
      // Clean heartbeat wave (M22 12h-4l-3 9L9 3l-3 9H2)
      // Scaled to 48x48:
      canvas.drawLine(4, 24, 12, 24, col, stroke);
      canvas.drawLine(12, 24, 18, 41, col, stroke);
      canvas.drawLine(18, 41, 30, 7, col, stroke);
      canvas.drawLine(30, 7, 36, 37, col, stroke);
      canvas.drawLine(36, 37, 40, 24, col, stroke);
      canvas.drawLine(40, 24, 44, 24, col, stroke);
      break;
    }

    case 'calendar': {
      // Outer rounded box: x=7, y=9, w=34, h=34, radius=6
      canvas.drawRoundRect(7, 9, 34, 34, 6, col, stroke);
      // Top binder pins
      canvas.drawLine(16, 4, 16, 12, col, stroke);
      canvas.drawLine(32, 4, 32, 12, col, stroke);
      // Horizontal header divider
      canvas.drawLine(7, 21, 41, 21, col, stroke);
      break;
    }

    case 'user-plus': {
      // Main figure on left (cx=17, cy=14, r=8)
      canvas.drawCircle(17, 14, 7.5, col, stroke);
      canvas.drawArc(17, 43, 14, -Math.PI + 0.35, -0.35, col, stroke);
      canvas.drawLine(5, 43, 5, 40, col, stroke);
      canvas.drawLine(29, 43, 29, 40, col, stroke);

      // Plus sign on upper right
      canvas.drawLine(38, 14, 38, 28, col, stroke);
      canvas.drawLine(31, 21, 45, 21, col, stroke);
      break;
    }

    case 'search': {
      // Lens circle: cx=19, cy=19, r=13
      canvas.drawCircle(19, 19, 12.5, col, stroke);
      // Diagonal handle: from (28, 28) to (42, 42)
      canvas.drawLine(28, 28, 42, 42, col, stroke);
      break;
    }

    case 'filter-x': {
      // Funnel rim
      canvas.drawLine(5, 8, 29, 8, col, stroke);
      // Left funnel slope
      canvas.drawLine(5, 8, 19, 23, col, stroke);
      // Right funnel slope
      canvas.drawLine(29, 8, 22, 16, col, stroke);
      // Funnel stem
      canvas.drawLine(19, 23, 19, 40, col, stroke);
      // Cross 'x' on bottom right
      canvas.drawLine(33, 27, 44, 38, col, stroke);
      canvas.drawLine(44, 27, 33, 38, col, stroke);
      break;
    }

    case 'columns': {
      // Outer rounded rectangle
      canvas.drawRoundRect(6, 6, 36, 36, 6, col, stroke);
      // Two vertical dividing lines
      canvas.drawLine(18, 6, 18, 42, col, stroke);
      canvas.drawLine(30, 6, 30, 42, col, stroke);
      break;
    }

    case 'more-vertical': {
      // 3 vertical dots
      canvas.drawFilledCircle(24, 10, 3.2, col);
      canvas.drawFilledCircle(24, 24, 3.2, col);
      canvas.drawFilledCircle(24, 38, 3.2, col);
      break;
    }

    case 'chevron-down': {
      // Down chevron
      canvas.drawLine(12, 18, 24, 30, col, stroke);
      canvas.drawLine(24, 30, 36, 18, col, stroke);
      break;
    }

    case 'menu': {
      // 3 horizontal bars
      canvas.drawLine(8, 12, 40, 12, col, stroke);
      canvas.drawLine(8, 24, 40, 24, col, stroke);
      canvas.drawLine(8, 36, 40, 36, col, stroke);
      break;
    }

    case 'bell': {
      // Bell dome
      canvas.drawArc(24, 24, 14, -Math.PI, 0, col, stroke);
      canvas.drawLine(10, 24, 8, 35, col, stroke);
      canvas.drawLine(38, 24, 40, 35, col, stroke);
      // Bell rim
      canvas.drawLine(5, 36, 43, 36, col, stroke);
      // Bell clapper
      canvas.drawArc(24, 36, 4.5, 0, Math.PI, col, stroke);
      // Top hanger
      canvas.drawArc(24, 10, 3, -Math.PI, 0, col, stroke);
      break;
    }

    case 'envelope': {
      // Clean envelope
      canvas.drawRoundRect(6, 11, 36, 26, 4.5, col, stroke);
      canvas.drawLine(6, 14, 24, 27, col, stroke);
      canvas.drawLine(42, 14, 24, 27, col, stroke);
      break;
    }

    case 'grid': {
      // 4 rounded squares in 2x2 grid (dashboard)
      canvas.drawRoundRect(6, 6, 15, 15, 3.5, col, stroke);
      canvas.drawRoundRect(27, 6, 15, 15, 3.5, col, stroke);
      canvas.drawRoundRect(6, 27, 15, 15, 3.5, col, stroke);
      canvas.drawRoundRect(27, 27, 15, 15, 3.5, col, stroke);
      break;
    }

    case 'credit-card': {
      // Credit card outline
      canvas.drawRoundRect(5, 11, 38, 26, 4, col, stroke);
      canvas.drawLine(5, 19, 43, 19, col, stroke);
      canvas.drawLine(11, 28, 20, 28, col, stroke);
      break;
    }

    case 'video': {
      // Video camera
      canvas.drawRoundRect(5, 13, 26, 22, 4, col, stroke);
      canvas.drawLine(31, 19, 43, 14, col, stroke);
      canvas.drawLine(43, 14, 43, 34, col, stroke);
      canvas.drawLine(43, 34, 31, 29, col, stroke);
      break;
    }

    case 'flask': {
      // Lab test tube matching reference
      canvas.drawLine(17, 7, 31, 7, col, stroke + 0.8); // Top lip
      canvas.drawLine(19, 7, 19, 33, col, stroke);     // Left side
      canvas.drawLine(29, 7, 29, 33, col, stroke);     // Right side
      canvas.drawArc(24, 33, 5, 0, Math.PI, col, stroke); // Rounded bottom
      canvas.drawLine(24, 18, 29, 18, col, stroke - 0.5); // Grad tick 1
      canvas.drawLine(24, 25, 29, 25, col, stroke - 0.5); // Grad tick 2
      break;
    }

    case 'logout': {
      // Door frame
      canvas.drawLine(24, 9, 10, 9, col, stroke);
      canvas.drawLine(10, 9, 10, 39, col, stroke);
      canvas.drawLine(10, 39, 24, 39, col, stroke);
      // Arrow pointing right out of door
      canvas.drawLine(18, 24, 38, 24, col, stroke);
      canvas.drawLine(31, 17, 38, 24, col, stroke);
      canvas.drawLine(31, 31, 38, 24, col, stroke);
      break;
    }

    default:
      break;
  }

  const uri = canvas.toPngDataUri();
  iconCache[cacheKey] = uri;
  return uri;
}
