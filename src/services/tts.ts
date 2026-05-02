import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { EdgeTTS } from 'node-edge-tts';

const outputDir = path.join(process.cwd(), "public", "voiceover");

export async function generateTTS(text: string, _filename?: string): Promise<{ audioUrl: string; durationInSeconds: number }> {
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
        durationInSeconds
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
    
    // Return the relative path for frontend to use
    return {
      audioUrl: `/voiceover/${filename}.mp3`,
      durationInSeconds
    };
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw error;
  }
}
