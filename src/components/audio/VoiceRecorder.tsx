import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as lamejs from 'lamejs';

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
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (externalIsRecording !== undefined) {
      setIsRecording(externalIsRecording);
    }
  }, [externalIsRecording]);

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

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setIsPreparing(true);
      setIsTranscribing(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
         options.mimeType = 'audio/mp4';
      }
       console.log('Attempting to record using MIME type:', options.mimeType || 'browser default');

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const originalMimeType = mediaRecorderRef.current?.mimeType || 'application/octet-stream';
        console.log('Recording stopped. Original MIME type:', originalMimeType);

        if (audioChunksRef.current.length === 0) {
           console.error("No audio chunks recorded.");
           toast({ variant: 'destructive', title: 'Recording Error', description: 'No audio data was captured.' });
           setIsTranscribing(false);
           return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: originalMimeType });
        audioChunksRef.current = [];

        await processAndTranscribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setRecordingTime(0);
      setIsPreparing(false);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setIsPreparing(false);
      setIsTranscribing(false);
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: error.message || 'Could not start recording.',
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

  const processAndTranscribeAudio = async (audioBlob: Blob) => {
     console.log(`Original audio blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
     if (audioBlob.size === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Recorded audio is empty.' });
        setIsTranscribing(false);
        return;
     }

     try {
        setIsTranscribing(true);

        const audioContext = getAudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        console.log(`Audio properties: ${sampleRate}Hz, ${channels} channels`);

        const pcmData = audioBuffer.getChannelData(0);

        const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);

        const samples = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
           samples[i] = pcmData[i] * 32767;
        }

        const mp3DataChunks: Int8Array[] = [];
        const chunkSize = 1152;
        for (let i = 0; i < samples.length; i += chunkSize) {
           const chunk = samples.subarray(i, i + chunkSize);
           const mp3buf = mp3Encoder.encodeBuffer(chunk);
           if (mp3buf.length > 0) {
              mp3DataChunks.push(new Int8Array(mp3buf));
           }
        }
        const finalMp3buf = mp3Encoder.flush();
        if (finalMp3buf.length > 0) {
            mp3DataChunks.push(new Int8Array(finalMp3buf));
        }

        const mp3Blob = new Blob(mp3DataChunks, { type: 'audio/mpeg' });
        console.log(`Converted MP3 blob size: ${mp3Blob.size} bytes`);

        await transcribeAudio(mp3Blob, 'mp3');

     } catch (error: any) {
        console.error('Error during audio processing/conversion:', error);
        toast({
           variant: 'destructive',
           title: 'Conversion Failed',
           description: `Could not convert audio to MP3: ${error.message}`,
        });
        setIsTranscribing(false);
     }
  }

  const transcribeAudio = async (audioBlob: Blob, fileExtension: string) => {
    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            const base64 = reader.result as string;
            if (!base64 || typeof base64 !== 'string') {
              reject(new Error('Failed to convert audio to base64')); return;
            }
            const base64Parts = base64.split(',');
            if (base64Parts.length !== 2) {
              reject(new Error('Invalid base64 format')); return;
            }
            const base64Data = base64Parts[1];
            console.log(`Base64 conversion successful (MP3): ${base64Data.length} chars`);
            resolve(base64Data);
          } catch (error) { reject(error); }
        };
        reader.onerror = (event) => {
             console.error('FileReader error:', reader.error);
             reject(new Error(`Failed to read audio file: ${reader.error?.message || 'Unknown error'}`));
         };
        reader.readAsDataURL(audioBlob);
      });

      const payload = {
        audioBase64: base64Audio,
        fileExtension: 'mp3',
        mimeType: 'audio/mpeg',
        dataSize: base64Audio.length,
        userAgent: navigator.userAgent
      };

      console.log(`Sending MP3 data to transcription service. Size: ${payload.dataSize} chars`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: payload
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Transcription function error:', error);
          throw new Error(error.message || 'Transcription failed');
        }
        
        if (data?.text) {
          onTranscriptionComplete(data.text);
          toast({
            title: 'Transcription Complete',
            description: 'Your recording has been converted and transcribed.',
          });
        } else {
          throw new Error('No transcription returned');
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Transcription request timed out. Try a shorter recording or check your connection.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: error instanceof Error ? error.message : 'Could not transcribe audio',
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
            {isPreparing ? (
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full" disabled>
                <Loader2 className="h-8 w-8 animate-spin" />
              </Button>
            ) : isTranscribing ? (
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
            {isPreparing ? (
              <div className="text-sm">Preparing microphone...</div>
            ) : isTranscribing ? (
              <div className="text-sm">Processing & Transcribing...</div>
            ) : isRecording ? (
              <div className="flex flex-col items-center">
                <div className="text-red-500 font-medium">Recording...</div>
                <div className="text-sm">{formatTime(recordingTime)}</div>
              </div>
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
