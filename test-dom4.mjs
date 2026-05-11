import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     const themeTuneBtn = btns.find(b => b.title === 'Theme tuning');
     if (themeTuneBtn) themeTuneBtn.click();
  });
  
  await page.waitForTimeout(500);
  
  const text = await page.evaluate(() => {
     const menu = document.querySelector('.absolute.right-0.mt-2.w-64');
     if (!menu) return "Menu not found!";
     return menu.innerText;
  });
  console.log("MENU TEXT:", text);
  
  await browser.close();
})();
