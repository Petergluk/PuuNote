import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  // click palette to toggle theme
  await page.click('button[title="Toggle theme"]');
  const class1 = await page.evaluate(() => document.documentElement.className);
  console.log("Class after 1 toggle:", class1);
  
  await page.click('button[title="Toggle theme"]');
  const class2 = await page.evaluate(() => document.documentElement.className);
  console.log("Class after 2 toggles:", class2);
  
  await browser.close();
})();
