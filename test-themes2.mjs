import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3001/");
  
  const THEMES = ["mono", "light", "light-cool", "dark", "blue", "brown"];
  
  for (let i = 0; i < THEMES.length; i++) {
    // Open the Theme tuning menu
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const themeTuneBtn = btns.find(b => b.innerHTML.includes('SlidersVertical') || b.querySelector('svg.lucide-sliders-vertical') || b.title === 'Theme tuning');
       if (themeTuneBtn) themeTuneBtn.click();
    });
    
    // wait a moment
    await page.waitForTimeout(100);
    
    // click the specific theme button
    await page.evaluate((themeName) => {
       const btns = Array.from(document.querySelectorAll('button'));
       const themeBtn = btns.find(b => b.innerText.trim() === themeName || b.innerHTML.includes(themeName));
       if (themeBtn) themeBtn.click();
    }, THEMES[i]);
    
    await page.waitForTimeout(100);
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-bg'));
    console.log(`Theme ${THEMES[i]}: --app-bg = ${bg}`);
  }
  
  await browser.close();
})();
