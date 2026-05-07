import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GrammarProblemData } from '../types/problem';

interface Props {
  data: GrammarProblemData;
  isDark?: boolean;
}

export const GrammarTemplate: React.FC<Props> = ({ data, isDark = false }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 动态同步：如果视频有配音（时间长），在讲解开始后不久（如1.5秒）揭晓答案，因为配音一开始就在读解析
  // 如果是默认短视频，则在 1 秒后揭晓
  const revealAnswerFrame = Math.min(1.5 * fps, durationInFrames * 0.2);

  return (
    <AbsoluteFill className={`${isDark ? 'bg-[#0f0f11]' : 'bg-white'} items-center justify-center p-16 font-sans`}>
      <div className="w-full max-w-4xl">
        <h1 className={`text-5xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-12 text-center leading-relaxed`}>
          {data.question}
        </h1>

        <div className="grid grid-cols-2 gap-8 w-full">
          {data.options.map((opt: string, idx: number) => {
            const isCorrect = idx === data.correctAnswer;
            const isRevealed = frame >= revealAnswerFrame;
            
            let bgColor = isDark ? "bg-[#18181b]" : "bg-gray-100";
            let textColor = isDark ? "text-gray-300" : "text-gray-700";
            let borderColor = isDark ? "border-gray-800" : "border-transparent";

            if (isRevealed && isCorrect) {
              bgColor = isDark ? "bg-green-900/30" : "bg-green-100";
              textColor = isDark ? "text-green-400" : "text-green-800";
              borderColor = isDark ? "border-green-500/50" : "border-green-500";
            } else if (isRevealed && !isCorrect) {
              bgColor = isDark ? "bg-[#0f0f11]" : "bg-gray-50";
              textColor = isDark ? "text-gray-600" : "text-gray-400";
              borderColor = isDark ? "border-gray-900" : "border-transparent";
            }

            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border-4 text-3xl font-medium transition-all duration-500 ${bgColor} ${textColor} ${borderColor} flex items-center shadow-sm`}
              >
                <span className={`mr-6 font-bold ${isDark ? 'text-cyan-500' : 'text-blue-500'}`}>{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </div>
            );
          })}
        </div>

        {frame >= revealAnswerFrame && (
          <div className={`mt-16 p-8 ${isDark ? 'bg-cyan-900/20 text-cyan-100 border border-cyan-900/50' : 'bg-blue-50 text-blue-900'} rounded-2xl text-2xl leading-relaxed animate-fade-in`}>
            <span className="font-bold mr-2">解析：</span>
            {data.explanation}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
