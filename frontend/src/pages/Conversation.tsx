import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  Send,
  Keyboard,
  AlertCircle,
  Volume2,
  Zap,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
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
  sendTextMessageStream,
  checkMembership,
  withRetry,
  RateLimitError,
  type AudioSendResponse,
} from '../services/api';
import clsx from 'clsx';

export default function Conversation() {
  const navigate = useNavigate();
  const { currentUser, hasFeature } = useUser();
  const { messages, addMessage, setConversationState, conversationState, setSessionId, sessionId } =
    useConversation();

  const {
    startRecording,
    stopRecording,
    mediaStream,
    audioBlob,
    resetRecording,
    audioLevel,
    isVADActive,
    duration,
    vadConfig,
    state: recordingState,
  } = useAudioRecorder();

  const { requestPermission } = useAudioPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [membershipChecking, setMembershipChecking] = useState(true);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [textInput, setTextInput] = useState('');
  const [remainingConversations, setRemainingConversations] = useState<number | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<(() => Promise<void>) | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [useStreaming, setUseStreaming] = useState(true);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortStreamRef = useRef<(() => void) | null>(null);
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

  // Helper function to convert Blob to data URL
  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Handle Audio Blob - Enter Preview Mode (instead of auto-sending)
  useEffect(() => {
    const enterPreviewMode = async () => {
      if (audioBlob && sessionId) {
        // Convert to data URL for preview playback
        const audioUrl = await blobToDataUrl(audioBlob);
        setPreviewAudioUrl(audioUrl);
        setPreviewBlob(audioBlob);
        setConversationState('preview');
        resetRecording();
      }
    };

    if (audioBlob) {
      enterPreviewMode();
    }
  }, [audioBlob, sessionId, blobToDataUrl, setConversationState, resetRecording]);

  // Handle Preview Playback (stays in preview mode after playback)
  const handlePreviewPlay = useCallback(() => {
    if (!previewAudioUrl) return;

    // If already playing, stop it
    if (isPreviewPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setIsPreviewPlaying(false);
      return;
    }

    // Stop any current playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audio = new Audio(previewAudioUrl);
    audioPlayerRef.current = audio;
    setIsPreviewPlaying(true);

    // Return to preview state after playback (not idle)
    audio.onended = () => {
      setIsPreviewPlaying(false);
    };

    audio.play().catch((e) => {
      console.error('Preview playback failed', e);
      setIsPreviewPlaying(false);
    });
  }, [previewAudioUrl, isPreviewPlaying]);

  // Handle Cancel Preview
  const handleCancelPreview = useCallback(() => {
    // Stop any playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewAudioUrl(null);
    setPreviewBlob(null);
    setConversationState('idle');
  }, [setConversationState]);

  // Handle Confirm Send (after preview)
  const handleConfirmSend = useCallback(async () => {
    if (!previewBlob || !sessionId || !previewAudioUrl) return;

    // Stop any playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPreviewPlaying(false);

    setIsProcessing(true);
    setConversationState('processing');

    const userAudioUrl = previewAudioUrl;
    const blobToSend = previewBlob;

    // Clear preview state
    setPreviewAudioUrl(null);
    setPreviewBlob(null);

    const doSendAudio = async () => {
      const response = await withRetry(() => sendAudioMessage(sessionId, blobToSend));
      const { user_message, assistant_message, audio } = response as AudioSendResponse;

      // Include user's audio URL for playback
      addMessage({ content: user_message.content, sender: 'user', audioUrl: userAudioUrl });

      const audioUrl = audio?.data ? `data:${audio.content_type};base64,${audio.data}` : undefined;
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

      // Special handling for rate limit errors
      if (error instanceof RateLimitError) {
        const waitTime = error.retryAfter ? `${error.retryAfter}초 후에` : '잠시 후';
        setToastError(`요청이 너무 많습니다. ${waitTime} 다시 시도해주세요.`);
        setLastFailedAction(null);
        setConversationState('idle');
        return;
      }

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
    }
  }, [
    previewBlob,
    sessionId,
    previewAudioUrl,
    addMessage,
    setConversationState,
    playResponseAudio,
  ]);

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

    if (useStreaming) {
      // Use streaming API
      setStreamingText('');

      abortStreamRef.current = sendTextMessageStream(sessionId, userText, {
        onChunk: (chunk) => {
          setStreamingText((prev) => prev + chunk);
        },
        onComplete: (data) => {
          setStreamingText('');
          const audioUrl = data.audio?.data
            ? `data:${data.audio.content_type};base64,${data.audio.data}`
            : undefined;
          addMessage({ content: data.assistant_message.content, sender: 'ai', audioUrl });

          if (audioUrl) {
            playResponseAudio(audioUrl);
          } else {
            setConversationState('idle');
          }
          setIsProcessing(false);
          abortStreamRef.current = null;
        },
        onError: (error) => {
          setStreamingText('');
          setToastError(`스트리밍 오류: ${error}`);
          setConversationState('idle');
          setIsProcessing(false);
          abortStreamRef.current = null;
        },
      });
    } else {
      // Use non-streaming API
      const doSendText = async () => {
        const response = await withRetry(() => sendTextMessage(sessionId, userText));
        const { assistant_message, audio } = response as AudioSendResponse;

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
        await doSendText();
      } catch (error) {
        console.error('Failed to send text', error);

        // Special handling for rate limit errors
        if (error instanceof RateLimitError) {
          const waitTime = error.retryAfter ? `${error.retryAfter}초 후에` : '잠시 후';
          setToastError(`요청이 너무 많습니다. ${waitTime} 다시 시도해주세요.`);
          setLastFailedAction(null); // Don't offer retry for rate limits
          setConversationState('idle');
          setIsProcessing(false);
          return;
        }

        const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
        const errorMessage =
          axiosError.response?.data?.error?.message || '네트워크 오류가 발생했습니다';
        setToastError(`텍스트 처리 실패: ${errorMessage}`);
        setLastFailedAction(() => doSendText);
        setConversationState('idle');
      } finally {
        setIsProcessing(false);
      }
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
          <div className="flex items-center gap-2">
            {/* Streaming toggle */}
            <button
              onClick={() => setUseStreaming(!useStreaming)}
              className={clsx(
                'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                useStreaming ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}
              title={useStreaming ? '스트리밍 모드 켜짐' : '스트리밍 모드 꺼짐'}
            >
              <Zap className="h-3 w-3" />
              {useStreaming ? 'Stream' : 'Off'}
            </button>
            {remainingConversations !== null && (
              <div className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                남은 대화: {remainingConversations}회
              </div>
            )}
          </div>
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
              {/* User message play button (right side) */}
              {msg.sender === 'user' && msg.audioUrl && (
                <button
                  onClick={() => playResponseAudio(msg.audioUrl!)}
                  disabled={conversationState === 'playing'}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
                  title="내 음성 다시 듣기"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              {streamingText ? (
                /* Streaming response */
                <div className="max-w-[80%] rounded-2xl rounded-bl-none border border-gray-100 bg-white px-5 py-3 text-base text-gray-800 shadow-sm">
                  <p className="whitespace-pre-wrap leading-relaxed">{streamingText}</p>
                  <span className="inline-block h-4 w-1 animate-pulse bg-indigo-500 ml-1"></span>
                </div>
              ) : (
                /* Loading dots */
                <div className="flex items-center space-x-2 rounded-2xl bg-gray-200 px-5 py-3 text-base text-gray-600">
                  <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400"></div>
                  <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]"></div>
                  <div className="h-3 w-3 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></div>
                  <span className="ml-2">AI is thinking...</span>
                </div>
              )}
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
              {/* Waveform / Preview / Status */}
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
                ) : conversationState === 'preview' ? (
                  <div className="flex h-full w-full items-center justify-center gap-3 text-sm">
                    {isPreviewPlaying ? (
                      <>
                        <Volume2 className="h-5 w-5 text-indigo-400 animate-pulse" />
                        <span className="text-indigo-400">재생 중...</span>
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-1 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-indigo-400" />
                          <div className="h-4 w-1 animate-[bounce_0.6s_ease-in-out_0.1s_infinite] rounded-full bg-indigo-400" />
                          <div className="h-2 w-1 animate-[bounce_0.6s_ease-in-out_0.2s_infinite] rounded-full bg-indigo-400" />
                          <div className="h-5 w-1 animate-[bounce_0.6s_ease-in-out_0.3s_infinite] rounded-full bg-indigo-400" />
                          <div className="h-3 w-1 animate-[bounce_0.6s_ease-in-out_0.4s_infinite] rounded-full bg-indigo-400" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5 text-green-400" />
                        <span className="text-green-400">녹음 완료 - 미리 듣고 전송하세요</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    {conversationState === 'processing' ? 'Processing...' : 'Ready to record'}
                  </div>
                )}
              </div>

              {/* VAD Status & Audio Level (only during recording) */}
              {recordingState === 'recording' && (
                <div className="flex w-full flex-col gap-2 px-2">
                  {/* Recording time indicator */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-500">
                      {duration}초 / {vadConfig.maxRecordingTime / 1000}초
                    </span>
                    {duration >= vadConfig.maxRecordingTime / 1000 - 10 && (
                      <span className="text-xs text-orange-500">
                        ({Math.max(0, vadConfig.maxRecordingTime / 1000 - duration)}초 남음)
                      </span>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={clsx(
                          'h-2 w-2 rounded-full',
                          isVADActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                        )}
                      />
                      <span className="text-xs text-gray-500">
                        {isVADActive ? '자동 중지 활성화' : '말씀해 주세요...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">음량</span>
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Controls - Recording State */}
              {conversationState === 'recording' ? (
                <div className="flex w-full items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      resetRecording();
                      setConversationState('idle');
                    }}
                    className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleMicClick}
                    className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
                  >
                    녹음 완료
                  </button>
                </div>
              ) : conversationState === 'preview' ? (
                /* Preview State - Listen, Send, or Re-record */
                <div className="flex w-full items-center justify-center gap-3">
                  <button
                    onClick={handleCancelPreview}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                    title="다시 녹음"
                  >
                    <RotateCcw className="h-5 w-5" />
                    다시 녹음
                  </button>
                  <button
                    onClick={handlePreviewPlay}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-white transition',
                      isPreviewPlaying
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-green-500 hover:bg-green-600'
                    )}
                    title={isPreviewPlaying ? '정지' : '미리 듣기'}
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Pause className="h-5 w-5" />
                        정지
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        미리 듣기
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleConfirmSend}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
                    title="전송"
                  >
                    <Send className="h-5 w-5" />
                    전송
                  </button>
                </div>
              ) : (
                /* Idle State - Start Recording */
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
