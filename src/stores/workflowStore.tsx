import React, { createContext, useContext, useState } from 'react';

interface WorkflowStore {
  isGeneratingAudio: boolean;
  setIsGeneratingAudio: (v: boolean) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  exportProgress: number | null;
  setExportProgress: (v: number | null) => void;
  exportStatus: string;
  setExportStatus: (v: string) => void;
}

const WorkflowContext = createContext<WorkflowStore | null>(null);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState('');

  return (
    <WorkflowContext.Provider value={{
      isGeneratingAudio, setIsGeneratingAudio,
      isExporting, setIsExporting,
      exportProgress, setExportProgress,
      exportStatus, setExportStatus,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowStore(): WorkflowStore {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflowStore must be used within WorkflowProvider');
  return ctx;
}
