
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
// Increase limit for large project backups (e.g. 50mb)
app.use(express.json({ limit: '50mb' }));

// Ensure backups directory exists
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// --- Helper Functions ---

async function translateString(text, targetLang) {
  if (!text || !text.trim()) return "";
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: targetLang,
      dt: 't',
      q: text
    });
    const response = await fetch('https://translate.googleapis.com/translate_a/single', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'User-Agent': 'Mozilla/5.0'
      },
      body: params
    });
    if (!response.ok) return text;
    const data = await response.json();
    if (data && data[0]) return data[0].map(item => item[0]).join('');
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// --- Endpoints ---

// 1. Proxy External URLs
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    if (!response.ok) return res.status(response.status).send(`Error: ${response.statusText}`);
    const html = await response.text();
    res.send(html);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// 2. Google Translate Web API
app.post('/api/translate', async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) return res.status(400).json({ error: 'Missing data' });

  const texts = Array.isArray(text) ? text : [text];
  const results = [];

  for (const t of texts) {
      const translated = await translateString(t, target);
      results.push(translated);
      await new Promise(resolve => setTimeout(resolve, 50)); 
  }
  res.json({ translations: results });
});

// 3. Save Backup to Disk
app.post('/api/backup', (req, res) => {
    try {
        const { data, filename } = req.body;
        if (!data) return res.status(400).json({ error: "No data provided" });

        const safeFilename = (filename || `backup_${Date.now()}.json`).replace(/[^a-z0-9_\-\.]/gi, '_');
        const filePath = path.join(BACKUP_DIR, safeFilename);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Backup saved to: ${filePath}`);
        
        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: "Failed to write file to disk" });
    }
});

// 4. Open Backups Folder in OS File Explorer
app.post('/api/open-folder', (req, res) => {
    let command = '';
    switch (process.platform) {
        case 'darwin': command = `open "${BACKUP_DIR}"`; break; // macOS
        case 'win32': command = `explorer "${BACKUP_DIR}"`; break; // Windows
        default: command = `xdg-open "${BACKUP_DIR}"`; break; // Linux
    }

    exec(command, (error) => {
        if (error) {
            console.error("Failed to open folder:", error);
            return res.status(500).json({ error: "Failed to open folder" });
        }
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`- Proxy: Enabled`);
  console.log(`- Translate: Enabled`);
  console.log(`- Backups: ${BACKUP_DIR}`);
});
