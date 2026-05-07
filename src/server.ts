import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { parseProblemWithLLM, splitTextToProblems, testConnection, LLMConfig } from './services/llm';
import { generateTTS } from './services/tts';
import { exportQueue } from './services/exportQueue';
import { batchQueue } from './services/batchQueue';
import { ProblemType } from './types/problem';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

// In packaged Electron mode these env vars are set by electron/main.ts before
// this module is loaded. In standalone server mode they fall back to cwd.
const APP_DIR  = process.env.PEX_APP_DIR  ?? process.cwd();
const DATA_DIR = process.env.PEX_DATA_DIR ?? process.cwd();

const app = express();
const preferredPort = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// ── Static file routes (order matters) ──

// User-generated voiceover audio (writable, lives in DATA_DIR)
app.use('/voiceover', express.static(path.join(DATA_DIR, 'public', 'voiceover')));

// Pre-built Remotion bundle (served so export.ts can reference it via HTTP)
const remotionBundleDir = process.env.PEX_REMOTION_BUNDLE_DIR
  ?? path.join(APP_DIR, 'build');
if (fs.existsSync(remotionBundleDir)) {
  app.use('/remotion-bundle', express.static(remotionBundleDir));
}

// Other static assets from the app directory (favicon, etc.)
app.use(express.static(path.join(APP_DIR, 'public')));

// Vite production build (frontend SPA)
const distPath = path.join(APP_DIR, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', hasEnvApiKey: !!process.env.OPENAI_API_KEY });
});

app.post('/api/test-config', async (req, res) => {
  const { apiKey, baseURL } = req.body;
  if (!apiKey?.trim()) {
    return res.status(400).json({ success: false, error: 'API Key 不能为空' });
  }
  try {
    await testConnection({ apiKey, baseURL });
    res.json({ success: true });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const isAuthError = err.status === 401 || err.status === 403;
    res.status(400).json({
      success: false,
      error: isAuthError ? 'API Key 无效，请检查是否正确' : (err.message || '连接失败'),
    });
  }
});

app.post('/api/batch/split-text', async (req, res) => {
  try {
    const { rawText, model, apiKey, baseURL } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Missing rawText' });
    }
    const problems = await splitTextToProblems(rawText, model, { apiKey, baseURL });
    res.json({ problems });
  } catch (error) {
    console.error('API Error during split-text:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to split text' });
  }
});

app.post('/api/batch/scrape', async (req, res) => {
  try {
    const { url, model } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }

    // Only allow public HTTP(S) URLs — block SSRF to internal networks
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return res.status(400).json({ error: 'Internal network URLs are not allowed' });
    }

    // 简单 MVP 实现：获取网页 HTML 并用正则剔除标签，然后交给 LLM 拆分
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch URL: ${fetchRes.statusText}`);
    }
    
    const html = await fetchRes.text();
    // 粗略移除 script 和 style 标签内容，再移除所有 HTML 标签
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // 截取前 10000 个字符避免 token 超限
      .substring(0, 10000);

    const problems = await splitTextToProblems(cleanText, model);
    res.json({ problems });
  } catch (error) {
    console.error('API Error during scrape:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to scrape and split' });
  }
});

app.post('/api/batch/start', async (req, res) => {
  try {
    const { items, apiKey, baseURL, model } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing items array' });
    }
    const job = batchQueue.createJob(items, { apiKey, baseURL, model });
    res.json({ jobId: job.id, message: 'Batch job started' });
  } catch (error) {
    console.error('API Error during batch start:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start batch' });
  }
});

app.get('/api/batch/status/:id', (req, res) => {
  const jobId = req.params.id;
  const job = batchQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.post('/api/batch/merge/:id', (req, res) => {
  const jobId = req.params.id;
  const job = batchQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const validItems = job.items.filter(item => item.status === 'done' && item.videoUrl);
  if (validItems.length === 0) {
    return res.status(400).json({ error: 'No successful videos to merge' });
  }

  const outDir = path.resolve(DATA_DIR, 'out');
  const mergedFilename = `merged_${jobId}.mp4`;
  const mergedFilepath = path.resolve(outDir, mergedFilename);
  const listFilepath = path.resolve(outDir, `list_${jobId}.txt`);

  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const listContent = validItems.map(item => {
      const filename = item.videoUrl!.split('/').pop();
      const absPath = path.resolve(outDir, filename!);
      return `file '${absPath}'`;
    }).join('\n');
    
    fs.writeFileSync(listFilepath, listContent, 'utf-8');

    // Use ffmpeg-static bundled binary when available, fall back to system ffmpeg
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegBin: string = (() => { try { return require('ffmpeg-static') ?? 'ffmpeg'; } catch { return 'ffmpeg'; } })();
    const cmd = `"${ffmpegBin}" -y -f concat -safe 0 -i "${listFilepath}" -c copy "${mergedFilepath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(listFilepath)) fs.unlinkSync(listFilepath);
      } catch (e) {
        console.warn('Failed to delete list file:', e);
      }

      if (error) {
        console.error('FFmpeg merge error:', error, stderr);
        return res.status(500).json({ error: 'Failed to merge videos via FFmpeg' });
      }

      res.json({
        message: 'Merged successfully',
        videoUrl: `/api/export/download/${mergedFilename}`
      });
    });
  } catch (error) {
    console.error('Merge exception:', error);
    res.status(500).json({ error: 'Internal server error during merge' });
  }
});

