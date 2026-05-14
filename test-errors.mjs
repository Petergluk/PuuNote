import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto("http://127.0.0.1:3001/");
  
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     const themeTuneBtn = btns.find(b => b.title === 'Theme tuning');
     if (themeTuneBtn) themeTuneBtn.click();
  });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     const themeBtn = btns.find(b => b.innerText.trim() === "Warm white");
     if (themeBtn) themeBtn.click();
  });
  await page.waitForTimeout(500);
  
  await browser.close();
})();
