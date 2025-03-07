
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
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

  const startRecording = async () => {
    try {
      setIsPreparing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsPreparing(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsPreparing(false);
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: 'Could not access microphone. Please check your permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      
      // Convert the audio blob to base64
      const reader = new FileReader();
      
      // Create a Promise to handle the asynchronous FileReader
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          // Extract the base64 part (remove the data URL prefix)
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioBase64: base64Audio }
      });
      
      if (error) {
        console.error('Transcription function error:', error);
        throw new Error(error.message || 'Transcription failed');
      }
      
      if (data?.text) {
        onTranscriptionComplete(data.text);
        toast({
          title: 'Transcription Complete',
          description: 'Your recording has been converted to text.',
        });
      } else {
        throw new Error('No transcription returned');
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
            {isPreparing || isTranscribing ? (
              <Button variant="outline" size="icon" className="h-16 w-16 rounded-full" disabled>
                <Loader2 className="h-8 w-8 animate-spin" />
              </Button>
            ) : isRecording ? (
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-16 w-16 rounded-full" 
                onClick={stopRecording}
              >
                <Square className="h-8 w-8" />
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="icon" 
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600" 
                onClick={startRecording}
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
              <div className="text-sm">Converting speech to text...</div>
            ) : (
              <div className="text-sm">Tap to record your dream</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
