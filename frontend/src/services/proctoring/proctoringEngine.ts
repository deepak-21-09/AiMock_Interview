import { DEFAULT_PROCTORING_CONFIG } from './config';
import { ClientFaceDetector } from './faceDetector';
import { ProctoringConfig, ProctoringEvent } from '../../types';
import { api } from '../api';

export type ProctoringStateStatus = 'initializing' | 'monitoring' | 'warning' | 'paused' | 'terminated' | 'error';

export interface ProctoringState {
  status: ProctoringStateStatus;
  faceCount: number;
  activeWarningType: string | null;
  activeWarningMessage: string | null;
  graceSecondsRemaining: number | null;
  tabSwitchCount: number;
  isTerminated: boolean;
  terminationReason: string | null;
  detectorReady: boolean;
  errorMessage: string | null;
}

export type ProctoringStateListener = (state: ProctoringState) => void;

export class ProctoringEngine {
  private config: ProctoringConfig;
  private detector: ClientFaceDetector;
  private sessionId: string;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  // Running state
  private intervalId: number | null = null;
  private isRunning = false;
  private isTerminated = false;
  private stateListeners: Set<ProctoringStateListener> = new Set();

  // Detection tracking accumulators
  private consecutiveMultipleFacesMs = 0;
  private consecutiveAbsentMs = 0;
  private consecutiveLookingAwayMs = 0;
  private cameraInterruptedMs = 0;
  private tabSwitchCount = 0;

  // Grace countdown tracking
  private activeGraceTimer: {
    type: 'multiple_faces' | 'face_absent' | 'camera_interrupted';
    totalSeconds: number;
    remainingSeconds: number;
    explanation: string;
  } | null = null;

  // Warning deduplication
  private lastLoggedEvents: Map<string, number> = new Map();
  private lastInferenceTime = 0;

  // Current published state
  private currentState: ProctoringState = {
    status: 'initializing',
    faceCount: 1,
    activeWarningType: null,
    activeWarningMessage: null,
    graceSecondsRemaining: null,
    tabSwitchCount: 0,
    isTerminated: false,
    terminationReason: null,
    detectorReady: false,
    errorMessage: null,
  };

  constructor(sessionId: string, customConfig?: Partial<ProctoringConfig>) {
    this.sessionId = sessionId;
    this.config = { ...DEFAULT_PROCTORING_CONFIG, ...customConfig };
    this.detector = new ClientFaceDetector();
  }

  subscribe(listener: ProctoringStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.currentState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private updateState(partial: Partial<ProctoringState>): void {
    this.currentState = { ...this.currentState, ...partial };
    this.stateListeners.forEach((fn) => fn(this.currentState));
  }

  async start(video: HTMLVideoElement, stream: MediaStream): Promise<boolean> {
    if (this.isRunning) return true;
    this.videoElement = video;
    this.stream = stream;
    this.isTerminated = false;

    this.updateState({ status: 'initializing', detectorReady: false });

    // Initialize MediaPipe Vision Face Detector
    const ready = await this.detector.init();
    if (!ready) {
      const err = this.detector.getError() || 'Face detector could not be loaded.';
      console.warn('Proctoring running in degraded mode:', err);
      this.updateState({
        status: 'monitoring',
        detectorReady: false,
        errorMessage: 'Client-side proctoring detector initialized with basic activity monitoring.',
      });
    } else {
      this.updateState({ status: 'monitoring', detectorReady: true, errorMessage: null });
    }

    // Attach visibility listener for tab-switching detection
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);

    // Attach stream track event listeners
    this.attachTrackListeners();

    // Start periodic sampling loop
    this.isRunning = true;
    this.lastInferenceTime = performance.now();
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, this.config.samplingIntervalMs);

