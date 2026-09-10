/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Server API Endpoint: /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', rawText } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        success: false,
        source: 'NO_API_KEY_FALLBACK',
        message: 'No GEMINI_API_KEY found in environment. Please use Offline OCR Mode.',
      });
    }

    const systemInstruction = `
You are a Senior Legal Metrology Inspector assessing packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011 (India).
Analyze the provided product image / OCR text strictly against:
1. Rule 6(1)(a) - Name and complete address of Manufacturer / Packer / Importer (State & PIN code mandatory).
2. Rule 6(1)(b) - Generic / Common name of commodity.
3. Rule 6(1)(c), Rule 11, 12, 13 - Net quantity and standard S.I. units (g, kg, ml, l, N). Flag non-standard symbols like "gms", "Kgs", "ltrs", "pcs" as illegal violations.
4. Rule 6(1)(d) - Month & Year of manufacture / packing / import.
5. Rule 6(1)(e) - Maximum Retail Price (MRP) explicitly stating "inclusive of all taxes".
6. Rule 6(11) - Unit Sale Price (USP) declaration (₹ per g/ml/kg/N).
7. Rule 6(8) - Consumer care contact (Designation, Address, Helpline phone, Email ID).
8. Rule 6(10) - Country of Origin declaration.
9. Rule 7 - Minimum numeral and letter height on the Principal Display Panel (PDP).

Return a strictly valid JSON object matching this schema:
{
  "commodityName": string,
  "brandName": string,
  "manufacturerName": string,
  "manufacturerAddress": string,
  "netQuantityValue": number | null,
  "netQuantityUnit": string,
  "rawNetQuantityString": string,
  "hasIllegalUnitSymbol": boolean,
  "illegalUnitDetected": string,
  "mfgMonthYear": string,
  "expiryOrBestBefore": string,
  "mrpAmount": number | null,
  "isInclusiveOfAllTaxes": boolean,
  "unitSalePriceDeclared": string,
  "calculatedExpectedUSP": string,
  "consumerCareName": string,
  "consumerCarePhone": string,
  "consumerCareEmail": string,
  "countryOfOrigin": string,
  "batchOrLotNumber": string,
  "estimatedLetterHeightMm": number,
  "violationsFound": string[],
  "inspectorSummary": string
}
`;

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        }
      });
    }
    if (rawText) {
      parts.push({
        text: `Transcribed label text:\n${rawText}`
      });
    }
    parts.push({
      text: 'Scan this packaged commodity label and return legal metrology compliance assessment JSON.'
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const textOutput = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      parsedData = { inspectorSummary: textOutput };
    }

    return res.status(200).json({
      success: true,
      source: 'GEMINI_MULTIMODAL_API',
      data: parsedData,
      rawOutput: textOutput
    });
  } catch (error: any) {
    console.error('API /api/analyze error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error processing label analysis'
    });
  }
});

// Serve static frontend in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Legal Metrology Compliance server running on port ${PORT}`);
});
