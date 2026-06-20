import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const COLORS = {
  black: "#09090b",
  blue: "#3b82f6",
  blueDark: "#2563eb",
  line: "#dbe5f3",
  muted: "#64748b",
  panel: "#ffffff",
  surface: "#f8fafc",
  text: "#111827"
};

const outputs = [
  ["public/icons/icon16.png", iconSvg(16), 16, 16],
  ["public/icons/icon32.png", iconSvg(32), 32, 32],
  ["public/icons/icon48.png", iconSvg(48), 48, 48],
  ["public/icons/icon128.png", iconSvg(128), 128, 128],
  ["store-assets/icon-128.png", iconSvg(128), 128, 128],
  ["store-assets/screenshot-1-popup-language-select.png", screenshotSvg("Popup language selection", "Choose source and target languages, then translate the active page.", popupMockup()), 1280, 800],
  ["store-assets/screenshot-2-translation-restore-status.png", screenshotSvg("Translate and restore state", "Run once to translate visible text. Run again to restore the saved original.", translatedPageMockup()), 1280, 800],
  ["store-assets/screenshot-3-options-shortcuts.png", screenshotSvg("Options and shortcut setup", "Set the default route, status overlay, and Chrome keyboard shortcut.", optionsMockup()), 1280, 800],
  ["store-assets/promo-small-440x280.png", promoSvg(440, 280), 440, 280],
  ["store-assets/marquee-1400x560.png", marqueeSvg(), 1400, 560]
];

for (const [path, svg, width, height] of outputs) {
  const outputPath = join(ROOT, path);
  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(svg)).resize(width, height).png({ compressionLevel: 9 }).toFile(outputPath);
  console.log(`Generated ${path}`);
}

function iconSvg(size) {
  const scale = size / 128;
  const stroke = Math.max(4, 9 * scale);
  return svg(size, size, `
    <defs>
      <linearGradient id="iconBg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${COLORS.black}" />
        <stop offset="1" stop-color="#111827" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#iconBg)" />
    <path d="M${22 * scale} ${90 * scale} L${51 * scale} ${30 * scale} C${55 * scale} ${22 * scale} ${69 * scale} ${22 * scale} ${73 * scale} ${30 * scale} L${104 * scale} ${90 * scale}" fill="none" stroke="#ffffff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M${42 * scale} ${69 * scale} H${83 * scale}" fill="none" stroke="#ffffff" stroke-width="${stroke}" stroke-linecap="round" />
    <path d="M${31 * scale} ${100 * scale} H${84 * scale}" fill="none" stroke="${COLORS.blue}" stroke-width="${stroke}" stroke-linecap="round" />
    <path d="M${77 * scale} ${86 * scale} L${99 * scale} ${100 * scale} L${77 * scale} ${114 * scale}" fill="none" stroke="${COLORS.blue}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" />
  `);
}

function screenshotSvg(title, subtitle, mockup) {
  const titleText = textBlock(title, 0, 132, "hero", 18, 62);
  const subtitleText = textBlock(subtitle, 0, 132 + titleText.lineCount * 62 + 22, "sub", 34, 34);

  return svg(1280, 800, `
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${COLORS.black}" />
        <stop offset="1" stop-color="#172554" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#020617" flood-opacity="0.28" />
      </filter>
    </defs>
    <rect width="1280" height="800" fill="url(#bg)" />
    <circle cx="1050" cy="130" r="210" fill="${COLORS.blue}" opacity="0.12" />
    <circle cx="1220" cy="700" r="260" fill="${COLORS.blueDark}" opacity="0.16" />
    <g transform="translate(82 90)">
      ${brandMark(64)}
      <text x="86" y="29" class="eyebrow">AKRA QUICK TRANSLATE</text>
      ${titleText.markup}
      ${subtitleText.markup}
    </g>
    <g filter="url(#shadow)" transform="translate(620 82)">
      ${mockup}
    </g>
    <style>${baseTextCss()}</style>
  `);
}

