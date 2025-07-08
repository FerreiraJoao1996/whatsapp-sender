const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://google.com');

  console.log('✅ Navegador abriu e carregou Google. Esperando 10s...');

  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
  console.log('✅ Navegador fechado.');
})();
