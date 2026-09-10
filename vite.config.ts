import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';

dotenv.config();

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

function legalMetrologyApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-legal-metrology-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/analyze' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { imageBase64, mimeType = 'image/jpeg', rawText } = JSON.parse(body || '{}');
              const apiKey = process.env.GEMINI_API_KEY;

              if (!apiKey) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  source: 'NO_API_KEY_FALLBACK',
                  message: 'No GEMINI_API_KEY found. Utilizing offline OCR & LMPC rules engine.'
                }));
                return;
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build'
                  }
                }
              });

              const systemInstruction = `
You are an expert Inspector under the Legal Metrology (Packaged Commodities) Rules, 2011 (India).
Examine the package label image and OCR text.
Evaluate mandatory declarations:
1. Rule 6(1)(a): Manufacturer/Packer/Importer complete name, registered address with state and 6-digit PIN code.
2. Rule 6(1)(b): Generic or common name of commodity.
3. Rule 6(1)(c) & Rule 11, 12, 13: Net quantity in standard SI units (g, kg, ml, l, N). Reject illegal symbols like "gms", "Kgs", "ltrs", "pcs".
4. Rule 6(1)(d): Month & year of manufacture/packing/import.
5. Rule 6(1)(e): Maximum Retail Price (MRP) explicitly stating "inclusive of all taxes".
6. Rule 6(11): Unit Sale Price (USP) per g/ml/kg/N.
7. Rule 6(8): Consumer care telephone, email, and designated officer.
8. Rule 6(10): Country of Origin.
9. Rule 7: Minimum font height on Principal Display Panel.

Respond with strict JSON adhering to:
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
                    data: cleanBase64
                  }
                });
              }
              if (rawText) {
                parts.push({
                  text: `Extracted OCR text:\n${rawText}`
                });
              }
              parts.push({
                text: 'Assess this packaged commodity for Legal Metrology Rules 2011 compliance.'
              });

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: { parts },
                config: {
                  systemInstruction,
                  responseMimeType: 'application/json'
                }
              });

              let parsedData = {};
              try {
                parsedData = JSON.parse(response.text || '{}');
              } catch {
                parsedData = { inspectorSummary: response.text };
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                source: 'GEMINI_MULTIMODAL_API',
                data: parsedData,
                rawOutput: response.text
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({
                success: false,
                error: err.message || 'Internal server error during analysis'
              }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), legalMetrologyApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
