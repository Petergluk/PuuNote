import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  const LABELS = ["B/W", "Warm white", "Cool white", "Black", "Cold black", "Warm black"];
  
  for (let i = 0; i < LABELS.length; i++) {
    // Open the Theme tuning menu
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const themeTuneBtn = btns.find(b => b.title === 'Настройки интерфейса');
       if (themeTuneBtn) themeTuneBtn.click();
    });
    
    // wait a moment
    await page.waitForTimeout(100);
    
    // click the specific theme button
    await page.evaluate((label) => {
       const btns = Array.from(document.querySelectorAll('button'));
       const themeBtn = btns.find(b => b.innerText.trim() === label);
       if (themeBtn) themeBtn.click();
    }, LABELS[i]);
    
    await page.waitForTimeout(100);
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-bg'));
    console.log(`Theme ${LABELS[i]}: --app-bg = ${bg}`);
  }
  
  await browser.close();
})();
