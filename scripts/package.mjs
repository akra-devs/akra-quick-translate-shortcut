import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, "dist");
const RELEASE_DIR = join(ROOT, "release");
const PACKAGE_JSON = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const ZIP_PATH = join(RELEASE_DIR, `${PACKAGE_JSON.name}-${PACKAGE_JSON.version}.zip`);

const REQUIRED_ENTRIES = [
  "manifest.json",
  "popup.html",
  "options.html",
  "assets/background.js",
  "assets/content.js",
  "assets/popup.js",
  "assets/options.js",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
  "_locales/en/messages.json",
  "_locales/ko/messages.json"
];

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

await mkdir(RELEASE_DIR, { recursive: true });
const entries = await collectEntries(DIST_DIR);
validateEntries(entries);
await writeFile(ZIP_PATH, createZip(entries));

const digest = createHash("sha256").update(await readFile(ZIP_PATH)).digest("hex");
console.log(`Packaged ${relative(ROOT, ZIP_PATH)} (${entries.length} files)`);
console.log(`SHA-256 ${digest}`);

async function collectEntries(directory) {
  const names = await readdir(directory);
  const entries = [];

  for (const name of names.sort()) {
    const fullPath = join(directory, name);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      entries.push(...(await collectEntries(fullPath)));
      continue;
    }

    if (!fileStat.isFile()) {
      continue;
    }

    entries.push({
      data: await readFile(fullPath),
      modifiedAt: fileStat.mtime,
      name: relative(DIST_DIR, fullPath).split(sep).join("/")
    });
  }

  return entries;
}

function validateEntries(entries) {
  const names = new Set(entries.map((entry) => entry.name));
  for (const requiredEntry of REQUIRED_ENTRIES) {
    if (!names.has(requiredEntry)) {
      throw new Error(`Package is missing required entry: ${requiredEntry}`);
    }
  }

  if (!names.has("manifest.json") || [...names].some((name) => basename(name) === "manifest.json" && name !== "manifest.json")) {
    throw new Error("Package must contain exactly one root-level manifest.json");
  }
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.name);
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);
    const { dosDate, dosTime } = toDosDateTime(entry.modifiedAt);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileName, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, fileName);

    offset += localHeader.length + fileName.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}
