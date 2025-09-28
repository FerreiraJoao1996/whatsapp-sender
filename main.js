const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

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

function findChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function waitForPageReady(timeout = 10000) {
  const start = Date.now();
  while (!page && Date.now() - start < timeout) {
    await delay(100);
  }
  return !!page;
}

app.whenReady().then(async () => {
  createWindow();

  const userDataPath = path.join(app.getPath('userData'), 'chrome-profile');
  const chromePath = findChromePath();

  if (!chromePath) {
    console.error('❌ Chrome não encontrado');
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('puppeteer-failed', 'Chrome não encontrado no sistema');
    });
    return;
  }

  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userDataDir: userDataPath,
    });

    page = await browser.newPage();
    await page.goto('https://web.whatsapp.com');

    console.log('🚀 Puppeteer aberto, aguarde login no WhatsApp Web');

    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('puppeteer-ready');
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar Puppeteer:', err);
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('puppeteer-failed', err.message);
    });
  }
});

app.on('window-all-closed', async () => {
  if (browser) await browser.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('send-whatsapp-messages', async (event, { numbers, message }) => {
  const results = [];

  const ready = await waitForPageReady();
  if (!ready) {
    return ['❌ Erro: WhatsApp Web ainda não está pronto'];
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

      const sendButtonSelectors = [
        'button[aria-label="Enviar"]',
        'span[data-icon="send"]',
        'div[role="button"][data-testid="send"]',
        'span[data-icon="wds-ic-send-filled"]'
      ];

      let sendButton = null;
      for (const selector of sendButtonSelectors) {
        sendButton = await page.$(selector);
        if (sendButton) break;
      }

      if (sendButton) {
        await sendButton.click();
        await delay(3000);
        results.push(`✅ Enviado: ${number}`);
      } else {
        const input = await page.$('div[contenteditable="true"]');
        if (input) {
          await input.focus();
          await page.keyboard.press('Enter');
          await delay(3000);
          results.push(`✅ Enviado via Enter: ${number}`);
        } else {
          results.push(`❌ Botão de envio não encontrado: ${number}`);
        }
      }
    } catch (err) {
      results.push(`❌ Erro ao enviar para ${number}: ${err.message}`);
    }
  }

  return results;
});
