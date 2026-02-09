export type History<T> = {
  past: T[];
  future: T[];
  max: number;
};

export const createHistory = <T>(max = 30): History<T> => ({
  past: [],
  future: [],
  max,
});

export const pushHistory = <T>(history: History<T>, snapshot: T): History<T> => {
  const nextPast = [...history.past, snapshot];
  if (nextPast.length > history.max) {
    nextPast.shift();
  }
  return {
    ...history,
    past: nextPast,
    future: [],
  };
};

export const undoHistory = <T>(
  history: History<T>,
  current: T
): { history: History<T>; snapshot: T | null } => {
  if (history.past.length === 0) {
    return { history, snapshot: null };
  }
  const previous = history.past[history.past.length - 1];
  return {
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
    },
    snapshot: previous,
  };
};

export const redoHistory = <T>(
  history: History<T>,
  current: T
): { history: History<T>; snapshot: T | null } => {
  if (history.future.length === 0) {
    return { history, snapshot: null };
  }
  const next = history.future[0];
  return {
    history: {
      ...history,
      past: [...history.past, current],
      future: history.future.slice(1),
    },
    snapshot: next,
  };
};