function textBlock(text, x, y, className, maxChars, lineHeight) {
  const lines = wrapWords(text, maxChars);
  return {
    lineCount: lines.length,
    markup: lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`).join("")
  };
}

function wrapWords(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      continue;
    }

    line = next;
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function popupMockup() {
  return `
    <rect width="430" height="385" rx="18" fill="${COLORS.black}" />
    <circle cx="370" cy="42" r="118" fill="${COLORS.blueDark}" opacity="0.18" />
    <g transform="translate(22 20)">${brandMark(38)}</g>
    <text x="70" y="37" class="eyebrow">AKRA QUICK</text>
    <text x="70" y="59" class="panelTitleLight">Akra Translate</text>
    <rect x="268" y="21" width="138" height="36" rx="8" fill="#0f172a" stroke="#3b82f6" stroke-opacity="0.45" />
    <text x="286" y="44" class="pillLight">Shortcut</text>
    <rect x="354" y="27" width="42" height="24" rx="6" fill="${COLORS.blueDark}" />
    <text x="361" y="44" class="buttonTiny">Alt+T</text>
    <rect x="22" y="86" width="386" height="96" rx="10" fill="#ffffff" />
    ${selectControl(40, 119, "Source", "English (en)", 152)}
    <rect x="202" y="130" width="42" height="42" rx="9" fill="#eff6ff" stroke="#bfdbfe" />
    <text x="214" y="158" class="swap">⇄</text>
    ${selectControl(256, 119, "Target", "Korean", 136)}
    <rect x="22" y="198" width="386" height="50" rx="10" fill="#0f172a" stroke="#2563eb" stroke-opacity="0.55" />
    <rect x="42" y="214" width="18" height="18" rx="4" fill="${COLORS.blueDark}" />
    <path d="M47 223 l4 4 l9 -11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="73" y="228" class="labelLight">Status overlay</text>
    <rect x="22" y="264" width="386" height="54" rx="10" fill="${COLORS.blueDark}" />
    <text x="130" y="299" class="button">Translate / Restore</text>
    <text x="22" y="354" class="linkLight">Options</text>
    <text x="304" y="354" class="linkLight">Support Akra</text>
  `;
}

function translatedPageMockup() {
  return `
    <rect width="560" height="480" rx="22" fill="${COLORS.panel}" />
    <rect x="0" y="0" width="560" height="58" rx="22" fill="#f1f5f9" />
    <circle cx="34" cy="29" r="7" fill="#ef4444" />
    <circle cx="58" cy="29" r="7" fill="#f59e0b" />
    <circle cx="82" cy="29" r="7" fill="#22c55e" />
    <rect x="118" y="17" width="350" height="24" rx="12" fill="#ffffff" />
    <text x="136" y="34" class="tiny">https://example.com/article</text>
    <text x="46" y="116" class="articleTitle">Translated page text</text>
    <rect x="46" y="152" width="410" height="14" rx="7" fill="#dbeafe" />
    <rect x="46" y="180" width="470" height="14" rx="7" fill="#dbeafe" />
    <rect x="46" y="208" width="380" height="14" rx="7" fill="#dbeafe" />
    <rect x="46" y="274" width="460" height="76" rx="12" fill="#eff6ff" stroke="#bfdbfe" />
    <text x="72" y="310" class="labelDark">Akra Quick Translate</text>
    <text x="72" y="336" class="body">Applied. Press Alt+T again to restore.</text>
    <rect x="46" y="394" width="188" height="42" rx="10" fill="${COLORS.blueDark}" />
    <text x="82" y="421" class="buttonSmall">Restore original</text>
  `;
}

function optionsMockup() {
  return `
    <rect width="560" height="420" rx="18" fill="#ffffff" />
    <rect width="230" height="420" rx="18" fill="${COLORS.black}" />
    <rect x="212" width="36" height="420" fill="${COLORS.black}" />
    <g transform="translate(36 34)">${brandMark(54)}</g>
    <text x="36" y="160" class="eyebrow">AKRA QUICK</text>
    <text x="36" y="248" class="heroSmall">Translation</text>
    <rect x="36" y="324" width="128" height="38" rx="8" fill="#0f172a" stroke="#3b82f6" stroke-opacity="0.45" />
    <text x="50" y="348" class="pillLight">Shortcut</text>
    <rect x="112" y="331" width="42" height="24" rx="6" fill="${COLORS.blueDark}" />
    <text x="119" y="348" class="buttonTiny">Alt+T</text>
    <text x="270" y="76" class="eyebrowDark">SETTINGS</text>
    <text x="270" y="112" class="articleTitle">Settings</text>
    <rect x="270" y="148" width="250" height="94" rx="10" fill="#f8fafc" stroke="${COLORS.line}" />
    ${selectControl(288, 182, "Source", "EN", 95)}
    <rect x="392" y="193" width="38" height="42" rx="9" fill="#eff6ff" />
    <text x="405" y="221" class="swap">→</text>
    ${selectControl(438, 182, "Target", "KO", 64)}
    <rect x="270" y="262" width="176" height="44" rx="9" fill="#ffffff" stroke="${COLORS.line}" />
    <rect x="288" y="275" width="18" height="18" rx="4" fill="${COLORS.blueDark}" />
    <path d="M293 284 l4 4 l9 -11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="318" y="289" class="labelDark">Status overlay</text>
    <rect x="270" y="324" width="86" height="42" rx="9" fill="${COLORS.blueDark}" />
    <text x="296" y="351" class="buttonSmall">Save</text>
    <text x="374" y="351" class="link">Shortcut</text>
    <rect x="448" y="331" width="48" height="28" rx="7" fill="${COLORS.blueDark}" />
    <text x="456" y="350" class="buttonTiny">Alt+T</text>
  `;
}

function promoSvg(width, height) {
  return svg(width, height, `
    <rect width="${width}" height="${height}" rx="0" fill="${COLORS.black}" />
    <g transform="translate(28 34)">${brandMark(72)}</g>
    <text x="28" y="142" class="promoTitle">Akra Quick Translate</text>
    <text x="28" y="180" class="promoSub">Fast page translation</text>
    <rect x="28" y="212" width="166" height="36" rx="10" fill="${COLORS.blueDark}" />
    <text x="52" y="236" class="buttonSmall">Alt+T toggle</text>
    <style>${baseTextCss()}</style>
  `);
}

function marqueeSvg() {
  const titleText = textBlock("Akra Quick Translate", 100, 296, "marqueeTitle", 13, 72);
  const subtitleText = textBlock(
    "Toggle page translation and original restore with Chrome's built-in Translator API.",
    104,
    296 + titleText.lineCount * 72 + 20,
    "marqueeSub",
    44,
    36
  );

  return svg(1400, 560, `
    <defs>
      <linearGradient id="marqueeBg" x1="0" x2="1">
        <stop offset="0" stop-color="${COLORS.black}" />
        <stop offset="1" stop-color="#1e3a8a" />
      </linearGradient>
    </defs>
    <rect width="1400" height="560" fill="url(#marqueeBg)" />
    <g transform="translate(100 74)">${brandMark(104)}</g>
    ${titleText.markup}
    ${subtitleText.markup}
    <g transform="translate(905 82) scale(0.85)">${popupMockup()}</g>
    <style>${baseTextCss()}</style>
  `);
}

function selectControl(x, y, label, value, width = 166) {
  return `
    <text x="${x}" y="${y}" class="label">${escapeXml(label)}</text>
    <rect x="${x}" y="${y + 14}" width="${width}" height="42" rx="9" fill="#ffffff" stroke="${COLORS.line}" />
    <text x="${x + 14}" y="${y + 41}" class="body">${escapeXml(value)}</text>
    <path d="M${x + width - 26} ${y + 31} l7 7 l7 -7" fill="none" stroke="${COLORS.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

function brandMark(size) {
  const scale = size / 128;
  return `
    <g>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${COLORS.black}" />
      <path d="M${22 * scale} ${90 * scale} L${51 * scale} ${30 * scale} C${55 * scale} ${22 * scale} ${69 * scale} ${22 * scale} ${73 * scale} ${30 * scale} L${104 * scale} ${90 * scale}" fill="none" stroke="#fff" stroke-width="${9 * scale}" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M${42 * scale} ${69 * scale} H${83 * scale}" fill="none" stroke="#fff" stroke-width="${9 * scale}" stroke-linecap="round" />
      <path d="M${31 * scale} ${100 * scale} H${84 * scale}" fill="none" stroke="${COLORS.blue}" stroke-width="${9 * scale}" stroke-linecap="round" />
      <path d="M${77 * scale} ${86 * scale} L${99 * scale} ${100 * scale} L${77 * scale} ${114 * scale}" fill="none" stroke="${COLORS.blue}" stroke-width="${9 * scale}" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `;
}

function svg(width, height, content) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${content}
    </svg>
  `;
}

function baseTextCss() {
  return `
    text { font-family: Pretendard, Inter, "Segoe UI", Arial, sans-serif; }
    .articleTitle { fill: ${COLORS.text}; font-size: 34px; font-weight: 800; letter-spacing: 0; }
    .body { fill: #334155; font-size: 16px; font-weight: 600; letter-spacing: 0; }
    .button { fill: #fff; font-size: 17px; font-weight: 800; letter-spacing: 0; }
    .buttonSmall { fill: #fff; font-size: 15px; font-weight: 800; letter-spacing: 0; }
    .eyebrow { fill: #bfdbfe; font-size: 14px; font-weight: 800; letter-spacing: 2px; }
    .eyebrowDark { fill: ${COLORS.muted}; font-size: 13px; font-weight: 800; letter-spacing: 1.2px; }
    .hero { fill: #fff; font-size: 54px; font-weight: 850; letter-spacing: 0; }
    .label { fill: ${COLORS.muted}; font-size: 13px; font-weight: 800; letter-spacing: 0; }
    .labelDark { fill: #334155; font-size: 15px; font-weight: 750; letter-spacing: 0; }
    .labelLight { fill: #dbeafe; font-size: 15px; font-weight: 750; letter-spacing: 0; }
    .link { fill: ${COLORS.blueDark}; font-size: 14px; font-weight: 800; letter-spacing: 0; }
    .linkLight { fill: #bfdbfe; font-size: 14px; font-weight: 800; letter-spacing: 0; }
    .marqueeSub { fill: #dbeafe; font-size: 26px; font-weight: 600; letter-spacing: 0; }
    .marqueeTitle { fill: #fff; font-size: 62px; font-weight: 850; letter-spacing: 0; }
    .panelTitle { fill: ${COLORS.text}; font-size: 20px; font-weight: 850; letter-spacing: 0; }
    .panelTitleLight { fill: #fff; font-size: 20px; font-weight: 850; letter-spacing: 0; }
    .pill { fill: ${COLORS.blueDark}; font-size: 13px; font-weight: 800; letter-spacing: 0; }
    .pillLight { fill: #dbeafe; font-size: 13px; font-weight: 800; letter-spacing: 0; }
    .buttonTiny { fill: #fff; font-size: 12px; font-weight: 850; letter-spacing: 0; }
    .heroSmall { fill: #fff; font-size: 34px; font-weight: 850; letter-spacing: 0; }
    .promoSub { fill: #dbeafe; font-size: 24px; font-weight: 650; letter-spacing: 0; }
    .promoTitle { fill: #fff; font-size: 34px; font-weight: 850; letter-spacing: 0; }
    .sub { fill: #dbeafe; font-size: 24px; font-weight: 600; letter-spacing: 0; }
    .success { fill: #047857; font-size: 13px; font-weight: 800; letter-spacing: 0; }
    .swap { fill: ${COLORS.blueDark}; font-size: 25px; font-weight: 800; letter-spacing: 0; }
    .tiny { fill: ${COLORS.muted}; font-size: 13px; font-weight: 600; letter-spacing: 0; }
  `;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
