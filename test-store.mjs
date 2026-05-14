import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  await page.evaluate(() => {
     // Expose store if not already exposed (we'll just mock a click if we can't get store)
  });
  
  // click toggleTheme
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     const btn = btns.find(b => b.title === 'Toggle theme');
     if (btn) btn.click();
  });
  await page.waitForTimeout(100);
  const bg1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-bg'));
  console.log("Bg after 1 toggle:", bg1);
  
  await browser.close();
})();
