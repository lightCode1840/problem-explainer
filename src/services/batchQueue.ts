import { AnyProblemData, ProblemType } from '../types/problem';
import { parseProblemWithLLM, LLMConfig } from './llm';
import { generateTTS } from './tts';
import { exportQueue } from './exportQueue';

export type BatchTaskStatus = 'pending' | 'parsing' | 'tts' | 'rendering' | 'done' | 'failed';

export interface BatchItem {
  id: string;
  title: string;
  question: string;
  type: ProblemType;
  status: BatchTaskStatus;
  progress: number; // 0-100 for current step, or just overall
  error?: string;
  videoUrl?: string;
  data?: AnyProblemData;
}

export interface BatchJob {
  id: string;
  items: BatchItem[];
  status: 'running' | 'done' | 'failed';
  createdAt: number;
  llmConfig?: LLMConfig;
  model?: string;
}

class BatchQueue {
  private jobs: Map<string, BatchJob> = new Map();

  createJob(
    itemsData: Array<{ title: string; question: string; type: ProblemType }>,
    config?: { apiKey?: string; baseURL?: string; model?: string }
  ): BatchJob {
    const jobId = `batch_${Date.now()}`;
    const items: BatchItem[] = itemsData.map((item, index) => ({
      id: `${jobId}_item_${index}`,
      title: item.title,
      question: item.question,
      type: item.type,
      status: 'pending',
      progress: 0,
    }));

    const job: BatchJob = {
      id: jobId,
      items,
      status: 'running',
      createdAt: Date.now(),
      llmConfig: config ? { apiKey: config.apiKey, baseURL: config.baseURL } : undefined,
      model: config?.model,
    };

    this.jobs.set(jobId, job);
    this.processJob(jobId);
    return job;
  }

  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  private updateItemStatus(jobId: string, itemId: string, updates: Partial<BatchItem>) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const itemIndex = job.items.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
      job.items[itemIndex] = { ...job.items[itemIndex], ...updates };
      this.jobs.set(jobId, job);
    }
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    for (const item of job.items) {
      try {
        await this.processItem(jobId, item);
      } catch (error) {
        console.error(`Error processing batch item ${item.id}:`, error);
        this.updateItemStatus(jobId, item.id, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    job.status = 'done';
    this.jobs.set(jobId, job);
  }

  private async processItem(jobId: string, item: BatchItem) {
    this.updateItemStatus(jobId, item.id, { status: 'parsing', progress: 10 });
    
    // 1. LLM Parsing
    const rawText = `${item.title}\n${item.question}`;
    const job = this.jobs.get(jobId);
    const stream = await parseProblemWithLLM(rawText, item.type, job?.model ?? 'deepseek-chat', 'javascript', job?.llmConfig);
    
    let fullJsonText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullJsonText += content;
      }
    }

    let cleanJsonText = fullJsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    cleanJsonText = cleanJsonText.replace(/^```json/im, '').replace(/```$/m, '').trim();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJsonText);
    } catch {
      throw new Error('Failed to parse LLM output');
    }

    this.updateItemStatus(jobId, item.id, { status: 'tts', progress: 40 });

    // 2. TTS Generation
    let explanationText = '';
    if ('steps' in parsedData && Array.isArray(parsedData.steps)) {
      const stepsArray = parsedData.steps as Array<{ text: string, spokenText?: string }>;
      explanationText = stepsArray.map(step => step.spokenText || step.text).join('。');
    } else {
      explanationText = parsedData.explanation as string || '';
    }
    
    const problemReading = 'problemReading' in parsedData ? parsedData.problemReading as string : '';
    const ttsText = (problemReading ? problemReading + '。' : '') + explanationText;

    if (ttsText) {
      try {
        const { audioUrl, durationInSeconds } = await generateTTS(ttsText, item.id);
        parsedData.audioUrl = audioUrl;
        const fps = 30;
        parsedData.durationInFrames = Math.ceil(durationInSeconds * fps) + (2 * fps);
      } catch (ttsError) {
        console.error('Failed to generate TTS:', ttsError);
        parsedData.durationInFrames = 500;
      }
    } else {
      parsedData.durationInFrames = 500;
    }

    // Assign id and title if missing
    parsedData.id = item.id;
    parsedData.type = item.type;
    if (!parsedData.title) parsedData.title = item.title;
    if (!parsedData.question) parsedData.question = item.question;

    this.updateItemStatus(jobId, item.id, { status: 'rendering', progress: 60, data: parsedData });

    // 3. Rendering (Wait for exportQueue)
    exportQueue.addTask(item.id, parsedData);
    
    // Poll for export completion (max 5-minute timeout)
    const MAX_POLL_MS = 300_000;
    const pollStart = Date.now();
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const status = exportQueue.getTask(item.id);
        if (!status) {
          clearInterval(interval);
          reject(new Error('Export task not found'));
          return;
        }

        if (Date.now() - pollStart > MAX_POLL_MS) {
          clearInterval(interval);
          reject(new Error('Export timed out after 5 minutes'));
          return;
        }

        if (status.status === 'processing') {
          // Map 0-1 to 60-99
          const renderProgress = 60 + Math.floor(status.progress * 39);
          this.updateItemStatus(jobId, item.id, { progress: renderProgress });
        } else if (status.status === 'done') {
          clearInterval(interval);
          this.updateItemStatus(jobId, item.id, { 
            status: 'done', 
            progress: 100,
            videoUrl: status.outputUrl 
          });
          resolve();
        } else if (status.status === 'failed') {
          clearInterval(interval);
          reject(new Error(status.error || 'Render failed'));
        }
      }, 1000);
    });
  }
}

export const batchQueue = new BatchQueue();