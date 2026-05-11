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
  
  const html = await page.evaluate(() => {
     const menu = document.querySelector('.bg-app-panel.border-app-border.shadow-xl');
     return menu ? menu.innerText : 'NO MENU FOUND';
  });
  console.log(html);
  
  await browser.close();
})();
