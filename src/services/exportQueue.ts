import { AnyProblemData } from '../types/problem';
import { exportVideo } from './export';

export type ExportStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface ExportTask {
  id: string;
  status: ExportStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
}

class ExportQueue {
  private tasks: Map<string, ExportTask> = new Map();

  addTask(taskId: string, videoData: AnyProblemData): ExportTask {
    const task: ExportTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
    };
    this.tasks.set(taskId, task);
    this.processTask(taskId, videoData);
    return task;
  }

  getTask(taskId: string): ExportTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, updates: Partial<ExportTask>) {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.set(taskId, { ...task, ...updates });
    }
  }

  private async processTask(taskId: string, videoData: AnyProblemData) {
    this.updateTask(taskId, { status: 'processing', progress: 0 });
    
    const outputFilename = `export_${taskId}`;
    
    try {
      // Modify exportVideo to accept a progress callback
      await exportVideo(videoData, outputFilename, (progress) => {
        this.updateTask(taskId, { progress });
      });
      
      this.updateTask(taskId, { 
        status: 'done', 
        progress: 1,
        outputUrl: `/api/export/download/${outputFilename}.mp4`
      });
    } catch (error) {
      this.updateTask(taskId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

export const exportQueue = new ExportQueue();
