import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  // open menu
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     const themeTuneBtn = btns.find(b => b.title === 'Настройки интерфейса' || b.innerHTML.includes('SlidersVertical'));
     if (themeTuneBtn) themeTuneBtn.click();
  });
  
  await page.waitForTimeout(500);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 1000));
  
  await browser.close();
})();
