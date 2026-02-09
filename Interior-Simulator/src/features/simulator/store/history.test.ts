import { describe, it, expect } from "vitest";
import { createHistory, pushHistory, undoHistory, redoHistory } from "./history";

describe("history utilities", () => {
  describe("createHistory", () => {
    it("should create empty history with default max", () => {
      const history = createHistory();
      expect(history.past).toEqual([]);
      expect(history.future).toEqual([]);
      expect(history.max).toBe(30);
    });

    it("should create empty history with custom max", () => {
      const history = createHistory(50);
      expect(history.max).toBe(50);
    });
  });

  describe("pushHistory", () => {
    it("should add snapshot to past", () => {
      let history = createHistory<number>();
      history = pushHistory(history, 1);
      expect(history.past).toEqual([1]);
      expect(history.future).toEqual([]);
    });

    it("should clear future on push", () => {
      let history = createHistory<number>();
      history = pushHistory(history, 1);
      history = pushHistory(history, 2);
      history = undoHistory(history, 2).history;
      expect(history.future).toHaveLength(1);
      history = pushHistory(history, 3);
      expect(history.future).toEqual([]);
    });

    it("should limit past to max length", () => {
      let history = createHistory<number>(3);
      history = pushHistory(history, 1);
      history = pushHistory(history, 2);
      history = pushHistory(history, 3);
      history = pushHistory(history, 4);
      expect(history.past).toEqual([2, 3, 4]);
    });
  });

  describe("undoHistory", () => {
    it("should move current to future and return previous", () => {
      let history = createHistory<number>();
      history = pushHistory(history, 1);
      history = pushHistory(history, 2);
      const result = undoHistory(history, 3);
      expect(result.snapshot).toBe(2);
      expect(result.history.past).toEqual([1]);
      expect(result.history.future).toEqual([3]);
    });

    it("should return null if past is empty", () => {
      const history = createHistory<number>();
      const result = undoHistory(history, 1);
      expect(result.snapshot).toBeNull();
      expect(result.history.past).toEqual([]);
    });
  });

  describe("redoHistory", () => {
    it("should move from future to past", () => {
      let history = createHistory<number>();
      history = pushHistory(history, 1);
      history = pushHistory(history, 2);
      history = undoHistory(history, 3).history;
      const result = redoHistory(history, 2);
      expect(result.snapshot).toBe(3);
      expect(result.history.past).toEqual([1, 2]);
      expect(result.history.future).toEqual([]);
    });

    it("should return null if future is empty", () => {
      const history = createHistory<number>();
      const result = redoHistory(history, 1);
      expect(result.snapshot).toBeNull();
      expect(result.history.future).toEqual([]);
    });
  });
});
