import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  const html = await page.evaluate(() => {
     const btns = Array.from(document.querySelectorAll('button'));
     return btns.map(b => b.title || b.innerText || b.innerHTML.substring(0, 50)).join('\n');
  });
  console.log(html);
  
  await browser.close();
})();
