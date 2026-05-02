import React from 'react';
import { TimelineData } from '../../types/problem';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  timelineData: TimelineData;
  activeStepIndex: number;
}

export const TimelineVisualizer: React.FC<Props> = ({ timelineData, activeStepIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Find the active events for the current step
  const activeEvents = timelineData.steps[activeStepIndex]?.activeEvents || [];

  // Calculate dynamic scale factor to prevent overflow when there are many events
  const scaleFactor = Math.min(1, 3.0 / Math.max(1, timelineData.events.length));

  return (
    <div className="w-full h-full flex flex-col justify-center items-center font-sans p-6">
      <div 
        className="relative w-full max-w-lg mx-auto transition-transform duration-500"
        style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'center center' }}
      >
        {/* Timeline Vertical Line */}
        <div className="absolute left-6 top-6 bottom-6 w-1 bg-slate-200 rounded-full"></div>
        
        {/* Events List */}
        <div className="space-y-10 relative z-10">
          {timelineData.events.map((event, index) => {
            const isActive = activeEvents.includes(index);
            const hasPassed = activeStepIndex > 0 && Math.max(...activeEvents) > index; // check if this step has been completed
            
            // Animate appearance
            const appearProgress = spring({
              frame: frame - (index * 15), // stagger
              fps,
              config: { damping: 14, stiffness: 100 }
            });
            
            // Pop animation for active state
            const popScale = spring({
              frame: isActive ? frame - (index * 5) : 0, // start pop when active
              fps,
              config: { damping: 10, mass: 0.8 }
            });

            return (
              <div 
                key={index}
                className="flex items-start gap-6 relative"
                style={{
                  opacity: appearProgress,
                  transform: `translateX(${(1 - appearProgress) * -30}px)`
                }}
              >
                {/* Timeline Dot/Icon */}
                <div 
                  className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold shadow-sm transition-all duration-500 z-10 shrink-0
                    ${isActive 
                      ? 'bg-indigo-500 border-indigo-200 text-white shadow-indigo-200/50 shadow-lg scale-110' 
                      : hasPassed 
                        ? 'bg-white border-indigo-400 text-indigo-500' 
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                >
                  {hasPassed ? '✓' : index + 1}
                </div>
                
                {/* Content Card */}
                <div 
                  className={`flex-1 p-5 rounded-2xl border transition-all duration-500 shadow-sm
                    ${isActive 
                      ? 'bg-indigo-50 border-indigo-200 shadow-indigo-100/50 -translate-y-1' 
                      : 'bg-white border-slate-200'
                    }`}
                >
                  <h4 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                    isActive ? 'text-indigo-700' : 'text-slate-700'
                  }`}>
                    {event.title}
                  </h4>
                  <p className={`text-lg leading-relaxed transition-colors duration-300 ${
                    isActive ? 'text-indigo-600/90' : 'text-slate-500'
                  }`}>
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
