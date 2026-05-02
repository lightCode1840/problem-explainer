import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnyProblemData } from '../types/problem';
import { SubtitleSegment } from '../plugins/types';

const DRAFT_KEYS = { standard: 'pex_draft_standard', programming: 'pex_draft_programming' } as const;

const DEFAULT_DATA: AnyProblemData = {
  id: 'sample-1', type: 'java_interview', title: 'Java基础 - 面向对象',
  question: '什么是多态？', keyPoints: ['多态三要素：继承、重写、父类引用指向子类'],
  explanation: '多态是Java面向对象的核心特性之一。', visualIcon: '☕',
} as AnyProblemData;

interface VideoStore {
  videoData: AnyProblemData;
  draftStatus: 'idle' | 'saved';
  setVideoData: (data: AnyProblemData, persistDraftKey?: 'standard' | 'programming') => void;
  updateAudio: (audioUrl: string, durationInFrames: number, subtitles?: SubtitleSegment[]) => void;
}

const VideoContext = createContext<VideoStore | null>(null);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videoData, setVideoDataState] = useState<AnyProblemData>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEYS.standard);
      return raw ? JSON.parse(raw) : DEFAULT_DATA;
    } catch { return DEFAULT_DATA; }
  });
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setVideoData = useCallback((data: AnyProblemData, persistDraftKey?: 'standard' | 'programming') => {
    setVideoDataState(data);
    if (persistDraftKey) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEYS[persistDraftKey], JSON.stringify(data));
          setDraftStatus('saved');
          clearTimeout(statusTimer.current);
          statusTimer.current = setTimeout(() => setDraftStatus('idle'), 2000);
        } catch { /* localStorage full */ }
      }, 1000);
    }
  }, []);

  const updateAudio = useCallback((audioUrl: string, durationInFrames: number, subtitles?: SubtitleSegment[]) => {
    setVideoDataState(prev => ({
      ...prev,
      audioUrl,
      durationInFrames,
      ...(subtitles ? { subtitles } : {}),
    }));
  }, []);

  return (
    <VideoContext.Provider value={{ videoData, draftStatus, setVideoData, updateAudio }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoStore(): VideoStore {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error('useVideoStore must be used within VideoProvider');
  return ctx;
}
