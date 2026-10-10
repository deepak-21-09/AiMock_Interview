import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  Camera, CameraOff, Mic, MicOff, ShieldCheck,
  CheckCircle2, AlertTriangle, ArrowRight, Volume2
} from 'lucide-react';

export const DeviceCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [hasCameraConsent, setHasCameraConsent] = useState(true);
  const [hasMicConsent, setHasMicConsent] = useState(true);
  const [acknowledgedRetention, setAcknowledgedRetention] = useState(true);
  
  const [deviceCheckStarted, setDeviceCheckStarted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<'video_voice' | 'audio_only' | 'text_only'>('video_voice');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startDeviceCheck = async () => {
    setErrorMsg('');
    try {
      setDeviceCheckStarted(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === 'video_voice',
        audio: mode !== 'text_only'
      });
      streamRef.current = stream;

      if (videoRef.current && mode === 'video_voice') {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }

      if (mode !== 'text_only') {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          setMicActive(true);
          setupAudioAnalyser(stream);
        }
      }
    } catch (err: any) {
      setErrorMsg('Could not access requested media devices. You can switch to Audio-Only or Text-Only mode below.');
    }
  };

  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {
      console.error('Audio meter init error:', e);
    }
  };

  const stopStreams = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  useEffect(() => {
    return () => {
      stopStreams();
    };
  }, []);

  const handleStartInterview = async () => {
    if (!sessionId) {
      setErrorMsg('Invalid session identifier.');
      return;
    }
    stopStreams();
    try {
      await api.startInterview(sessionId, {
        camera_consent: hasCameraConsent,
        mic_consent: hasMicConsent,
        data_retention_acknowledged: acknowledgedRetention
      });
      navigate(`/room/${sessionId}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start interview.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Device Check & Privacy Consent</h1>
        <p className="text-slate-400 text-sm mt-1">
          Verify your camera and microphone preview before entering the live interview room.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mode Selector */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base">Select Interaction Mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'video_voice', label: 'Video & Voice (Standard)', desc: 'Webcam preview + microphone answer recording.' },
            { id: 'audio_only', label: 'Audio Only', desc: 'Microphone answer recording without video preview.' },
            { id: 'text_only', label: 'Text Only Fallback', desc: 'Read questions and type answers directly.' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                stopStreams();
                setDeviceCheckStarted(false);
                setCameraActive(false);
                setMicActive(false);
                setMode(m.id as any);
              }}
              className={`p-4 rounded-2xl border text-left transition ${
                mode === m.id
                  ? 'bg-blue-600/10 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="font-semibold text-xs block text-white">{m.label}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Camera Preview */}
        <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
          {mode === 'video_voice' ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="text-center p-4">
                  <Camera className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Camera preview inactive</p>
                </div>
              )}
              {cameraActive && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur text-[10px] text-emerald-400 font-semibold border border-emerald-500/30">
                  LIVE PREVIEW (NOT RECORDING)
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-4">
              <CameraOff className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Video disabled for this mode</p>
            </div>
          )}
        </div>

        {/* Audio Meter & Status */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-blue-400" /> Microphone Input Level
              </span>
              <span className="text-slate-400">{micActive ? `${audioLevel}%` : 'Off'}</span>
            </div>
            {/* Visualizer Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 transition-all duration-75"
                style={{ width: `${micActive ? audioLevel : 0}%` }}
              />
            </div>
          </div>

          {!deviceCheckStarted && mode !== 'text_only' ? (
            <button
              onClick={startDeviceCheck}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Test Camera & Microphone
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Ready for Interview
              </div>
              <p className="text-[11px] text-slate-400">
                Speak into your mic to confirm the meter moves above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Consent Checkboxes */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-blue-400" /> Privacy & Consent Confirmation
        </h4>
        <div className="space-y-2 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMicConsent}
              onChange={(e) => setHasMicConsent(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600"
            />
            <span>I consent to microphone audio capture strictly for real-time speech-to-text and AI evaluation.</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgedRetention}
              onChange={(e) => setAcknowledgedRetention(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600"
            />
            <span>I acknowledge that mock interview reports and practice recordings can be permanently deleted at any time from my History page.</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleStartInterview}
        disabled={!hasMicConsent || !acknowledgedRetention}
        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        Enter Interview Room <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};
