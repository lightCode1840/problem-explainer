import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { JavaInterviewProblemData } from '../types/problem';
import { GraphVisualizer } from '../components/visualizers/GraphVisualizer';
import { ComparisonVisualizer } from '../components/visualizers/ComparisonVisualizer';
import { TimelineVisualizer } from '../components/visualizers/TimelineVisualizer';

interface Props {
  data: JavaInterviewProblemData;
}

export const JavaInterviewTemplate: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 出场动画逻辑：紧凑展示
  // 为了让画面和音频更同步，不应将考点平摊到整个视频周期（那样可能要等几十秒才出一条）
  // 改为在视频开头阶段，每隔 1.5 秒飞入一条核心考点，让观众能迅速在画面上看到关键信息
  const appearFrame = fps * 1.5; // 1.5秒后开始显示第一个要点
  const framePerPoint = fps * 1.5; // 之后每隔1.5秒飞入一个要点

  // 计算当前应该播放哪一步动画（假设把总时间平分给 steps 数组）
  const activeStepIndex = useMemo(() => {
    let stepsLength = 0;
    if (data.graphData?.steps) stepsLength = data.graphData.steps.length;
    else if (data.comparisonData?.steps) stepsLength = data.comparisonData.steps.length;
    else if (data.timelineData?.steps) stepsLength = data.timelineData.steps.length;
    
    if (stepsLength === 0) return 0;
    
    const totalFrames = data.durationInFrames || fps * 30; // 兜底 30 秒
    const framesPerStep = totalFrames / stepsLength;
    // 确保 index 不会越界
    return Math.min(
      Math.floor(frame / framesPerStep),
      stepsLength - 1
    );
  }, [frame, data, fps]);

  // 底部自动滚动逻辑
  // 计算当前内容被分为了几页（假设每页能显示大约 180 个字符）
  const charsPerPage = 180;
  const totalPages = Math.max(1, Math.ceil(data.explanation.length / charsPerPage));
  
  // 真正的 PPT 式平滑翻页计算
  let pptScrollRatio = 0;
  if (totalPages > 1) {
    const durationFrames = data.durationInFrames || fps * 30;
    // 留出开头2秒和结尾2秒作为安全静止区
    const activeDuration = Math.max(1, durationFrames - fps * 4);
    const framesPerPage = activeDuration / totalPages;
    
    // 当前处于哪一页的周期内
    const activeFrame = Math.max(0, frame - fps * 2);
    const currentPageIndex = Math.min(totalPages - 1, Math.floor(activeFrame / framesPerPage));
    
    // 当前页周期内已经经过的帧数
    const frameInCurrentPage = activeFrame - currentPageIndex * framesPerPage;
    
    // 在每页的最后 1.5 秒触发向下翻页的弹簧动画
    // 假设翻页动画需要 1 秒，我们在倒数 1.5 秒开始
    const flipTriggerFrame = Math.max(0, framesPerPage - fps * 1.5);
    const transitionFrame = Math.max(0, frameInCurrentPage - flipTriggerFrame);
    
    const transitionProgress = spring({
      frame: transitionFrame,
      fps,
      config: { damping: 16, stiffness: 100, mass: 0.8 } // PPT 切换般干净利落的弹簧参数
    });
    
    // 最终的滚动比例：当前整页索引 + 翻页进度
    pptScrollRatio = (currentPageIndex + transitionProgress) / (totalPages - 1);
    
    // 确保不会超滚
    pptScrollRatio = Math.min(1, pptScrollRatio);
  }

  return (
    <AbsoluteFill className="bg-slate-100 p-8 flex-col gap-8 font-sans">
      {/* 上半部分：左侧要点 + 右侧图解 (占 60% 高度) */}
      <div className="flex w-full flex-row gap-8" style={{ height: '60%' }}>
        
        {/* 左侧：问题与知识要点区 */}
        <div className="w-1/2 h-full bg-white rounded-3xl border border-slate-200 p-10 flex flex-col relative overflow-hidden">
          <div className="bg-indigo-50 text-indigo-600 px-5 py-2 rounded-full text-lg font-bold w-max mb-6 border border-indigo-100 shrink-0">
            ☕ {data.title}
          </div>
          
          <h2 className="text-4xl font-bold text-slate-800 mb-8 leading-snug shrink-0">
            {data.question}
          </h2>
          
          {/* 动态计算字号的要点列表，确保不溢出 */}
          <div className="flex-1 relative flex flex-col min-h-0 bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-3 shrink-0 mb-3">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold text-slate-400 uppercase tracking-wider">
                核心考点
              </h3>
            </div>
            
            <div className="flex-1 w-full flex items-start overflow-hidden mt-1">
              <ul 
                className="space-y-3 w-full flex flex-col justify-start"
                style={{
                  // 去掉容易导致计算越界被裁切的 Scale，仅通过 Clamp 缩放字体
                  fontSize: `clamp(1rem, ${300 / Math.max(1, data.keyPoints.join('').length)}rem, 1.875rem)`,
                }}
              >
                {data.keyPoints.map((point, idx) => {
                  const itemAppearFrame = appearFrame + (idx * framePerPoint);
                  const isVisible = frame >= itemAppearFrame;
                  
                  return (
                    <li 
                      key={idx} 
                      className={`flex items-start text-slate-700 leading-relaxed transition-all duration-700 transform ${
                        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                      }`}
                    >
                      <span className="text-indigo-500 mr-3 text-2xl leading-none mt-1 shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧：八股文图解 / 知识卡片 */}
        <div className="w-1/2 h-full bg-white rounded-3xl border border-slate-200 flex flex-col justify-center items-center relative overflow-hidden p-8">
          {data.graphData ? (
            <div className="w-full h-full relative z-10 flex items-center justify-center">
              <GraphVisualizer graphData={data.graphData} activeStepIndex={activeStepIndex} />
            </div>
          ) : data.comparisonData ? (
            <div className="w-full h-full relative z-10 flex items-center justify-center">
              <ComparisonVisualizer comparisonData={data.comparisonData} activeStepIndex={activeStepIndex} />
            </div>
          ) : data.timelineData ? (
            <div className="w-full h-full relative z-10 flex items-center justify-center">
              <TimelineVisualizer timelineData={data.timelineData} activeStepIndex={activeStepIndex} />
            </div>
          ) : (
            /* 兜底静态图解卡片（当没有生成 graphData 时使用） */
            <div 
              className="w-full h-full flex flex-col items-center justify-center text-center transform transition-transform duration-1000"
              style={{ 
                transform: frame > appearFrame ? 'scale(1)' : 'scale(0.95)',
                opacity: frame > appearFrame ? 1 : 0 
              }}
            >
              <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 border border-indigo-100">
                <span className="text-5xl">{data.visualIcon || '💡'}</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-6">
                {data.title.split('-').pop()?.trim() || data.title}
              </h3>
              <div className="w-16 h-1.5 bg-indigo-500 rounded-full mb-8"></div>
              <div className="text-2xl text-slate-600 leading-relaxed text-left w-[80%] space-y-4">
                {/* 提取考点里的关键字高亮展示在右侧 */}
                {data.keyPoints.slice(0, 3).map((p, i) => {
                  const keywordMatch = p.match(/^([^：:，,]+)[：:，,]/);
                  const keyword = keywordMatch ? keywordMatch[1] : `要点 ${i + 1}`;
                  return (
                    <div key={i} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-slate-700 font-medium">{keyword}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部：详细讲解栏 (占 40% 高度) */}
      <div className="w-full flex-1 bg-white rounded-3xl border border-slate-200 p-10 flex flex-col relative overflow-hidden">
        <h3 className="text-xl font-bold text-indigo-500 mb-6 flex items-center gap-3 tracking-widest uppercase">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          深度解析
        </h3>
        
        <div className="flex-1 overflow-hidden relative">
          <div 
            className="text-slate-700 leading-relaxed tracking-wide w-full"
            style={{ 
              fontSize: '1.875rem', // 固定在一个舒适的阅读字号（text-3xl 左右）
              opacity: frame > appearFrame * 1.5 ? 1 : 0,
              transform: `translateY(calc(-1 * ${pptScrollRatio} * max(0px, 100% - 200px)))`,
              transition: 'opacity 1s ease-in-out'
            }}
          >
            {/* TODO: 未来可根据字幕时间戳 (TTS 字幕数组) 动态高亮当前朗读的句子，此处暂时全文渐显 */}
            {data.explanation}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