    return true;
  }

  private attachTrackListeners(): void {
    if (!this.stream) return;
    const videoTracks = this.stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('ended', this.handleTrackEnded);
      track.addEventListener('mute', this.handleTrackMute);
      track.addEventListener('unmute', this.handleTrackUnmute);
    });
  }

  private handleTrackEnded = (): void => {
    this.onCameraInterrupted('Webcam video track ended unexpectedly.');
  };

  private handleTrackMute = (): void => {
    this.onCameraInterrupted('Webcam feed muted or stopped.');
  };

  private handleTrackUnmute = (): void => {
    this.cameraInterruptedMs = 0;
    if (this.activeGraceTimer?.type === 'camera_interrupted') {
      this.clearWarning();
    }
  };

  private handleVisibilityChange = (): void => {
    if (this.isTerminated || !this.isRunning) return;

    if (document.hidden) {
      this.tabSwitchCount += 1;
      const switchesRemaining = Math.max(0, this.config.maxTabSwitches - this.tabSwitchCount);

      if (this.tabSwitchCount >= this.config.maxTabSwitches) {
        this.terminate(
          'tab_switches_exceeded',
          `Maximum allowed window switches (${this.config.maxTabSwitches}) exceeded during active interview.`
        );
      } else {
        const msg = `Tab switch detected (${this.tabSwitchCount}/${this.config.maxTabSwitches}). Please keep the interview window active. Further switches will halt the session.`;
        this.triggerWarning('tab_switch', msg, null);
        this.logEventAsync({
          event_type: 'tab_switch',
          timestamp: new Date().toISOString(),
          severity: 'warning',
          action_taken: 'warning_displayed',
          explanation: msg,
          duration_seconds: 1.0,
        });
      }

      this.updateState({ tabSwitchCount: this.tabSwitchCount });
    }
  };

  private handleWindowBlur = (): void => {
    // Supplementary soft check
    if (this.isTerminated || !this.isRunning) return;
  };

  private tick(): void {
    if (!this.isRunning || this.isTerminated) return;

    const now = performance.now();
    const dt = now - this.lastInferenceTime;
    this.lastInferenceTime = now;

    // 1. Camera track health verification
    const videoTrack = this.stream?.getVideoTracks()[0];
    const isTrackAlive = videoTrack && videoTrack.readyState === 'live' && videoTrack.enabled;
    if (!isTrackAlive) {
      this.cameraInterruptedMs += dt;
      this.onCameraInterrupted('Webcam feed unavailable or permission lost.');
      return;
    } else if (this.cameraInterruptedMs > 0 && this.activeGraceTimer?.type === 'camera_interrupted') {
      this.cameraInterruptedMs = 0;
      this.clearWarning();
    }

    // 2. Client Face Detection inference
    if (!this.detector.isReady() || !this.videoElement) {
      return;
    }

    const res = this.detector.detect(this.videoElement, now);
    if (res.faceCount < 0) {
      // Frame skipped / video not playing yet
      return;
    }

    this.updateState({ faceCount: res.faceCount });

    // -----------------------------------------------------------------
    // Rule A: Multiple people detected (>1 face)
    // -----------------------------------------------------------------
    if (res.faceCount > 1) {
      this.consecutiveMultipleFacesMs += dt;
      this.consecutiveAbsentMs = 0;
      this.consecutiveLookingAwayMs = 0;

      const warnMs = this.config.multipleFacesWarningSeconds * 1000;
      if (this.consecutiveMultipleFacesMs >= warnMs) {
        const graceTotal = this.config.multipleFacesHaltGraceSeconds;
        const graceElapsed = (this.consecutiveMultipleFacesMs - warnMs) / 1000;
        const graceRemaining = Math.max(0, Math.ceil(graceTotal - graceElapsed));

        const msg = `Multiple people detected in frame. Please ensure you are the only person visible. Session will halt in ${graceRemaining}s.`;
        this.triggerWarning('multiple_faces', msg, graceRemaining);

        if (graceElapsed >= graceTotal) {
          this.terminate(
            'multiple_faces',
            'Multiple people detected in camera frame continuously past grace period.'
          );
          return;
        }
      }
    } else {
      // Cleared multiple faces
      if (this.consecutiveMultipleFacesMs > 0) {
        if (this.activeGraceTimer?.type === 'multiple_faces') {
          this.clearWarning();
        }
        this.consecutiveMultipleFacesMs = 0;
      }
    }

    // -----------------------------------------------------------------
    // Rule B: Candidate absent from frame (0 faces)
    // -----------------------------------------------------------------
    if (res.faceCount === 0) {
      this.consecutiveAbsentMs += dt;
      this.consecutiveMultipleFacesMs = 0;
      this.consecutiveLookingAwayMs = 0;

      const warnMs = this.config.faceAbsentWarningSeconds * 1000;
      if (this.consecutiveAbsentMs >= warnMs) {
        const graceTotal = this.config.faceAbsentHaltGraceSeconds;
        const graceElapsed = (this.consecutiveAbsentMs - warnMs) / 1000;
        const graceRemaining = Math.max(0, Math.ceil(graceTotal - graceElapsed));

        const msg = `Candidate absent from frame. Please stay positioned clearly before your camera. Session will halt in ${graceRemaining}s.`;
        this.triggerWarning('face_absent', msg, graceRemaining);

        if (graceElapsed >= graceTotal) {
          this.terminate(
            'face_absent_timeout',
            'Candidate absent from camera frame continuously past grace period.'
          );
          return;
        }
      }
    } else {
      // Candidate returned
      if (this.consecutiveAbsentMs > 0) {
        if (this.activeGraceTimer?.type === 'face_absent') {
          this.clearWarning();
        }
        this.consecutiveAbsentMs = 0;
      }
    }

    // -----------------------------------------------------------------
    // Rule C: Repeated / prolonged looking away
    // -----------------------------------------------------------------
    if (res.faceCount === 1) {
      if (res.isLookingAway) {
        this.consecutiveLookingAwayMs += dt;
        const warnMs = this.config.lookingAwayWarningSeconds * 1000;
        if (this.consecutiveLookingAwayMs >= warnMs) {
          const msg = 'Please maintain focus toward your camera and screen during interview responses.';
          this.triggerWarning('looking_away', msg, null);

          // Log warning periodically with 10s cooldown
          this.throttleLogEvent({
            event_type: 'looking_away',
            timestamp: new Date().toISOString(),
            confidence_score: res.confidence,
            severity: 'warning',
            action_taken: 'warning_displayed',
            explanation: 'Continuous looking away detected for > 5 seconds.',
            duration_seconds: 5.0,
          }, 10000);
        }
      } else {
        if (this.consecutiveLookingAwayMs > 0) {
          if (this.currentState.activeWarningType === 'looking_away') {
            this.clearWarning();
          }
          this.consecutiveLookingAwayMs = 0;
        }
      }
    }
  }

  private onCameraInterrupted(reason: string): void {
    if (this.isTerminated) return;

    const graceTotal = this.config.cameraRecoveryGraceSeconds;
    const graceElapsed = this.cameraInterruptedMs / 1000;
    const graceRemaining = Math.max(0, Math.ceil(graceTotal - graceElapsed));

    const msg = `Camera connection interrupted. Please restore your camera. Session will halt in ${graceRemaining}s.`;
    this.triggerWarning('camera_interruption', msg, graceRemaining);
    this.updateState({ status: 'paused' });

    if (graceElapsed >= graceTotal) {
      this.terminate('camera_unrecovered', 'Camera stream interrupted and could not be recovered in time.');
    }
  }

  private triggerWarning(type: any, message: string, graceSeconds: number | null): void {
    this.activeGraceTimer = graceSeconds !== null ? {
      type,
      totalSeconds: graceSeconds,
      remainingSeconds: graceSeconds,
      explanation: message,
    } : null;

    this.updateState({
      status: 'warning',
      activeWarningType: type,
      activeWarningMessage: message,
      graceSecondsRemaining: graceSeconds,
    });
  }

  private clearWarning(): void {
    this.activeGraceTimer = null;
    this.updateState({
      status: 'monitoring',
      activeWarningType: null,
      activeWarningMessage: null,
      graceSecondsRemaining: null,
    });
  }

  private throttleLogEvent(event: Partial<ProctoringEvent>, cooldownMs: number): void {
    const key = event.event_type || 'generic';
    const now = Date.now();
    const last = this.lastLoggedEvents.get(key) || 0;
    if (now - last > cooldownMs) {
      this.lastLoggedEvents.set(key, now);
      this.logEventAsync(event);
    }
  }

  private async logEventAsync(event: Partial<ProctoringEvent>): Promise<void> {
    try {
      await api.logProctoringEvent(this.sessionId, event as ProctoringEvent);
    } catch (err) {
      console.warn('Failed to log proctoring event to backend:', err);
    }
  }

  async terminate(violationType: string, explanation: string): Promise<void> {
    if (this.isTerminated) return;
    this.isTerminated = true;
    this.isRunning = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.updateState({
      status: 'terminated',
      isTerminated: true,
      terminationReason: explanation,
      activeWarningType: violationType,
      activeWarningMessage: explanation,
      graceSecondsRemaining: null,
    });

    try {
      await api.terminateInterviewProctoring(this.sessionId, {
        violation_type: violationType,
        explanation,
        duration_seconds: 5.0,
      });
    } catch (err) {
      console.error('Failed to notify backend of proctoring termination:', err);
    }
  }

  stop(): void {
    this.isRunning = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);

    if (this.stream) {
      const tracks = this.stream.getVideoTracks();
      tracks.forEach((t) => {
        t.removeEventListener('ended', this.handleTrackEnded);
        t.removeEventListener('mute', this.handleTrackMute);
        t.removeEventListener('unmute', this.handleTrackUnmute);
      });
    }

    this.detector.close();
  }
}
