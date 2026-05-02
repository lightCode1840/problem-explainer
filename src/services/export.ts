import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { enableTailwind } from '@remotion/tailwind-v4';
import path from 'path';
import fs from 'fs';
import { AnyProblemData } from '../types/problem';

export async function exportVideo(
  data: AnyProblemData, 
  outputFilename: string,
  onProgressCallback?: (progress: number) => void
) {
  // 1. 设置路径
  const compositionId = 'ProblemExplainer';
  const entry = path.resolve(process.cwd(), 'src/index.ts');
  const outDir = path.resolve(process.cwd(), 'out');
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outputFile = path.join(outDir, `${outputFilename}.mp4`);

  console.log('Starting video export process...');
  console.log('Entry point:', entry);
  console.log('Output destination:', outputFile);

  try {
    // 2. Bundle the video using Webpack (Remotion's bundler)
    console.log('Bundling video...');
    const bundleLocation = await bundle({
      entryPoint: entry,
      webpackOverride: (config) => enableTailwind(config),
    });

    // 3. Extract metadata and select the composition
    console.log('Extracting composition metadata...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: { data },
    });

    // Use the accurate duration calculated from TTS
    const durationInFrames = data.durationInFrames || composition.durationInFrames;

    // 4. Render the video
    console.log(`Rendering video (${durationInFrames} frames)...`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps: { data },
      onProgress: ({ progress }) => {
        console.log(`Rendering progress: ${Math.round(progress * 100)}%`);
        if (onProgressCallback) {
          onProgressCallback(progress);
        }
      },
    });

    console.log('Video rendered successfully at:', outputFile);
    return outputFile;
  } catch (error) {
    console.error('Failed to export video:', error);
    throw error;
  }
}
