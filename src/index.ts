import chromium from "chrome-aws-lambda";

import { errorReponse, Response, successReponse } from "./helpers/responses";
import { Event } from "./interfaces/event";

exports.handler = async (event: Event) => {
  let response!: Response;
  let browser = null;

  if (!event.html) return errorReponse("html is required");

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.setContent(event.html, {
      waitUntil: "domcontentloaded",
    });

    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
    });

    response = successReponse(
      "pdf created successfully",
      pdfBuffer.toString("base64")
    );
  } catch (error: any) {
    console.error(error);
    return errorReponse("error creating the pdf", error.message);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return response;
};
