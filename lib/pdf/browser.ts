import fs from "node:fs";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const DEFAULT_VIEWPORT = {
  width: 1440,
  height: 2048,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
};

function getLocalExecutablePath() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export async function launchPdfBrowser() {
  const localExecutablePath = getLocalExecutablePath();

  if (localExecutablePath) {
    return puppeteer.launch({
      executablePath: localExecutablePath,
      headless: true,
      defaultViewport: DEFAULT_VIEWPORT,
    });
  }

  if (process.platform !== "linux") {
    for (const channel of ["chrome", "chrome-beta", "chrome-canary"] as const) {
      try {
        return await puppeteer.launch({
          channel,
          headless: true,
          defaultViewport: DEFAULT_VIEWPORT,
        });
      } catch {
        // Try the next local browser channel before falling back to serverless Chromium.
      }
    }
  }

  return puppeteer.launch({
    args: puppeteer.defaultArgs({
      args: chromium.args,
      headless: "shell",
    }),
    defaultViewport: DEFAULT_VIEWPORT,
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });
}
