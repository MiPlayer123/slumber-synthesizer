import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySave: (apiKey: string) => void;
  initialApiKey?: string;
}

export function ApiKeyInput({ onApiKeySave, initialApiKey = '' }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Load saved API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      onApiKeySave(savedApiKey);
    }
  }, [onApiKeySave]);
  
  const handleSaveApiKey = () => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      onApiKeySave(apiKey);
    }
  };
  
  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api-key">OpenAI API Key</Label>
        <div className="flex">
          <div className="relative flex-grow">
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="pr-10"
            />
            <button
              type="button"
              onClick={toggleShowApiKey}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button 
            onClick={handleSaveApiKey} 
            className="ml-2"
            disabled={!apiKey}
          >
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your API key is stored locally and never sent to our servers. You can get an API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            OpenAI's website
          </a>
          .
        </p>
      </div>
    </div>
  );
} 