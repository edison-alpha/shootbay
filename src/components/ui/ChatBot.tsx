import goblinAvatar from '../../assets/goblinbay.webp';

interface ChatBotProps {
  onOpenChat: () => void;
}

export function ChatBot({ onOpenChat }: ChatBotProps) {
  return (
    <button
      onClick={onOpenChat}
      className="fixed bottom-24 right-2 z-[100] transition-all duration-300 active:scale-95 flex items-center justify-center"
      style={{
        width: '80px',
        height: '80px',
      }}
      aria-label="Open chat"
    >
      <img
        src={goblinAvatar}
        alt="Goblin Bay"
        className="w-full h-full object-contain"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6)) drop-shadow(0 0 8px rgba(180,140,60,0.4))',
        }}
      />
    </button>
  );
}
