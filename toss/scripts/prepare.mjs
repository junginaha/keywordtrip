import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'assets'), { recursive: true });
await copyFile(resolve(root, '../assets/data.js'), resolve(root, 'assets/data.js'));
console.log('Copied original travel destination dataset for the isolated Toss build.');
