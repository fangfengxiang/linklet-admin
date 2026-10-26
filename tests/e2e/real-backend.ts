import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Browser } from '@e2e-dev/web';
import { expect, type Locator } from 'e2e';

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

/** Observe the response to a real UI action, without routing/intercepting it. */
export async function uiResponse<T>(
  browser: Browser,
  path: string,
  trigger: () => Promise<void>,
  status = 200,
): Promise<Envelope<T>> {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const responsePending = browser.waitForResponse(new RegExp(`${escaped}(?:\\?.*)?$`));
  const [response] = await Promise.all([responsePending, trigger()]);
  const body = await response.json<Envelope<T>>();
  if (response.status !== status) {
    throw new Error(`UI ${path}: expected HTTP ${status}, got ${response.status}, code ${body.code}: ${body.message}`);
  }
  expect(typeof body.code).toBe('number');
  if (status === 200) expect(body.code).toBe(0);
  else expect(body.code).not.toBe(0);
  return body;
}

/** Only used for granting this run's group to the server-side signing tenant. */
export async function fixtureRequest<T>(
  path: string,
  method = 'GET',
  data?: unknown,
): Promise<T> {
  const url = new URL(path, process.env.APP_URL ?? 'http://localhost:8000');
  const payload = data === undefined ? undefined : JSON.stringify(data);
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise<T>((resolve, reject) => {
    const req = request(url, {
      method,
      headers: payload === undefined ? {} : {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 20_000,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Envelope<T>;
          if (response.statusCode !== 200 || body.code !== 0) {
            throw new Error(`Fixture ${method} ${path}: HTTP ${response.statusCode}, ${body.message}`);
          }
          resolve(body.data);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Fixture ${path} timed out`)));
    req.on('error', reject);
    req.end(payload);
  });
}

/** The backend returns bounded arrays; visit client-side pages for our own row. */
export async function tableRow(browser: Browser, text: string): Promise<Locator> {
  const exact = new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const row = browser.locator('.ant-table-tbody tr.ant-table-row').filter({
    has: browser.locator('td').filter({ hasText: exact }),
  });
  const first = browser.locator('.ant-pagination-item-1');
  if (await first.isVisible()) await first.click();
  for (let page = 0; page < 10; page += 1) {
    if (await row.isVisible()) return row;
    const next = browser.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
    if (!(await next.isVisible())) break;
    await next.click();
  }
  await expect(row).toBeVisible();
  return row;
}
