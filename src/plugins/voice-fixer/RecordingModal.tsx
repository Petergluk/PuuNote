import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Activity } from 'lucide-react';
import type { PluginAPI } from '../registry';
import { processAudio } from './utils';

export const RecordingModal = ({ targetNodeId, onClose, pluginApi }: { targetNodeId: string | null, onClose: () => void, pluginApi: PluginAPI }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [deviceName, setDeviceName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const timerRef = useRef<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cleanupAudio = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudio();
      onClose();
    }
  }, [cleanupAudio, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем пробел в текстовых полях, если вдруг фокус остался там
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setDeviceName(audioTrack.label || 'Неизвестный микрофон');
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
        analyserRef.current.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          canvasCtx.fillStyle = `rgb(59, 130, 246)`; 
          canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      drawVisualizer();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        cleanupAudio();
        
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const cleanMimeType = mimeType.split(';')[0];
        const blob = new Blob(audioChunksRef.current, { type: cleanMimeType });
        
        onClose(); // Закрываем модалку, так как запись завершена
        
        if (blob.size > 0) {
          await processAudio(blob, cleanMimeType, targetNodeId, pluginApi);
        } else {
          pluginApi.toast("Аудиозапись пустая", "error");
        }
      };

      mediaRecorder.start();
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Не удалось получить доступ к микрофону");
    }
  }, [cleanupAudio, onClose, pluginApi, targetNodeId]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startRecording();
    }
    return () => {
      mounted = false;
      cleanupAudio();
    };
  }, [cleanupAudio, startRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 shadow-2xl backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative border border-gray-100">
        
        <button 
          onClick={() => stopRecording()} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
           ✕
        </button>

        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 flex items-center gap-2">
          <Mic className="w-6 h-6 text-blue-600" />
          Voice Fixer
        </h3>

        {errorMsg ? (
          <div className="text-red-500 text-center mb-6">{errorMsg}</div>
        ) : (
          <>
            <div className="relative flex items-center justify-center w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
              <button
                onClick={stopRecording}
                className="relative z-10 flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            </div>
            
            <div className="flex flex-col items-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-200 shadow-inner w-full mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-600">
                <Activity className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-semibold truncate max-w-[200px]" title={deviceName}>
                  {deviceName || 'Определение микрофона...'}
                </span>
              </div>
              <canvas 
                ref={canvasRef} 
                width="280" 
                height="60" 
                className="w-full h-[60px] opacity-80"
              />
            </div>

            <div className="text-4xl font-mono text-gray-900 font-semibold tabular-nums tracking-wider text-center">
              {formatTime(recordingTime)}
            </div>
            <div className="text-sm font-medium text-gray-500 mt-3 text-center">
              Нажмите квадрат или клавишу <b><kbd>Пробел</kbd></b>, чтобы остановить запись
            </div>
          </>
        )}
      </div>
    </div>
  );
};
