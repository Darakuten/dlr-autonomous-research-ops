import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultHtmlPath = path.join(__dirname, "dl-research-overview.html");
const defaultPdfPath = path.join(__dirname, "dl-research-overview.pdf");
const defaultPngPath = path.join(__dirname, "dl-research-overview.png");
const defaultUrl = pathToFileURL(defaultHtmlPath).href;

const url = process.argv[2] ?? defaultUrl;
const outPdf = process.argv[3] ?? defaultPdfPath;
const outPng = process.argv[4] ?? defaultPngPath;

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await context.newPage();

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const posterRect = await page.evaluate(() => {
  const el = document.querySelector(".poster");
  if (!el) throw new Error("Missing .poster element");
  const rect = el.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
});
console.log(`measured poster: ${Math.round(posterRect.width)} x ${Math.round(posterRect.height)} px`);

const PAD = 24;
const clip = {
  x: Math.max(0, posterRect.x - PAD),
  y: Math.max(0, posterRect.y - PAD),
  width: posterRect.width + PAD * 2,
  height: posterRect.height + PAD * 2,
};

await page.screenshot({ path: outPng, clip });
console.log(`PNG: ${outPng}`);

const inW = clip.width / 96;
const inH = clip.height / 96;
await page.pdf({
  path: outPdf,
  printBackground: true,
  width: `${inW}in`,
  height: `${inH}in`,
  margin: { top: "0", bottom: "0", left: "0", right: "0" },
  pageRanges: "1",
});
console.log(`PDF: ${outPdf} @ ${inW.toFixed(2)}in x ${inH.toFixed(2)}in`);

await browser.close();

try {
  const meta = execSync(`mdls -name kMDItemNumberOfPages -name kMDItemPageHeight -name kMDItemPageWidth "${outPdf}"`).toString();
  console.log(meta.trim());
} catch {}
