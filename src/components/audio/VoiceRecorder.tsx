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
      
      // Check if mediaDevices API is available (missing on some mobile browsers)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }
      
      // Detect if we're on iOS or Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
      // Attempt to get microphone with explicit error handling
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            // Use more compatible audio constraints for mobile
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (micError: any) {
        // Handle specific permission errors
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (micError.name === 'NotFoundError' || micError.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (micError.name === 'NotReadableError' || micError.name === 'TrackStartError') {
          throw new Error('Cannot access microphone. It may be in use by another application.');
        } else if (micError.name === 'OverconstrainedError') {
          throw new Error('Microphone constraints cannot be satisfied.');
        } else {
          throw new Error(`Microphone error: ${micError.message || micError.name || 'Unknown error'}`);
        }
      }
      
      // Define supported MIME types based on browser
      let supportedMimeTypes: string[] = [];
      
      if (isIOS || isSafari) {
        // Safari/iOS supports more limited formats
        supportedMimeTypes = [
          'audio/mp4',
          'audio/aac',
          'audio/mp3',
          'audio/mpeg'
        ];
      } else {
        // For other browsers
        supportedMimeTypes = [
          'audio/mp3',
          'audio/mpeg',
          'audio/mp4',
          'audio/m4a',
          'audio/wav',
          'audio/webm;codecs=opus',
          'audio/webm'
        ];
      }
      
      // Find the first supported MIME type
      let mimeType = '';
      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      // Log browser and selected MIME type for debugging
      console.log(`Browser: ${isIOS ? 'iOS' : ''}${isSafari ? 'Safari' : ''}`);
      console.log('Using audio MIME type:', mimeType || 'browser default');
      
      // Create options for MediaRecorder
      const recorderOptions: MediaRecorderOptions = {};
      
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      // Add specific options for mobile if available
      if (isIOS || isSafari) {
        // Safari/iOS often needs higher bitrate for better quality
        recorderOptions.audioBitsPerSecond = 128000;
      }
      
      // Create MediaRecorder with options
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Get the actual MIME type that was used
        const actualType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        console.log('Recording completed with MIME type:', actualType);
        
        // Extract the file extension from the MIME type
        let fileExtension = 'webm';
        if (actualType.includes('mp3') || actualType.includes('mpeg')) fileExtension = 'mp3';
        else if (actualType.includes('mp4') || actualType.includes('m4a') || actualType.includes('aac')) fileExtension = 'm4a';
        else if (actualType.includes('wav')) fileExtension = 'wav';
        
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        console.log(`Recording size: ${audioBlob.size} bytes`);
        setAudioBlob(audioBlob);
        transcribeAudio(audioBlob, fileExtension);
      };

      // Use smaller chunks on mobile for more reliable processing
      const timeslice = isIOS || isSafari ? 500 : 1000; // ms
      
      mediaRecorderRef.current.start(timeslice);
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
      console.log(`Processing audio: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
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
      
      console.log(`Sending data to transcription service. Size: ${payload.dataSize} chars`);
      
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
