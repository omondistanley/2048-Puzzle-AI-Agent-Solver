import React, { createContext, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  id: string;
  icon: string;
  title: string;
  body?: string;
  removing?: boolean;
}

interface ToastContextValue {
  showToast: (icon: string, title: string, body?: string) => void;
}

const ToastCtx = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() { return useContext(ToastCtx); }

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback((icon: string, title: string, body?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-4), { id, icon, title, body }]);
    const timer = setTimeout(() => remove(id), 3500);
    timers.current.set(id, timer);
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-item${t.removing ? " removing" : ""}`}
            onClick={() => remove(t.id)}
            role="status"
          >
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{t.title}</div>
              {t.body && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
