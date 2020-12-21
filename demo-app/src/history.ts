import React from "react";
import { TimerState } from "./bluetooth";

interface HistoryAction {
  action: "push" | "delete" | "clear" | "initialize";
  epoch?: number;
  timerState?: TimerState;
  initialData?: Record<number, number>;
}

function reducer(
  state: Record<number, number>,
  action: HistoryAction
): Record<number, number> {
  switch (action.action) {
    case "push": {
      if (state[action.timerState!.epoch] === action.timerState!.duration)
        return state;
      const newState = { ...state };
      if (action.timerState!.duration !== 0) {
        newState[action.timerState!.epoch] = action.timerState!.duration;
      } else {
        delete newState[action.timerState!.epoch];
      }
      return newState;
    }
    case "delete": {
      const newState = { ...state };
      delete newState[action.epoch!];
      return newState;
    }
    case "clear":
      return {};
    case "initialize":
      return action.initialData!;
  }
}

interface HistoryData {
  orderedHistory: [number, number][];
  best?: number;
  avg5?: number;
  avg12?: number;
}

function getHistoryData(history: Record<number, number>): HistoryData {
  const orderedHistory = Object.entries(history)
    .map(([a, b]) => [parseInt(a), b])
    .sort((a, b) => b[0] - a[0]);

  const values = orderedHistory.map(([a, b]) => (b === -1 ? Infinity : b));
  const best =
    values.length > 0
      ? values.reduce((a, b) => Math.min(a, b), Infinity)
      : undefined;
  const avg5results = values.slice(0, 5).sort((a, b) => a - b);
  const avg5 =
    avg5results.length === 5
      ? avg5results.slice(1, 4).reduce((a, b) => a + b, 0) / 3
      : undefined;
  const avg12results = values.slice(0, 12).sort((a, b) => a - b);
  const avg12 =
    avg12results.length === 12
      ? avg12results.slice(1, 11).reduce((a, b) => a + b, 0) / 10
      : undefined;

  return {
    orderedHistory: orderedHistory as [number, number][],
    best: best === Infinity ? -1 : best,
    avg5: avg5 === Infinity ? -1 : avg5,
    avg12: avg12 === Infinity ? -1 : avg12,
  };
}

export function useHistory(
  timerState: TimerState
): [HistoryData, React.Dispatch<HistoryAction>] {
  const [history, dispatch] = React.useReducer(reducer, {});
  React.useEffect(() => {
    dispatch({ action: "push", timerState });
  }, [timerState]);

  const historyData = React.useMemo(() => getHistoryData(history), [history]);

  React.useEffect(() => {
    dispatch({
      action: "initialize",
      initialData: JSON.parse(window.localStorage.getItem("history") || "{}"),
    });
  }, []);

  React.useEffect(() => {
    console.log(history);
    window.localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  return [historyData, dispatch];
}
