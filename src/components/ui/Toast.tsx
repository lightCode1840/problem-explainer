import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX, Info } from 'lucide-react';

export interface ToastMessage {
  title: string;
  desc: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  message: ToastMessage | null;
  onClose: () => void;
}

const typeConfig = {
  success: {
    icon: CircleCheck,
    ring: 'ring-1 ring-emerald-200 dark:ring-emerald-800',
    bg: 'bg-white dark:bg-zinc-900',
  },
  error: {
    icon: CircleX,
    ring: 'ring-1 ring-red-200 dark:ring-red-800',
    bg: 'bg-white dark:bg-zinc-900',
  },
  info: {
    icon: Info,
    ring: 'ring-1 ring-gray-200 dark:ring-zinc-700',
    bg: 'bg-white dark:bg-zinc-900',
  },
};

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [message]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(handleClose, 4000);
    return () => clearTimeout(timer);
  }, [message, handleClose]);

  if (!message || typeof document === 'undefined') return null;

  const Icon = typeConfig[message.type].icon;

  return createPortal(
    <div className="fixed top-20 right-4 z-[99999] pointer-events-none">
      <div
        onClick={handleClose}
        className={`pointer-events-auto flex items-start gap-3 w-80 px-4 py-3
          rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30
          ${typeConfig[message.type].bg} ${typeConfig[message.type].ring}
          transition-all duration-200 ease-out cursor-pointer
          ${visible
            ? 'translate-x-0 opacity-100'
            : 'translate-x-2 opacity-0'
          }`}
      >
        <Icon
          className={`shrink-0 mt-0.5 w-5 h-5 ${
            message.type === 'success' ? 'text-emerald-500' :
            message.type === 'error' ? 'text-red-500' :
            'text-cyan-500'
          }`}
          strokeWidth={2}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {message.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            {message.desc}
          </p>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              message.type === 'success' ? 'bg-emerald-400' :
              message.type === 'error' ? 'bg-red-400' :
              'bg-cyan-400'
            }`}
            style={{
              animation: 'toast-progress 4s linear',
              transformOrigin: 'left',
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const useToast = () => {
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = (title: string, desc: string, type: ToastMessage['type'] = 'info') => {
    setToastMessage({ title, desc, type });
  };

  return { toastMessage, showToast, setToastMessage };
};