app.post('/api/parse', async (req, res) => {
  try {
    const { rawText, targetType, type: typeParam, model, language, apiKey, baseURL } = req.body;
    const resolvedType: string = typeParam || targetType;

    if (!rawText || !resolvedType) {
      return res.status(400).json({ error: 'Missing rawText or targetType' });
    }

    const validTypes: ProblemType[] = ['grammar', 'java_interview', 'leetcode'];
    if (!validTypes.includes(resolvedType as ProblemType)) {
      return res.status(400).json({ error: 'Invalid targetType' });
    }

    const llmConfig: LLMConfig = {};
    if (apiKey) llmConfig.apiKey = apiKey;
    if (baseURL) llmConfig.baseURL = baseURL;

    console.log(`Parsing problem as ${resolvedType} using model ${model || 'default'} (Language: ${language || 'default'})...`);

    const stream = await parseProblemWithLLM(rawText, resolvedType as ProblemType, model, language, llmConfig);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    let fullJsonText = '';

    for await (const chunk of stream) {
      if (aborted) {
        console.log('Client disconnected, aborting LLM stream');
        break;
      }
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullJsonText += content;
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    // Clean up the accumulated JSON text
    let cleanJsonText = fullJsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    cleanJsonText = cleanJsonText.replace(/^```json/im, '').replace(/```$/m, '').trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJsonText);
    } catch {
      console.error('Failed to parse accumulated JSON');
      res.write(`data: ${JSON.stringify({ error: 'Failed to parse LLM output' })}\n\n`);
      res.end();
      return;
    }

    // Generate TTS for the combined explanation
    const problemReading = 'problemReading' in parsedData ? parsedData.problemReading as string : '';
    
    // Handle both 'steps' (for leetcode) and 'explanation' (for others)
    let explanationText = '';
    if ('steps' in parsedData && Array.isArray(parsedData.steps)) {
      const stepsArray = parsedData.steps as Array<{ text: string, spokenText?: string }>;
      // Prefer spokenText for audio if available
      explanationText = stepsArray.map(step => step.spokenText || step.text).join('。');
    } else {
      const explanation = parsedData.explanation as string | string[];
      explanationText = Array.isArray(explanation) ? explanation.join('。') : (explanation || '');
    }
    
    const ttsText = (problemReading ? problemReading + '。' : '') + explanationText;
    
    if (ttsText) {
      console.log('Generating TTS for explanation...');
      try {
        const { audioUrl, durationInSeconds, subtitles } = await generateTTS(ttsText, parsedData.id || Date.now().toString());
        parsedData.audioUrl = audioUrl;
        const fps = 30;
        parsedData.durationInFrames = Math.ceil(durationInSeconds * fps) + (2 * fps);
        parsedData.subtitles = subtitles;
      } catch (ttsError) {
        console.error('Failed to generate TTS, proceeding without audio:', ttsError);
        parsedData.durationInFrames = 500; // Fallback default
      }
    } else {
      parsedData.durationInFrames = 500; // Fallback default
    }
    
    // Send the final result with audio info
    res.write(`data: ${JSON.stringify({ final: parsedData })}\n\n`);
    res.end();
  } catch (error) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred during parsing' 
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' })}\n\n`);
      res.end();
    }
  }
});

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { id, problemReading, stepsText, explanation } = req.body;
    
    // Construct the full text to be spoken
    let explanationText = '';
    if (stepsText) {
      try {
        const steps = JSON.parse(stepsText);
        if (Array.isArray(steps)) {
          explanationText = steps.map(step => step.spokenText || step.text).join('。');
        }
      } catch {
        console.warn('Failed to parse stepsText, falling back to empty string');
      }
    } else if (explanation) {
      explanationText = Array.isArray(explanation) ? (explanation as string[]).join('。') : (explanation as string);
    }
    
    const ttsText = (problemReading ? problemReading + '。' : '') + explanationText;
    
    if (!ttsText) {
      return res.status(400).json({ error: 'No text provided for audio generation' });
    }

    const problemId = id || Date.now().toString();
    console.log('Generating TTS manually...');
    
    const { audioUrl, durationInSeconds, subtitles } = await generateTTS(ttsText, problemId);

    const fps = 30;
    const durationInFrames = Math.ceil(durationInSeconds * fps) + (2 * fps);

    res.json({
      audioUrl,
      durationInFrames,
      subtitles,
    });

  } catch (error) {
    console.error('API Error during manual audio generation:', error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    const { videoData, showWatermark } = req.body;
    if (!videoData) {
      return res.status(400).json({ error: 'Missing videoData' });
    }

    const taskId = `${videoData.id || 'unknown'}_${Date.now()}`;
    exportQueue.addTask(taskId, videoData, !!showWatermark);

    // Immediately respond that export has started
    res.json({ 
      message: 'Export started successfully.',
      taskId
    });

  } catch (error) {
    console.error('API Error during export:', error);
    res.status(500).json({ error: 'Failed to start export process' });
  }
});

