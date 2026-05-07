import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { enableTailwind } from '@remotion/tailwind-v4';
import path from 'path';
import fs from 'fs';
import { AnyProblemData } from '../types/problem';

export async function exportVideo(
  data: AnyProblemData,
  outputFilename: string,
  onProgressCallback?: (progress: number) => void,
  showWatermark = false
) {
  const compositionId = 'ProblemExplainer';

  // Output goes to the user-writable data directory (supports Electron packaging)
  const outDir = path.resolve(process.env.PEX_DATA_DIR ?? process.cwd(), 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outputFile = path.join(outDir, `${outputFilename}.mp4`);

  const port = process.env.PORT || 3001;
  const renderData: AnyProblemData = {
    ...data,
    audioUrl: data.audioUrl?.startsWith('/')
      ? `http://localhost:${port}${data.audioUrl}`
      : data.audioUrl,
  };

  try {
    // Use a pre-built Remotion bundle when available (production / Electron packaged).
    // Falls back to building fresh via webpack (dev mode).
    const remotionBundleDir = process.env.PEX_REMOTION_BUNDLE_DIR
      ?? path.resolve(process.cwd(), 'build');
    const prebuiltIndex = path.join(remotionBundleDir, 'index.html');

    let bundleLocation: string;
    if (fs.existsSync(prebuiltIndex)) {
      // Serve the pre-built bundle through the running Express server
      bundleLocation = `http://localhost:${port}/remotion-bundle/index.html`;
      console.log('Using pre-built Remotion bundle:', bundleLocation);
    } else {
      console.log('Building Remotion bundle (first run may take ~30 s)…');
      const entry = path.resolve(process.cwd(), 'src/index.ts');
      bundleLocation = await bundle({
        entryPoint: entry,
        webpackOverride: (config) => enableTailwind(config),
      });
    }

    console.log('Selecting composition…');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: { data: renderData, showWatermark },
    });

    const durationInFrames = renderData.durationInFrames || composition.durationInFrames;

    console.log(`Rendering ${durationInFrames} frames…`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps: { data: renderData, showWatermark },
      onProgress: ({ progress }) => {
        console.log(`Progress: ${Math.round(progress * 100)}%`);
        onProgressCallback?.(progress);
      },
    });

    console.log('Rendered to:', outputFile);
    return outputFile;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
