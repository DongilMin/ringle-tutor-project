import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Square } from 'lucide-react';
import { useConversation } from '../context/ConversationContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPermission } from '../hooks/useAudioPermission';
import { Waveform } from '../components/Waveform';
import { createConversation, sendAudioMessage, type AudioSendResponse } from '../services/api';
import clsx from 'clsx';

export default function Conversation() {
  const navigate = useNavigate();
  const { 
    messages, 
    addMessage, 
    setConversationState, 
    conversationState, 
    setSessionId, 
    sessionId
  } = useConversation();
  
  const { 
    startRecording, 
    stopRecording, 
    mediaStream, 
    audioBlob, 
    resetRecording 
  } = useAudioRecorder();

  const { requestPermission } = useAudioPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const playResponseAudio = useCallback((dataUrl: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audio = new Audio(dataUrl);
    audioPlayerRef.current = audio;
    setConversationState('playing');
    
    audio.onended = () => {
      setConversationState('idle');
    };
    
    audio.play().catch(e => console.error("Playback failed", e));
  }, [setConversationState]);

  // Initialize Conversation
  useEffect(() => {
    const init = async () => {
      try {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          setInitError("Microphone permission is required to use this feature.");
          return;
        }

        // Create new conversation
        const newConv = await createConversation("New Session " + new Date().toLocaleTimeString());
        setSessionId(newConv.id);
        
        // Add greeting
        addMessage({
          content: "Hello! I'm your AI English Tutor. Press the microphone button and say something to start practicing!",
          sender: 'ai',
        });
      } catch (e: any) {
        console.error("Failed to start conversation", e);
        const msg = e.response?.data?.error?.message || e.message || "Failed to start conversation.";
        setInitError(msg);
      }
    };

    if (!sessionId && !initError) {
      init();
    }
  }, [sessionId, requestPermission, setSessionId, addMessage, initError]);

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
          <ArrowLeft className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="mb-6 text-gray-600">{initError}</p>
        <button 
          onClick={() => navigate('/')}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Return Home
        </button>
      </div>
    );
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Audio Blob (Send to Backend)
  useEffect(() => {
    const sendAudio = async () => {
      if (audioBlob && sessionId) {
        setIsProcessing(true);
        setConversationState('processing');
        
        try {
          const response = await sendAudioMessage(sessionId, audioBlob);
          // Cast response to expected type
          const { user_message, assistant_message, audio } = response as AudioSendResponse;

          // 1. Add User Message
          addMessage({
            content: user_message.content,
            sender: 'user',
          });

          // 2. Add AI Message
          addMessage({
            content: assistant_message.content,
            sender: 'ai',
          });

          // 3. Play Audio
          if (audio && audio.data) {
            playResponseAudio(`data:${audio.content_type};base64,${audio.data}`);
          } else if ((response as AudioSendResponse).audio_url) {
             // Fallback if audio is url
             // Not implemented yet in this mock
             setConversationState('idle');
          } else {
             setConversationState('idle');
          }

        } catch (error) {
          console.error("Failed to send audio", error);
          alert("Failed to process your message. Please try again.");
          setConversationState('idle');
        } finally {
          setIsProcessing(false);
          resetRecording();
        }
      }
    };

    if (audioBlob) {
      sendAudio();
    }
  }, [audioBlob, sessionId, addMessage, setConversationState, resetRecording, playResponseAudio]);

  const handleMicClick = () => {
    if (conversationState === 'idle' || conversationState === 'playing') {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause(); // Stop playback if recording starts
      }
      setConversationState('recording');
      startRecording();
    } else if (conversationState === 'recording') {
      stopRecording(); 
      // This will trigger the useEffect([audioBlob])
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="flex items-center border-b bg-white px-4 py-3 shadow-sm">
        <button onClick={() => navigate('/')} className="mr-4 rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Conversation Practice</h1>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex w-full",
              msg.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[80%] rounded-2xl px-5 py-3 shadow-sm",
                msg.sender === 'user'
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="flex items-center space-x-2 rounded-2xl bg-gray-200 px-4 py-2 text-sm text-gray-600">
               <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-100"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-200"></div>
               <span>AI is thinking...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Control Area */}
      <div className="bg-white p-6 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-center justify-center space-y-4">
          
          {/* Waveform Visualization */}
          <div className="h-16 w-full max-w-md overflow-hidden rounded-xl bg-gray-900 shadow-inner">
             {conversationState === 'recording' ? (
               <Waveform 
                 mediaStream={mediaStream} 
                 isRecording={true} 
                 width={400} 
                 height={64} 
                 color="#818cf8" 
                 backgroundColor="#111827"
               />
             ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                  {conversationState === 'processing' ? "Processing Audio..." : "Ready to record"}
                </div>
             )}
          </div>

          {/* Main Action Button */}
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={clsx(
              "group relative flex h-20 w-20 items-center justify-center rounded-full transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2",
              conversationState === 'recording' 
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 animate-pulse" 
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            {conversationState === 'recording' ? (
              <Square className="h-8 w-8 fill-current text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </button>
          
          <p className="text-sm font-medium text-gray-500">
            {conversationState === 'recording' ? "Listening..." : "Tap to speak"}
          </p>
        </div>
      </div>
    </div>
  );
}