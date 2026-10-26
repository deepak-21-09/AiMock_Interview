import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_WASM_PATH, MEDIAPIPE_BLAZEFACE_MODEL } from './config';

export interface FaceDetectionResult {
  faceCount: number;
  detections: Detection[];
  isLookingAway: boolean;
  confidence: number;
}

export class ClientFaceDetector {
  private detector: FaceDetector | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initError: string | null = null;
  private lastTimestamp = -1;

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

      try {
        // Try GPU delegate first for maximum performance
        this.detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_BLAZEFACE_MODEL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('GPU acceleration unavailable for FaceDetector, falling back to CPU:', gpuErr);
        this.detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_BLAZEFACE_MODEL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });
      }

      this.isInitialized = true;
      return true;
    } catch (err: any) {
      this.initError = err?.message || 'Failed to initialize MediaPipe Face Detector';
      console.error('ClientFaceDetector init failed:', this.initError);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): FaceDetectionResult {
    if (!this.detector || !this.isInitialized) {
      return { faceCount: -1, detections: [], isLookingAway: false, confidence: 0 };
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.paused || video.ended) {
      return { faceCount: -1, detections: [], isLookingAway: false, confidence: 0 };
    }

    // MediaPipe requires strictly increasing timestamps
    const safeTimestamp = timestampMs <= this.lastTimestamp ? this.lastTimestamp + 1 : timestampMs;
    this.lastTimestamp = safeTimestamp;

    try {
      const result = this.detector.detectForVideo(video, safeTimestamp);
      const detections = result.detections || [];
      const faceCount = detections.length;

      let isLookingAway = false;
      let maxConfidence = 0;

      if (faceCount === 1) {
        const face = detections[0];
        const score = face.categories?.[0]?.score ?? 0.8;
        maxConfidence = score;

        // Head pose yaw orientation heuristic using 6 keypoints
        // Keypoints: 0=right eye, 1=left eye, 2=nose tip, 3=mouth, 4=right ear, 5=left ear
        const keypoints = face.keypoints || [];
        if (keypoints.length >= 3) {
          const rightEye = keypoints[0];
          const leftEye = keypoints[1];
          const nose = keypoints[2];

          if (rightEye && leftEye && nose) {
            const eyeDistance = Math.abs(leftEye.x - rightEye.x);
            if (eyeDistance > 0.02) {
              const eyeMidpointX = (rightEye.x + leftEye.x) / 2;
              // Yaw offset: displacement of nose from eye center normalized by eye distance
              const yawOffset = (nose.x - eyeMidpointX) / eyeDistance;
              if (Math.abs(yawOffset) > 0.48) {
                isLookingAway = true;
              }
            }
          }
        }
      } else if (faceCount > 1) {
        maxConfidence = Math.max(...detections.map(d => d.categories?.[0]?.score ?? 0.7));
      }

      return {
        faceCount,
        detections,
        isLookingAway,
        confidence: maxConfidence,
      };
    } catch (err) {
      console.warn('Face detection inference error:', err);
      return { faceCount: -1, detections: [], isLookingAway: false, confidence: 0 };
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.detector !== null;
  }

  getError(): string | null {
    return this.initError;
  }

  close(): void {
    if (this.detector) {
      try {
        this.detector.close();
      } catch (err) {
        console.warn('Error closing FaceDetector:', err);
      }
      this.detector = null;
    }
    this.isInitialized = false;
    this.lastTimestamp = -1;
  }
}
