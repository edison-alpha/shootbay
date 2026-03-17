import { useState, useRef, useEffect } from 'react';
import { useGameStateStore } from '../../store/useGameStateStore';
import goblinAvatar from '../../assets/goblinbay.webp';
import { sendMessageToATXP, buildConversationHistory } from '../../lib/atxpService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

interface ChatScreenProps {
  onBack: () => void;
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const profile = useGameStateStore((s) => s.storeData.profile);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hai ${profile?.name || 'Petualang'}! Selamat datang — arena pertarungan Goblin Bay!`,
      sender: 'bot',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessageIndex]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessageIndex(newMessages.length - 1);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const history = buildConversationHistory(messages);
      const botResponse = await sendMessageToATXP(currentInput, history);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: Date.now(),
      };
      
      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      setCurrentMessageIndex(finalMessages.length - 1);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Maaf, saya sedang mengalami gangguan. Coba tanya lagi nanti ya! 😅',
        sender: 'bot',
        timestamp: Date.now(),
      };
      
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      setCurrentMessageIndex(finalMessages.length - 1);
    } finally {
      setIsTyping(false);
    }
  };

  const currentMessage = messages[currentMessageIndex];
  const isBot = currentMessage?.sender === 'bot';

  const goToPrevious = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(currentMessageIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(40,35,30,0.98) 0%, rgba(25,20,15,0.98) 100%)',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(180,83,9,0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(146,64,14,0.06) 0%, transparent 50%)
        `,
      }}
    >
      {/* Back Button - Top Left */}
      <button
        onClick={onBack}
        className="absolute top-16 left-4 z-10 text-amber-200 hover:text-amber-100 rounded-lg p-2 transition-all active:scale-90"
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(180,140,60,0.3)',
        }}
        aria-label="Back to menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex items-end justify-center px-4 pb-32 pt-20">
        <div className="w-full max-w-2xl">
          {/* Character Display */}
          <div className={`flex items-end gap-4 mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
              <div className="flex-shrink-0 mb-2">
                <img
                  src={goblinAvatar}
                  alt="Goblin Bay"
                  className="w-32 h-32 object-contain"
                  style={{
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                  }}
                />
              </div>
            )}

            {/* Dialogue Bubble */}
            <div
              className="relative max-w-md"
              style={{
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              {/* Speaker Name */}
              <div 
                className="mb-2 px-3 py-1 inline-block rounded-full text-xs font-black uppercase tracking-wider"
                style={{
                  background: isBot 
                    ? 'linear-gradient(135deg, rgba(180,83,9,0.3) 0%, rgba(146,64,14,0.3) 100%)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.3) 100%)',
                  border: isBot 
                    ? '1px solid rgba(180,140,60,0.4)'
                    : '1px solid rgba(96,165,250,0.4)',
                  color: isBot ? '#fbbf24' : '#60a5fa',
                }}
              >
                {isBot ? 'GOBLIN BAY' : profile?.name?.toUpperCase() || 'KAMU'}
              </div>

              {/* Message Bubble */}
              <div
                className="p-5 rounded-2xl relative max-h-96 overflow-y-auto dialogue-scrollbar"
                style={
                  isBot
                    ? {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)',
                        border: '2px solid rgba(180,140,60,0.3)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        color: '#1f2937',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)',
                        border: '2px solid rgba(96,165,250,0.3)',
                        boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
                        color: '#1f2937',
                      }
                }
              >
                <p className="text-base font-medium leading-relaxed">
                  {isTyping && currentMessageIndex === messages.length - 1 ? (
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  ) : (
                    currentMessage?.text
                  )}
                </p>

                {/* Triangle pointer */}
                <div
                  className="absolute bottom-0"
                  style={{
                    [isBot ? 'left' : 'right']: '-8px',
                    width: 0,
                    height: 0,
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    [isBot ? 'borderRight' : 'borderLeft']: isBot 
                      ? '10px solid rgba(255,255,255,0.95)'
                      : '10px solid rgba(255,255,255,0.95)',
                  }}
                />
              </div>
            </div>

            {!isBot && profile?.profilePhoto && (
              <div className="flex-shrink-0 mb-2">
                <div
                  className="w-24 h-24 rounded-xl overflow-hidden"
                  style={{
                    border: '2px solid rgba(96,165,250,0.6)',
                    boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                  }}
                >
                  <img
                    src={profile.profilePhoto}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom UI */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-4"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.95) 100%)',
        }}
      >
        {/* Message Counter & Navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={goToPrevious}
            disabled={currentMessageIndex === 0}
            className="p-2 rounded-lg transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(180,83,9,0.3)',
              border: '1px solid rgba(180,140,60,0.4)',
            }}
          >
            <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div 
            className="px-4 py-2 rounded-lg font-black text-amber-100"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(180,140,60,0.3)',
            }}
          >
            {currentMessageIndex + 1} / {messages.length}
          </div>

          <button
            onClick={goToNext}
            disabled={currentMessageIndex === messages.length - 1}
            className="p-2 rounded-lg transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(180,83,9,0.3)',
              border: '1px solid rgba(180,140,60,0.4)',
            }}
          >
            <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ketik pesan kamu di sini..."
            disabled={isTyping}
            className="flex-1 px-5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none font-medium disabled:opacity-50 text-base"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '2px solid rgba(180,140,60,0.4)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            style={{
              background: 'linear-gradient(180deg, #b45309 0%, #92400e 100%)',
              border: '2px solid rgba(251,191,36,0.5)',
              boxShadow: '0 4px 12px rgba(180,100,10,0.5)',
            }}
          >
            {isTyping ? (
              <div className="w-6 h-6 border-2 border-amber-100 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Compact Scrollbar for Dialogue Bubble */
        .dialogue-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .dialogue-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
        }
        
        .dialogue-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 2px;
        }
        
        .dialogue-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }
        
        /* Firefox */
        .dialogue-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
