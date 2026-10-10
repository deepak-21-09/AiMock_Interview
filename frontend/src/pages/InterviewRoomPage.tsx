import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { QuestionDetail, TurnActionResponse } from '../types';
import {
  Mic, MicOff, Camera, CameraOff, Volume2,
  RotateCcw, HelpCircle, SkipForward, Send,
  StopCircle, Radio, Clock, Bot, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';

export const InterviewRoomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Interview state
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDetail | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [interviewerMessage, setInterviewerMessage] = useState<string>('');
  const [notification, setNotification] = useState<string>('');

  // Media & Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [showTextFallback, setShowTextFallback] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Fetch initial session state
  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const data = await api.getInterviewDetail(sessionId);
      setSessionDetail(data);
      setCurrentDifficulty(data.current_difficulty);
      if (data.current_question) {
        setCurrentQuestion(data.current_question);
        speakQuestion(data.current_question.question_text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    initWebcam();

    return () => {
      stopWebcam();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sessionId]);

  // Webcam initialization
  const initWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Webcam permission not granted or available in this context:', e);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks[0].enabled = nextState;
        setCameraEnabled(nextState);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks[0].enabled = nextState;
        setMicEnabled(nextState);
      }
    }
  };

  // Text-To-Speech for Question Playback
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Recording Controls
  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setTimerSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      setShowTextFallback(true);
    }
  };

  const stopRecordingAndGetBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve('');
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    });
  };

  // Handle Turn Submission
  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion) return;
    setSubmitting(true);
    setNotification('Transcribing and evaluating candidate response...');

    let base64Audio = '';
    if (isRecording) {
      base64Audio = await stopRecordingAndGetBase64();
    }

    try {
      const res: TurnActionResponse = await api.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        audio_base64: base64Audio || undefined,
        text_answer: typedAnswer || undefined,
        duration_seconds: timerSeconds,
      });

      handleTurnAction(res);
    } catch (err: any) {
      setNotification(err.response?.data?.detail || 'Error processing response.');
    } finally {
      setSubmitting(false);
      setTypedAnswer('');
      setTimerSeconds(0);
    }
  };

  const handleTurnAction = (res: TurnActionResponse) => {
    setCurrentDifficulty(res.current_difficulty);

    if (res.is_concluded) {
      navigate(`/reports/${sessionId}`);
      return;
    }

    if (res.action === 'repeat_prompt_unreliable') {
      setInterviewerMessage(res.message);
      setNotification('Audio unclear. Please repeat your answer or type it.');
      speakQuestion(res.message);
      return;
    }

    if (res.action === 'follow_up' && res.next_question) {
      setCurrentQuestion(res.next_question);
      setInterviewerMessage(res.message);
      setNotification('Targeted follow-up question requested by interviewer.');
      speakQuestion(res.message);
      return;
    }

    if (res.action === 'next_question' && res.next_question) {
      setCurrentQuestion(res.next_question);
      setInterviewerMessage(res.message);
      setNotification(`Advanced to Question #${res.next_question.order_index} (Difficulty Level ${res.current_difficulty})`);
      speakQuestion(res.next_question.question_text);
      return;
    }
  };

  const handleRepeat = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await api.repeatQuestion(sessionId);
      setInterviewerMessage(res.message);
      if (res.next_question) {
        speakQuestion(res.next_question.question_text);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarify = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await api.clarifyQuestion(sessionId);
      setInterviewerMessage(res.message);
      speakQuestion(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await api.skipQuestion(sessionId);
      handleTurnAction(res);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    if (window.confirm('Are you sure you want to conclude the interview and view your evaluation report?')) {
      setSubmitting(true);
      try {
        const res = await api.endInterview(sessionId);
        navigate(`/reports/${sessionId}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-400 text-sm">
        <Bot className="h-10 w-10 text-blue-500 animate-pulse mb-3" />
        Connecting to AI Interview Orchestrator...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Live Interview Session</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
            {sessionDetail?.target_role}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Difficulty Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <span>Adaptive Difficulty:</span>
            <span className="text-white font-bold">Level {currentDifficulty} / 5</span>
          </div>

          <button
            onClick={handleEndInterview}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main Grid: Video Feeds & Question */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interviewer AI & Candidate Video (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* AI Interviewer Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
              <Bot className="h-9 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">AI Interviewer</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Voice-Interaction & Evaluation Agent</p>
            </div>
          </div>

          {/* Candidate Webcam Feed */}
          <div className="relative aspect-video rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraEnabled ? 'block' : 'hidden'}`}
            />
            {!cameraEnabled && (
              <div className="text-center p-4">
                <CameraOff className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400">Camera preview paused</span>
              </div>
            )}

            {/* In-feed status indicators */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {isRecording ? (
                <div className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                  <Radio className="h-3.5 w-3.5" /> ANSWER RECORDING
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-slate-300 text-[10px] font-semibold border border-slate-700">
                  READY
                </div>
              )}
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-3 p-2 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-700/50">
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-xl transition ${
                  cameraEnabled ? 'bg-slate-800 text-white' : 'bg-rose-500/20 text-rose-400'
                }`}
                title="Toggle Camera"
              >
                {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleMic}
                className={`p-2 rounded-xl transition ${
                  micEnabled ? 'bg-slate-800 text-white' : 'bg-rose-500/20 text-rose-400'
                }`}
                title="Toggle Mic"
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Question & Answer Interaction Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            {/* Round & Number Header */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                {currentQuestion?.round_type || 'TECHNICAL'} ROUND
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Question {currentQuestion?.order_index} of {sessionDetail?.total_planned_questions}
              </span>
            </div>

            {/* Question Text */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentQuestion?.question_text}
              </h2>
              {currentQuestion?.competency_focus && (
                <span className="text-xs text-slate-400 mt-2 block">
                  Focus: <span className="text-slate-300 font-medium">{currentQuestion.competency_focus}</span>
                </span>
              )}
            </div>

            {/* Interviewer Message / Clarification Note */}
            {interviewerMessage && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed space-y-1">
                <span className="font-semibold text-white block">Interviewer Note:</span>
                <p>{interviewerMessage}</p>
              </div>
            )}

            {/* Question Audio Playback Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => currentQuestion && speakQuestion(currentQuestion.question_text)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Volume2 className="h-4 w-4 text-blue-400" /> Read Aloud
              </button>
              <button
                onClick={handleRepeat}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4 text-slate-400" /> Repeat
              </button>
              <button
                onClick={handleClarify}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <HelpCircle className="h-4 w-4 text-slate-400" /> Clarify
              </button>
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition ml-auto disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4 text-slate-400" /> Skip
              </button>
            </div>
          </div>

          {/* Answer Recording & Submission Area */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Your Spoken Answer</span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Clock className="h-4 w-4 text-blue-400" /> {formatTimer(timerSeconds)}
              </div>
            </div>

            {/* Answer Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  <Mic className="h-4 w-4" /> Start Speaking Answer
                </button>
              ) : (
                <button
                  onClick={() => setIsRecording(false)}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition"
                >
                  <StopCircle className="h-4 w-4" /> Stop Recording
                </button>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || (!isRecording && !typedAnswer && timerSeconds === 0)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 ml-auto"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Analyzing Turn...' : 'Submit Answer'}
              </button>
            </div>

            {/* Notification Banner */}
            {notification && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{notification}</span>
              </div>
            )}

            {/* Text Fallback Area Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTextFallback(!showTextFallback)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                {showTextFallback ? 'Hide typed answer fallback' : 'Or type / edit answer transcript textually'}
              </button>

              {showTextFallback && (
                <textarea
                  rows={3}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer or paste your transcript here..."
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
