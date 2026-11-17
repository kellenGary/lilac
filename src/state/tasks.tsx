import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { todayKey } from '@/lib/dates';
import { indexMarks, markKey, type Task, type TaskMark } from '@/lib/tasks';
import { api } from '@/services/api';
import { useAuth } from './auth';

type Status = 'loading' | 'ready' | 'error';
type Data = { tasks: Task[]; marks: TaskMark[] };

type TasksContextValue = {
  status: Status;
  tasks: Task[];
  marks: TaskMark[];
  /** Lookup for "was this done on this day, and how did it feel". */
  markMap: Map<string, TaskMark>;
  reload: () => void;
  add: (title: string, kind: 'daily' | 'once', theme: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Ticks or unticks a day. Shows the change at once and puts it back if saving fails. */
  toggle: (taskId: string, day: string) => Promise<void>;
  /** Records how a ticked item felt, 1 (rough) to 5 (great), or null to clear it. */
  setMood: (taskId: string, day: string, mood: number | null) => Promise<void>;
  startExperiment: (taskId: string) => Promise<void>;
  stopExperiment: (taskId: string) => Promise<void>;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [attempt, setAttempt] = useState(0);
  const loadKey = userId ? `${userId}:${attempt}` : null;
  // Tagged with who and which attempt it was loaded for, so a different user never sees someone else's list.
  const [result, setResult] = useState<({ key: string; error: boolean } & Data) | null>(null);

  useEffect(() => {
    if (!loadKey) return;
    let cancelled = false;
    api
      .listTasks()
      .then((d) => !cancelled && setResult({ key: loadKey, ...d, error: false }))
      .catch(() => !cancelled && setResult({ key: loadKey, tasks: [], marks: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const current = result && result.key === loadKey ? result : null;
  const tasks = useMemo(() => current?.tasks ?? [], [current]);
  const marks = useMemo(() => current?.marks ?? [], [current]);
  const markMap = useMemo(() => indexMarks(marks), [marks]);
  const status: Status = !current ? 'loading' : current.error ? 'error' : 'ready';

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const patch = useCallback(
    (fn: (d: Data) => Data) => setResult((r) => (r && r.key === loadKey ? { ...r, ...fn({ tasks: r.tasks, marks: r.marks }) } : r)),
    [loadKey],
  );

  const add = useCallback(
    async (title: string, kind: 'daily' | 'once', theme: string | null) => {
      const made = await api.createTask(title, kind, theme, todayKey());
      patch((d) => ({ ...d, tasks: [...d.tasks, made] }));
    },
    [patch],
  );
  const remove = useCallback(
    async (id: string) => {
      await api.deleteTask(id);
      patch((d) => ({ tasks: d.tasks.filter((t) => t.id !== id), marks: d.marks.filter((m) => m.taskId !== id) }));
    },
    [patch],
  );

  const toggle = useCallback(
    async (taskId: string, day: string) => {
      const done = markMap.has(markKey(taskId, day));
      patch((d) => ({
        ...d,
        marks: done
          ? d.marks.filter((m) => !(m.taskId === taskId && m.day === day))
          : [...d.marks, { taskId, day, mood: null }],
      }));
      try {
        if (done) await api.untickTask(taskId, day);
        else await api.tickTask(taskId, day, todayKey());
      } catch (e) {
        reload(); // put back what the server really has
        throw e;
      }
    },
    [markMap, patch, reload],
  );

  const setMood = useCallback(
    async (taskId: string, day: string, mood: number | null) => {
      patch((d) => ({ ...d, marks: d.marks.map((m) => (m.taskId === taskId && m.day === day ? { ...m, mood } : m)) }));
      try {
        await api.tickTask(taskId, day, todayKey(), mood);
      } catch (e) {
        reload();
        throw e;
      }
    },
    [patch, reload],
  );

  const startExperiment = useCallback(
    async (taskId: string) => {
      await api.startExperiment(taskId, todayKey());
      reload();
    },
    [reload],
  );
  const stopExperiment = useCallback(
    async (taskId: string) => {
      await api.stopExperiment(taskId);
      reload();
    },
    [reload],
  );

  const value = useMemo(
    () => ({ status, tasks, marks, markMap, reload, add, remove, toggle, setMood, startExperiment, stopExperiment }),
    [status, tasks, marks, markMap, reload, add, remove, toggle, setMood, startExperiment, stopExperiment],
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
