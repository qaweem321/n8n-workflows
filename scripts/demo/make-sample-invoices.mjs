// Creates the sample invoice PDFs in workflows/invoice-extraction/samples/ (fictional companies).
// Three different layouts; the third one's total is wrong on purpose to show the math check.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const OUT = new URL("../../workflows/invoice-extraction/samples/", import.meta.url).pathname;

const invoices = [
  {
    file: "cloudnest-hosting.pdf",
    html: `<div style="font-family:Helvetica,Arial;padding:48px;color:#111">
      <div style="display:flex;justify-content:space-between"><h1 style="color:#2563eb;margin:0">CloudNest Hosting Ltd</h1>
      <div style="text-align:right">INVOICE<br><b>No. CN-2026-0412</b></div></div>
      <p>14 Harbour Street, Leeds LS1 4AB, United Kingdom<br>billing@cloudnest.test</p>
      <p><b>Bill to:</b> Acme Studio, 22 Market Road, Manchester</p>
      <p>Invoice date: 01 October 2026<br>Payment due: 31 October 2026</p>
      <table style="width:100%;border-collapse:collapse;margin-top:24px">
        <tr style="background:#eff6ff"><th align="left">Description</th><th>Qty</th><th align="right">Price</th><th align="right">Amount</th></tr>
        <tr><td>Managed WordPress hosting (October)</td><td align="center">3</td><td align="right">£40.00</td><td align="right">£120.00</td></tr>
        <tr><td>Daily backups add-on</td><td align="center">3</td><td align="right">£10.00</td><td align="right">£30.00</td></tr>
      </table>
      <p style="text-align:right;margin-top:24px">Subtotal: £150.00<br>VAT (20%): £30.00<br><b style="font-size:20px">Total due: £180.00</b></p></div>`,
  },
  {
    file: "printpro-flyers.pdf",
    html: `<div style="font-family:Georgia,serif;padding:48px;color:#222">
      <p style="font-size:28px;margin:0">PrintPro GmbH</p><p>Hauptstraße 8, 10115 Berlin · USt-IdNr. DE123456789</p>
      <hr><p>Rechnung / Invoice <b>#PP-77810</b> · Date 2026-10-12 · Due within 14 days (2026-10-26)</p>
      <p>Customer: Acme Studio</p>
      <p>5,000 A5 flyers, double-sided, 170g gloss ............ EUR 410.00<br>
      Express delivery ............ EUR 35.00</p>
      <p>Net amount: EUR 445.00<br>VAT 19%: EUR 84.55<br><b>Amount payable: EUR 529.55</b></p>
      <p style="color:#666">Please pay to IBAN DE00 1234 5678 9012 3456 78 quoting the invoice number.</p></div>`,
  },
  {
    file: "brightpixel-design.pdf",
    html: `<div style="font-family:Verdana;padding:48px;color:#111;font-size:14px">
      <div style="background:#111;color:#fff;padding:20px"><b style="font-size:22px">BrightPixel Design Co.</b> · 900 Sunset Ave, Austin, TX</div>
      <p>INVOICE BP-1093 · Issued: November 2, 2026 · Due: November 16, 2026</p>
      <p>Billed to: Acme Studio</p>
      <ul><li>Logo redesign: $1,200.00</li><li>Brand style guide (12 pages): $800.00</li></ul>
      <p>Subtotal $2,000.00<br>Sales tax (8.25%) $165.00<br><b>TOTAL $2,265.00</b></p></div>`,
  },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const inv of invoices) {
  await page.setContent(`<!doctype html><html><body style="margin:0">${inv.html}</body></html>`);
  await page.pdf({ path: OUT + inv.file, format: "A4" });
}
await browser.close();
console.log(`Wrote ${invoices.length} PDFs to ${OUT}`);
