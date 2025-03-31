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
      
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      // Force MP3 recording if supported
      const mimeType = 'audio/mpeg'; // MP3
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('MP3 recording is not supported in this browser. Please try a different browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          // Use more compatible audio constraints
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create MediaRecorder with forced MP3 format
      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Standard MP3 bitrate
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`Recording completed. Size: ${audioBlob.size} bytes, Type: ${mimeType}`);
        setAudioBlob(audioBlob);
        transcribeAudio(audioBlob, 'mp3'); // Always use .mp3 extension
      };

      // Use smaller chunks for more reliable processing
      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setRecordingTime(0);
      setIsPreparing(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsPreparing(false);
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: error instanceof Error ? error.message : 'Could not access microphone. Please check your permissions.',
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

  const transcribeAudio = async (audioBlob: Blob, fileExtension = 'webm') => {
    try {
      setIsTranscribing(true);
      
      // Check if blob is valid
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data was recorded. Please try again.');
      }
      
      // Log details before conversion for debugging
      console.log(`Processing audio: ${audioBlob.size} bytes, type: ${audioBlob.type}, extension: ${fileExtension}`);
      
      // Convert the audio blob to base64
      const reader = new FileReader();
      
      // Create a Promise to handle the asynchronous FileReader
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          try {
            // Extract the base64 part (remove the data URL prefix)
            const base64 = reader.result as string;
            if (!base64 || typeof base64 !== 'string') {
              reject(new Error('Failed to convert audio to base64'));
              return;
            }
            
            const base64Parts = base64.split(',');
            if (base64Parts.length !== 2) {
              reject(new Error('Invalid base64 format'));
              return;
            }
            
            const base64Data = base64Parts[1];
            console.log(`Base64 conversion successful: ${base64Data.length} chars`);
            resolve(base64Data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (event) => {
          console.error('FileReader error:', reader.error);
          reject(new Error(`Failed to read audio file: ${reader.error?.message || 'Unknown error'}`));
        };
        reader.readAsDataURL(audioBlob);
      });
      
      // Prepare the payload with additional info to help troubleshoot
      const payload = { 
        audioBase64: base64Audio,
        fileExtension: fileExtension,
        mimeType: audioBlob.type,
        dataSize: base64Audio.length,
        userAgent: navigator.userAgent
      };
      
      console.log(`Sending data to transcription service. Size: ${payload.dataSize} chars, MIME Type: ${payload.mimeType}, Extension: ${payload.fileExtension}`);
      
      // Call the Supabase Edge Function with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Call the Supabase Edge Function
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
            description: 'Your recording has been converted to text.',
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
              <div className="text-sm">Converting speech to text...</div>
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
