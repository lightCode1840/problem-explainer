import { useState } from 'react';
import { createPortal } from 'react-dom';

export interface ToastMessage {
  title: string;
  desc: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  message: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className={`relative flex flex-col items-center justify-center gap-4 p-8 min-w-[320px] max-w-sm rounded-[2rem] border pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ${
        message.type === 'success' ? 'bg-white dark:bg-zinc-900 border-emerald-100 dark:border-emerald-900/40' :
        message.type === 'error'   ? 'bg-white dark:bg-zinc-900 border-red-100 dark:border-red-900/40' :
                                     'bg-white dark:bg-zinc-900 border-blue-100 dark:border-blue-900/40'
      }`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
          message.type === 'error'   ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                       'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          {message.type === 'success' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {message.type === 'error' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {message.type === 'info' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="text-center">
          <h4 className={`text-xl font-bold ${
            message.type === 'success' ? 'text-emerald-900 dark:text-emerald-300' :
            message.type === 'error'   ? 'text-red-900 dark:text-red-300' :
                                         'text-blue-900 dark:text-blue-300'
          }`}>{message.title}</h4>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-2 whitespace-pre-line leading-relaxed">
            {message.desc}
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full p-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export const useToast = () => {
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = (title: string, desc: string, type: ToastMessage['type'] = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  return { toastMessage, showToast, setToastMessage };
};
