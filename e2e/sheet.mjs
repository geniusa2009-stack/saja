/** Contact sheet: node e2e/sheet.mjs <dir> [columns] [tileWidth] → <dir>/_sheet.png (for reviewing frame sequences). */
import { readdirSync, readFileSync } from 'node:fs';
import { launch } from './lib.mjs';

const [dir, cols = '4', tile = '420'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('_')).sort();
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#111;font:12px system-ui;color:#ddd}main{display:grid;grid-template-columns:repeat(${cols},${tile}px);gap:8px;padding:8px}figure{margin:0}img{width:100%;display:block;border:1px solid #333}figcaption{padding:2px 0}</style><main>${cells}</main>`;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: Number(cols) * (Number(tile) + 8) + 8, height: 400 } });
await page.setContent(html);
await page.waitForTimeout(200);
await page.screenshot({ path: `${dir}/_sheet.png`, fullPage: true });
await browser.close();
console.log(`${dir}/_sheet.png (${files.length} frames)`);
