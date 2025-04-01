import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isRecording?: boolean;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  isRecording: externalIsRecording
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  // Use external isRecording state if provided
  useEffect(() => {
    if (externalIsRecording !== undefined) {
      setIsRecording(externalIsRecording);
    }
  }, [externalIsRecording]);

  // Set up timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const startRecording = async () => {
    try {
      setIsPreparing(true);
      setIsTranscribing(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      // Detect browser environment
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      console.log(`Browser detection: iOS=${isIOS}, Safari=${isSafari}, Desktop=${isDesktop}`);
      
      // Use different audio constraints based on the platform
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      
      // Desktop Chrome sometimes needs specific settings
      if (isDesktop && !isSafari) {
        console.log("Using optimized settings for desktop Chrome");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Use browser's preferred format, we'll convert later
      const options: MediaRecorderOptions = {};
      
      console.log(`Recording using browser's default format`);

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const originalMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        console.log('Recording stopped. Original MIME type:', originalMimeType);

        if (audioChunksRef.current.length === 0) {
          console.error("No audio chunks recorded.");
          toast({ 
            variant: 'destructive', 
            title: 'Recording Error', 
            description: 'No audio data was captured.'
          });
          setIsTranscribing(false);
          return;
        }

        // Combine chunks into a single Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: originalMimeType });
        console.log(`Original recording: ${audioBlob.size} bytes`);
        
        // Process the audio for transcription
        await processAndTranscribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setRecordingTime(0);
      setIsPreparing(false);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setIsPreparing(false);
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: error.message || 'Could not access microphone. Please check your permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  // Function to convert audio to WAV format
  const processAndTranscribeAudio = async (audioBlob: Blob) => {
    try {
      console.log("Processing audio recording...");
      
      // Add a timeout for the entire process to prevent infinite loading
      const processingTimeout = setTimeout(() => {
        console.error("Audio processing timed out after 30 seconds");
        toast({
          variant: 'destructive',
          title: 'Transcription Timeout',
          description: 'The process took too long. Please try again with a shorter recording.',
        });
        setIsTranscribing(false);
      }, 30000); // 30 second timeout
      
      // Detect if running on desktop
      const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      console.log(`Platform detection: Desktop=${isDesktop}`);
      
      try {
        if (isDesktop) {
          // Simplified approach for desktop - send directly as webm
          console.log("Using simplified processing for desktop browsers");
          await transcribeAudio(audioBlob, audioBlob.type.split('/')[1] || 'webm');
          clearTimeout(processingTimeout);
          return;
        }
        
        // Mobile processing path - convert to WAV
        // 1. Get audio data as array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // 2. Decode the audio using Web Audio API
        const audioContext = getAudioContext();
        let audioBuffer;
        try {
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          console.log(`Decoded audio: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
        } catch (decodeError) {
          console.error("Failed to decode audio:", decodeError);
          // If decoding fails on mobile, try the desktop approach as fallback
          console.log("Falling back to direct transcription without decoding");
          await transcribeAudio(audioBlob, audioBlob.type.split('/')[1] || 'webm');
          clearTimeout(processingTimeout);
          return;
        }
        
        // 3. Convert to WAV format
        const wavBlob = await audioBufferToWav(audioBuffer);
        console.log(`WAV conversion complete. Size: ${wavBlob.size} bytes`);
        
        // 4. Send for transcription
        await transcribeAudio(wavBlob, 'wav');
        clearTimeout(processingTimeout);
      } catch (processingError) {
        clearTimeout(processingTimeout);
        throw processingError;
      }
    } catch (error: any) {
      console.error("Audio processing error:", error);
      toast({
        variant: 'destructive',
        title: 'Conversion Failed',
        description: error.message || 'Could not convert audio to compatible format',
      });
      setIsTranscribing(false);
    }
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (audioBuffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numOfChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;
      
      // Extract raw audio data
      const channelData: Float32Array[] = [];
      for (let channel = 0; channel < numOfChannels; channel++) {
        channelData.push(audioBuffer.getChannelData(channel));
      }
      
      // Interleave audio data - combine separate channels into single array
      const interleaved = new Float32Array(audioBuffer.length * numOfChannels);
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numOfChannels; channel++) {
          interleaved[(i * numOfChannels) + channel] = channelData[channel][i];
        }
      }
      
      // Convert to 16-bit PCM
      const dataLength = interleaved.length * 2; // 16-bit = 2 bytes per sample
      const buffer = new ArrayBuffer(44 + dataLength); // 44 bytes for WAV header
      const view = new DataView(buffer);
      
      // Write WAV header
      // "RIFF" chunk descriptor
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(view, 8, 'WAVE');
      
      // "fmt " sub-chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, format, true); // audio format (1 = PCM)
      view.setUint16(22, numOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numOfChannels * 2, true); // byte rate
      view.setUint16(32, numOfChannels * 2, true); // block align
      view.setUint16(34, bitDepth, true); // bits per sample
      
      // "data" sub-chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true); // data chunk size
      
      // Write audio data
      let offset = 44;
      for (let i = 0; i < interleaved.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, interleaved[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      
      // Create WAV blob
      const wavBlob = new Blob([buffer], { type: 'audio/wav' });
      resolve(wavBlob);
    });
    
    // Helper to write strings to DataView
    function writeString(view: DataView, offset: number, string: string): void {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob, fileExtension: string) => {
    try {
      // Determine the correct file extension and MIME type
      let mimeType = audioBlob.type || `audio/${fileExtension}`;
      if (!mimeType.startsWith('audio/')) {
        mimeType = `audio/${fileExtension}`;
      }
      
      // Make sure we have a valid file extension
      if (!fileExtension || fileExtension === 'audio/webm') {
        fileExtension = audioBlob.type.split('/')[1] || 'webm';
      }
      
      console.log(`Preparing to transcribe audio: type=${mimeType}, extension=${fileExtension}`);
      
      // Convert to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            console.log(`Base64 conversion successful: ${base64Data.length} chars`);
            resolve(base64Data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });
      
      // Now send to the OpenAI via Supabase Edge Function
      const payload = {
        audioBase64: base64Audio,
        fileExtension: fileExtension,
        mimeType: mimeType,
        dataSize: base64Audio.length,
        userAgent: navigator.userAgent
      };
      
      console.log(`Sending transcription request: format=${fileExtension}, size=${payload.dataSize} chars`);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: payload
      });
      
      if (error) {
        console.error('Transcription function error:', error);
        const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        if (isDesktop) {
          throw new Error('Desktop transcription failed. Try recording from a mobile device instead, or use the text input.');
        } else {
          throw new Error(error.message || 'Transcription failed');
        }
      }
      
      if (data?.text) {
        onTranscriptionComplete(data.text);
        toast({
          title: 'Transcription Complete',
          description: 'Your recording has been transcribed successfully.',
        });
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: error.message || 'Could not transcribe audio',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-full">
            {isPreparing || isTranscribing ? (
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full" disabled>
                <Loader2 className="h-8 w-8 animate-spin" />
              </Button>
            ) : isRecording ? (
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-16 w-16 rounded-full touch-manipulation" 
                onClick={stopRecording}
              >
                <Square className="h-8 w-8" />
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="icon" 
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 touch-manipulation" 
                onClick={startRecording}
                aria-label="Start recording"
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}
          </div>
          
          <div className="text-center">
            {isRecording ? (
              <div className="flex flex-col items-center">
                <div className="text-red-500 font-medium">Recording...</div>
                <div className="text-sm">{formatTime(recordingTime)}</div>
              </div>
            ) : isPreparing ? (
              <div className="text-sm">Preparing microphone...</div>
            ) : isTranscribing ? (
              <div className="text-sm">Converting & transcribing your recording...</div>
            ) : (
              <div className="text-sm">
                <span className="block">Tap to record your dream</span>
                <span className="block text-xs mt-1 text-muted-foreground">
                  Requires microphone permission
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
