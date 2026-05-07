import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { EdgeTTS } from 'node-edge-tts';
import { SubtitleSegment } from '../plugins/types';

// In packaged Electron builds PEX_DATA_DIR points to the user's writable data dir.
// Falls back to the project root for regular dev/server mode.
const outputDir = path.join(process.env.PEX_DATA_DIR ?? process.cwd(), 'public', 'voiceover');

export function estimateSubtitles(text: string, durationInSeconds: number): SubtitleSegment[] {
  const phrases = text.split(/(?<=[。！？\n])\s*/g).map(s => s.trim()).filter(Boolean);
  if (phrases.length === 0) {
    return [{ text, startMs: 0, endMs: Math.round(durationInSeconds * 1000) }];
  }
  const totalChars = phrases.reduce((sum, p) => sum + p.length, 0);
  const totalMs = durationInSeconds * 1000;
  let currentMs = 0;
  return phrases.map(phrase => {
    const segMs = (phrase.length / totalChars) * totalMs;
    const segment: SubtitleSegment = {
      text: phrase,
      startMs: Math.round(currentMs),
      endMs: Math.round(currentMs + segMs),
    };
    currentMs += segMs;
    return segment;
  });
}

export async function generateTTS(text: string, _filename?: string): Promise<{ audioUrl: string; durationInSeconds: number; subtitles: SubtitleSegment[] }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const hash = crypto.createHash('md5').update(text).digest('hex');
  const filename = hash;
  const outputPath = path.join(outputDir, `${filename}.mp3`);
  
  try {
    if (fs.existsSync(outputPath)) {
      console.log(`Audio for hash ${hash} already exists, skipping TTS generation.`);
      const durationInSeconds = await getAudioDurationInSeconds(outputPath);
      return {
        audioUrl: `/voiceover/${filename}.mp3`,
        durationInSeconds,
        subtitles: estimateSubtitles(text, durationInSeconds),
      };
    }

    const tts = new EdgeTTS({
      voice: 'zh-CN-XiaoxiaoNeural',
      lang: 'zh-CN'
    });
    
    // Replace newlines with spaces for TTS to avoid breaks
    let cleanText = text.replace(/\n/g, ' ');
    
    // Sanitize text for TTS: remove markdown and fill-in-the-blank underscores
    cleanText = cleanText
      .replace(/_{2,}/g, ' ') // Replace multiple underscores with a space (so it doesn't read "underscore")
      .replace(/\*\*/g, '')   // Remove markdown bold
      .replace(/\*/g, '')     // Remove markdown italic
      .replace(/`/g, '')      // Remove markdown inline code
      .replace(/#/g, '');     // Remove markdown headers
    
    await tts.ttsPromise(cleanText, outputPath);
    
    // Get exact audio duration
    const durationInSeconds = await getAudioDurationInSeconds(outputPath);
    
    return {
      audioUrl: `/voiceover/${filename}.mp3`,
      durationInSeconds,
      subtitles: estimateSubtitles(text, durationInSeconds),
    };
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw error;
  }
}
