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

  for (const number of numbers) {
    try {
      const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}&app_absent=0`;
      await page.goto(url);

      const modalSelector = '[aria-label="O número de telefone compartilhado por url é inválido."]';
      try {
        await Promise.race([
          page.waitForSelector('div[contenteditable="true"]', { timeout: 60000 }),
          page.waitForSelector(modalSelector, { timeout: 60000 }),
        ]);
      } catch {
        results.push(`❌ Timeout: ${number} (Nenhum elemento esperado apareceu)`);
        continue;
      }

      const modalExists = await page.$(modalSelector);
      if (modalExists) {
        results.push(`❌ Número inválido: ${number}`);
        continue;
      }

      await delay(2000);

      const sendBtnSelector = 'button[aria-label="Enviar"]';
      const altSendBtnSelector = 'span[data-icon="send"]';

      const sendButton = await page.$(sendBtnSelector) || await page.$(altSendBtnSelector);

      if (sendButton) {
        await sendButton.click();
        await delay(3000);
        results.push(`✅ Enviado: ${number}`);
      } else {
        results.push(`❌ Botão de envio não encontrado: ${number}`);
      }
    } catch (err) {
      results.push(`❌ Erro ao enviar para ${number}: ${err.message}`);
    }
  }

  return results;
});
