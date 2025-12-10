/**
 * BriaGen Backend Server
 * 
 * Usage: npx ts-node main.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

const PORT = 8000;

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

  if (req.method === "POST" && url.pathname === "/generate") {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { prompt, referenceImages } = JSON.parse(body);

        if (!prompt) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ error: "Prompt is required" }));
          return;
        }

        console.log(`[Backend] Received prompt: "${prompt}"`);
        if (referenceImages?.length) {
          console.log(`[Backend] Received ${referenceImages.length} reference images`);
        }

        if (!process.env.API_KEY) {
          console.error("API_KEY not found in environment variables");
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: "Server configuration error: API_KEY missing" }));
          return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct parts with optional image data
        const parts: any[] = [];
        
        // Add reference images first if they exist
        if (referenceImages && Array.isArray(referenceImages)) {
          referenceImages.forEach((base64String: string) => {
            // Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
            const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg', // Assuming jpeg/png, API handles standard types
                data: base64Data
              }
            });
          });
        }

        // Add the text prompt
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: parts,
          },
        });

        let imageUrl = null;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error("No image generated from the model.");
        }

        res.writeHead(200, headers);
        res.end(JSON.stringify({ image_url: imageUrl }));

      } catch (error: any) {
        console.error("[Backend] Error processing request:", error);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: error.message || "Internal Server Error" }));
      }
    });
  } else {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});