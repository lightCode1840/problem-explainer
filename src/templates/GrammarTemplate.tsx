import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GrammarProblemData } from '../types/problem';

interface Props {
  data: GrammarProblemData;
}

export const GrammarTemplate: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 动态同步：如果视频有配音（时间长），在讲解开始后不久（如1.5秒）揭晓答案，因为配音一开始就在读解析
  // 如果是默认短视频，则在 1 秒后揭晓
  const revealAnswerFrame = Math.min(1.5 * fps, durationInFrames * 0.2);

  return (
    <AbsoluteFill className="bg-white items-center justify-center p-16 font-sans">
      <div className="w-full max-w-4xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-12 text-center leading-relaxed">
          {data.question}
        </h1>

        <div className="grid grid-cols-2 gap-8 w-full">
          {data.options.map((opt: string, idx: number) => {
            const isCorrect = idx === data.correctAnswer;
            const isRevealed = frame >= revealAnswerFrame;
            
            let bgColor = "bg-gray-100";
            let textColor = "text-gray-700";
            let borderColor = "border-transparent";

            if (isRevealed && isCorrect) {
              bgColor = "bg-green-100";
              textColor = "text-green-800";
              borderColor = "border-green-500";
            } else if (isRevealed && !isCorrect) {
              bgColor = "bg-gray-50";
              textColor = "text-gray-400";
            }

            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border-4 text-3xl font-medium transition-all duration-500 ${bgColor} ${textColor} ${borderColor} flex items-center shadow-sm`}
              >
                <span className="mr-6 font-bold text-blue-500">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </div>
            );
          })}
        </div>

        {frame >= revealAnswerFrame && (
          <div className="mt-16 p-8 bg-blue-50 rounded-2xl text-2xl text-blue-900 leading-relaxed animate-fade-in">
            <span className="font-bold mr-2">解析：</span>
            {data.explanation}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
