import { ProctoringConfig } from '../../types';

export const DEFAULT_PROCTORING_CONFIG: ProctoringConfig = {
  // Multiple people rules
  multipleFacesWarningSeconds: 2.0,      // Caution banner after 2s of >1 face
  multipleFacesHaltGraceSeconds: 3.0,     // Grace period after warning before termination (total 5s)

  // Absence rules
  faceAbsentWarningSeconds: 5.0,         // Caution banner after 5s of 0 faces
  faceAbsentHaltGraceSeconds: 10.0,       // Grace period before halting (total 15s)

  // Looking away / Head pose rules
  lookingAwayWarningSeconds: 5.0,        // Caution banner after 5s of continuous looking away
  lookingAwayYawThreshold: 0.35,         // Normalized nose-to-ear ratio deviation indicating yaw/turn

  // Camera interruption rules
  cameraRecoveryGraceSeconds: 15.0,      // Grace period if webcam track ends/disabled

  // Browser activity rules
  maxTabSwitches: 3,                     // Max permitted tab switches before terminal halt

  // Sampling rate
  samplingIntervalMs: 400,               // Run inference ~2.5 frames per second for lightweight CPU load
};

export const MEDIAPIPE_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
export const MEDIAPIPE_BLAZEFACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
