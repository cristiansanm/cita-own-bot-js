import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Log } from '../models/Log';

chromium.use(StealthPlugin());

const identities = [
  { name: 'CARLOS', s1: 'GARCIA', s2: 'MENDOZA', country: 'PERU' },
  { name: 'ANA LUCIA', s1: 'SILVA', s2: 'ROJAS', country: 'COLOMBIA' },
  { name: 'MIGUEL', s1: 'TORRES', s2: 'FLORES', country: 'BOLIVIA' },
  { name: 'VALENTINA', s1: 'CASTRO', s2: 'REYES', country: 'CHILE' },
];

export async function runScraper(bot: any, chatId: string) {
  // const proxy = process.env.PROXY_SERVER
  //   ? {
  //       server: process.env.PROXY_SERVER,
  //       username: process.env.PROXY_USER,
  //       password: process.env.PROXY_PASS,
  //     }
  //   : undefined;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await context.newPage();

  try {
    const data = identities[Math.floor(Math.random() * identities.length)];
    const fullName = `${data.name} ${data.s1} ${data.s2}`;

    // 1. Initial Selection
    await page.goto('https://sede.administracionespublicas.gob.es/icpplus/index.html', {
      waitUntil: 'networkidle',
    });
    await page.selectOption('select#form', '/icpplus/citar?p=2&locale=es');
    await page.click('input#btnAceptar');

    // 2. Select Office & Procedure
    await page.waitForSelector('select#sede');
    await page.selectOption('select#sede', '99');
    // Select the last available trámite in the second group
    await page.selectOption('select#tramiteGrupo\\[1\\]', '4010');
    await page.click('input#btnAceptar');

    // 3. Scroll and Enter
    await page.waitForSelector('div#btnEntrar');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.click('div#btnEntrar');

    // 4. Fill Identity
    await page.fill('input#txtIdCitado', 'X' + Math.floor(Math.random() * 9999999) + 'L'); // Simplified NIE for demo
    await page.fill('input#txtDesCitado', fullName);
    await page.selectOption('select#txtPaisNac', { label: data.country });
    await page.click('input#btnEnviar');

    // 5. Final Confirmation
    await page.waitForSelector('input#btnEnviar');
    await page.click('input#btnEnviar');

    // 6. Check Result
    const content = await page.content();
    if (content.includes('En este momento no hay citas disponibles')) {
      await Log.create({ lastName: fullName, lastNationality: data.country, success: false });
      return { success: false };
    } else if (await page.isVisible('select#idSede')) {
      const offices = await page.$$eval('select#idSede option', (ops) =>
        ops.map((o) => o.textContent?.trim()).filter((t) => t && !t.includes('Seleccionar'))
      );
      await Log.create({
        lastName: fullName,
        lastNationality: data.country,
        success: true,
        foundOffices: offices,
      });
      return { success: true, offices };
    }
  } catch (error: any) {
    throw new Error(`Scraper Failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}
