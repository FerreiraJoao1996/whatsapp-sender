const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

let mainWindow;
let browser;
let page;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  createWindow();

  const userDataPath = path.join(app.getPath('userData'), 'chrome-profile'); 

  browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    userDataDir: userDataPath,
  });

  page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');
  console.log('🚀 Puppeteer aberto, aguarde login no WhatsApp Web');
});

app.on('window-all-closed', async () => {
  if (browser) await browser.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

const delay = ms => new Promise(res => setTimeout(res, ms));

ipcMain.handle('send-whatsapp-messages', async (event, { numbers, message }) => {
  const results = [];

  if (!page) {
    return ['❌ Erro: Página do WhatsApp Web não está aberta'];
  }

  try {
    for (const number of numbers) {
      try {
        const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}&app_absent=0`;
        await page.goto(url);

        await page.waitForSelector('div[contenteditable="true"]', { timeout: 60000 });
        await delay(2000);

        const sendBtnSelector = 'button[aria-label="Enviar"]';
        const altSendBtnSelector = 'span[data-icon="send"]';

        const sendButtonExists = await page.$(sendBtnSelector);

        if (sendButtonExists) {
          await page.click(sendBtnSelector);
        } else {
          await page.waitForSelector(altSendBtnSelector, { timeout: 10000 });
          await page.click(altSendBtnSelector);
        }

        await delay(4000);

        results.push(`✅ Enviado: ${number}`);
      } catch (err) {
        results.push(`❌ Erro: ${number} (${err.message})`);
      }
    }
  } catch (err) {
    results.push(`❌ Erro fatal: ${err.message}`);
  }

  return results;
});
