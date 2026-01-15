import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Send, Keyboard, AlertCircle, Volume2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useConversation } from '../context/ConversationContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPermission } from '../hooks/useAudioPermission';
import { Waveform } from '../components/Waveform';
import { ErrorToast } from '../components/ErrorToast';
import {
  createConversation,
  sendAudioMessage,
  sendTextMessage,
  checkMembership,
  withRetry,
  type AudioSendResponse,
} from '../services/api';
import clsx from 'clsx';

export default function Conversation() {
  const navigate = useNavigate();
  const { currentUser, hasFeature } = useUser();
  const { messages, addMessage, setConversationState, conversationState, setSessionId, sessionId } =
    useConversation();

  const { startRecording, stopRecording, mediaStream, audioBlob, resetRecording } =
    useAudioRecorder();

  const { requestPermission } = useAudioPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [membershipChecking, setMembershipChecking] = useState(true);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [textInput, setTextInput] = useState('');
  const [remainingConversations, setRemainingConversations] = useState<number | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<(() => Promise<void>) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const initStartedRef = useRef(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  const playResponseAudio = useCallback(
    (dataUrl: string) => {
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

      audio.play().catch((e) => console.error('Playback failed', e));
    },
    [setConversationState]
  );

  // Redirect if not logged in or no feature access
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    if (!hasFeature('conversation')) {
      navigate('/dashboard');
      return;
    }
  }, [currentUser, hasFeature, navigate]);

  // Check membership first
  useEffect(() => {
    if (!currentUser || !hasFeature('conversation')) {
      return;
    }

    const checkMembershipAccess = async () => {
      try {
        const membership = await checkMembership(currentUser.id);
        if (!membership?.data?.can_use_conversation) {
          setInitError('멤버십이 없거나 대화 횟수가 소진되었습니다.');
          return false;
        }
        if (
          membership?.data?.is_usage_based &&
          membership?.data?.remaining_conversations !== null
        ) {
          setRemainingConversations(membership.data.remaining_conversations);
        }
        return true;
      } catch {
        setInitError('멤버십을 확인할 수 없습니다. 멤버십을 구매해주세요.');
        return false;
      } finally {
        setMembershipChecking(false);
      }
    };

    checkMembershipAccess();
  }, [currentUser, hasFeature]);

  // Initialize Conversation
  useEffect(() => {
    const init = async () => {
      try {
        // Create new conversation
        const newConv = await createConversation('New Session ' + new Date().toLocaleTimeString());
        setSessionId(newConv.id);

        // Update remaining conversations if returned from API
        if (newConv.meta?.remaining_conversations !== undefined) {
          setRemainingConversations(newConv.meta.remaining_conversations);
        }

        // AI starts the conversation first
        addMessage({
          content:
            "Hello! I'm your AI English Tutor. Let's practice English together! What would you like to talk about today?",
          sender: 'ai',
        });
      } catch (e: unknown) {
        console.error('Failed to start conversation', e);
        const err = e as {
          response?: { data?: { error?: { message?: string; code?: string } } };
          message?: string;
        };
        const errorCode = err.response?.data?.error?.code;
        if (errorCode === 'NO_CONVERSATION_CREDITS') {
          setInitError('대화 횟수가 소진되었습니다. 추가 멤버십을 구매해주세요.');
        } else if (errorCode === 'MEMBERSHIP_REQUIRED') {
          setInitError('멤버십이 필요합니다. 멤버십을 구매해주세요.');
        } else {
          const msg =
            err.response?.data?.error?.message || err.message || 'Failed to start conversation.';
          setInitError(msg);
        }
      }
    };

    if (!membershipChecking && !sessionId && !initError && !initStartedRef.current) {
      initStartedRef.current = true;
      init();
    }
  }, [sessionId, setSessionId, addMessage, initError, membershipChecking]);

  // Auto-scroll (must be before any returns to follow Rules of Hooks)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Audio Blob (Send to Backend)
  useEffect(() => {
    const sendAudio = async () => {
      if (audioBlob && sessionId) {
        setIsProcessing(true);
        setConversationState('processing');

        const doSendAudio = async () => {
          const response = await withRetry(() => sendAudioMessage(sessionId, audioBlob));
          const { user_message, assistant_message, audio } = response as AudioSendResponse;

          addMessage({ content: user_message.content, sender: 'user' });

          const audioUrl = audio?.data
            ? `data:${audio.content_type};base64,${audio.data}`
            : undefined;
          addMessage({ content: assistant_message.content, sender: 'ai', audioUrl });

          if (audioUrl) {
            playResponseAudio(audioUrl);
          } else {
            setConversationState('idle');
          }
        };

        try {
          await doSendAudio();
        } catch (error) {
          console.error('Failed to send audio', error);
          const axiosError = error as {
            response?: {
              data?: { error?: { message?: string }; message?: string };
              status?: number;
            };
            message?: string;
          };
          const errorMessage =
            axiosError.response?.data?.error?.message ||
            axiosError.response?.data?.message ||
            axiosError.message ||
            '네트워크 오류가 발생했습니다';
          setToastError(`음성 처리 실패: ${errorMessage}`);
          setLastFailedAction(() => doSendAudio);
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

  // Loading state while checking membership
  if (membershipChecking) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">멤버십 확인 중...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">접근 불가</h2>
        <p className="mb-6 text-gray-600">{initError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            홈으로
          </button>
          <button
            onClick={() => navigate('/purchase')}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            멤버십 구매
          </button>
        </div>
      </div>
    );
  }

  const handleMicClick = async () => {
    if (inputMode === 'text') {
      // Switch to voice mode and request permission
      const hasPermission = await requestPermission();
      if (hasPermission) {
        setInputMode('voice');
      } else {
        alert('Microphone permission is required for voice input.');
      }
      return;
    }

    if (conversationState === 'idle' || conversationState === 'playing') {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setConversationState('recording');
      startRecording();
    } else if (conversationState === 'recording') {
      stopRecording();
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim() || !sessionId || isProcessing) return;

    const userText = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    setConversationState('processing');

    // Add user message immediately
    addMessage({ content: userText, sender: 'user' });

    const doSendText = async () => {
      const response = await withRetry(() => sendTextMessage(sessionId, userText));
      const { assistant_message, audio } = response as AudioSendResponse;

      const audioUrl = audio?.data ? `data:${audio.content_type};base64,${audio.data}` : undefined;
      addMessage({ content: assistant_message.content, sender: 'ai', audioUrl });

      if (audioUrl) {
        playResponseAudio(audioUrl);
      } else {
        setConversationState('idle');
      }
    };

    try {
      await doSendText();
    } catch (error) {
      console.error('Failed to send text', error);
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage =
        axiosError.response?.data?.error?.message || '네트워크 오류가 발생했습니다';
      setToastError(`텍스트 처리 실패: ${errorMessage}`);
      setLastFailedAction(() => doSendText);
      setConversationState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleRetry = async () => {
    if (lastFailedAction) {
      setToastError(null);
      setIsProcessing(true);
      setConversationState('processing');
      try {
        await lastFailedAction();
        setLastFailedAction(null);
      } catch (error) {
        console.error('Retry failed', error);
        setToastError('재시도 실패: 네트워크 상태를 확인해주세요');
      } finally {
        setIsProcessing(false);
        setConversationState('idle');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200 p-4">
      {/* Error Toast */}
      {toastError && (
        <ErrorToast
          message={toastError}
          onDismiss={() => setToastError(null)}
          onRetry={lastFailedAction ? handleRetry : undefined}
        />
      )}
      <div className="flex h-[700px] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="mr-4 rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Conversation Practice</h1>
          </div>
          {remainingConversations !== null && (
            <div className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              남은 대화: {remainingConversations}회
            </div>
          )}
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex w-full items-end gap-2',
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {/* AI message play button (left side) */}
              {msg.sender === 'ai' && msg.audioUrl && (
                <button
                  onClick={() => playResponseAudio(msg.audioUrl!)}
                  disabled={conversationState === 'playing'}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50"
                  title="다시 듣기"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-base',
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 rounded-2xl bg-gray-200 px-5 py-3 text-base text-gray-600">
                <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400"></div>
                <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]"></div>
                <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></div>
                <span className="ml-2">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {inputMode === 'text' ? (
            /* Text Input Mode */
            <div className="flex items-center gap-3">
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                  'bg-gray-100 hover:bg-gray-200 text-gray-600',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
                title="Switch to voice input"
              >
                <Mic className="h-5 w-5" />
              </button>
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isProcessing}
                className="flex-1 rounded-full border border-gray-300 px-5 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim() || isProcessing}
                className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                  textInput.trim() && !isProcessing
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          ) : (
            /* Voice Input Mode */
            <div className="flex flex-col items-center space-y-4">
              {/* Waveform */}
              <div className="h-16 w-full overflow-hidden rounded-xl bg-gray-900 shadow-inner">
                {conversationState === 'recording' ? (
                  <Waveform
                    mediaStream={mediaStream}
                    isRecording={true}
                    width={450}
                    height={64}
                    color="#818cf8"
                    backgroundColor="#111827"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    {conversationState === 'processing' ? 'Processing...' : 'Ready to record'}
                  </div>
                )}
              </div>

              {/* Voice Controls */}
              {conversationState === 'recording' ? (
                <div className="flex w-full items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      resetRecording();
                      setConversationState('idle');
                    }}
                    className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMicClick}
                    className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setInputMode('text')}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                    title="Switch to text input"
                  >
                    <Keyboard className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleMicClick}
                    disabled={isProcessing}
                    className={clsx(
                      'flex h-16 w-16 items-center justify-center rounded-full transition-all shadow-lg',
                      'bg-indigo-600 hover:bg-indigo-700 text-white',
                      isProcessing && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Mic className="h-8 w-8" />
                  </button>
                  <div className="w-12" /> {/* Spacer for centering */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
