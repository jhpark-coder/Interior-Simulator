/// <reference lib="webworker" />

import {
  analyzeFloorPlanPixels,
  type DetectionImage,
  type DetectionOptions,
} from "./detectionAlgorithm";

type WorkerRequest = {
  id: string;
  image: DetectionImage;
  options: DetectionOptions;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, image, options } = event.data;
  try {
    const result = analyzeFloorPlanPixels(image, options);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "평면도 분석에 실패했습니다.",
    });
  }
};

export {};