app.get('/api/export/status/:id', (req, res) => {
  const taskId = req.params.id;
  const task = exportQueue.getTask(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

app.get('/api/export/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // strip any directory components
  const outDir = path.resolve(DATA_DIR, 'out');
  const filePath = path.resolve(outDir, filename);

  // Ensure the resolved path is still inside the out/ directory
  if (!filePath.startsWith(outDir + path.sep) && filePath !== outDir) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    }
  });
});

// Serve Remotion bundle files at root level so the bundle HTML's
// root-relative asset references (/bundle.js, /*.wasm) resolve correctly
// during export rendering.
if (fs.existsSync(remotionBundleDir)) {
  app.use(express.static(remotionBundleDir));
}

// SPA fallback — must be after all API routes and static mounts
if (fs.existsSync(distPath)) {
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function startServer(port: number, retriesLeft = 5, isFallback = false) {
  const server = app.listen(port, () => {
    const mode = fs.existsSync(distPath) ? 'production' : 'development';
    const actualPort = (server.address() as { port: number }).port;
    process.env.PORT = String(actualPort);
    if (actualPort !== 3001) {
      console.warn(`Port 3001 was occupied, bound to http://localhost:${actualPort}`);
    }
    console.log(`Server running at http://localhost:${actualPort} [${mode}]`);
    if (fs.existsSync(distPath)) {
      console.log(`Open http://localhost:${actualPort} in your browser`);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (retriesLeft > 0) {
        console.warn(`Port ${port} is in use, trying ${port + 1} (${retriesLeft} retries left)...`);
        server.close();
        startServer(port + 1, retriesLeft - 1, true);
      } else {
        // Last resort: let the OS assign a random free port
        console.warn('No preferred port available, falling back to random port...');
        server.close();
        startServer(0, 0, true);
      }
    } else {
      throw err;
    }
  });
}

startServer(preferredPort);
