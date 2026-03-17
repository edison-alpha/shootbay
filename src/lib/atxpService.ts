// ATXP AI Service for chatbot integration using OpenAI SDK
import OpenAI from 'openai';

const ATXP_CONNECTION = import.meta.env.VITE_ATXP_CONNECTION;

// Initialize OpenAI client with ATXP configuration
const openai = new OpenAI({
  apiKey: ATXP_CONNECTION,
  baseURL: 'https://llm.atxp.ai/v1',
  dangerouslyAllowBrowser: true, // Required for browser usage
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Kamu adalah Goblin Bay, asisten virtual yang ramah dan membantu untuk game Dimsum Collector. 

Informasi tentang game:
- Game ini adalah adventure game di mana pemain mengumpulkan dimsum sambil menghindari musuh
- Pemain bisa mendapatkan tiket dengan menyelesaikan level dan mengumpulkan bintang
- Tiket digunakan untuk membuka Mystery Box yang berisi hadiah menarik
- Setiap level memiliki tantangan berbeda dan jumlah dimsum yang harus dikumpulkan
- Pemain bisa menggunakan joystick virtual atau keyboard untuk bergerak
- Ada power-ups dan senjata yang bisa digunakan dalam game
- Leaderboard menampilkan ranking pemain berdasarkan total dimsum dan bintang
- Inventory menyimpan semua item dan hadiah yang didapat pemain

Kepribadian kamu:
- Ramah, ceria, dan antusias
- Suka membantu pemain dengan tips dan trik
- Gunakan bahasa Indonesia yang santai tapi sopan
- Kadang gunakan emoji untuk membuat percakapan lebih hidup
- Jangan terlalu panjang dalam menjawab, usahakan singkat dan jelas

Jawab pertanyaan pemain dengan informatif dan membantu!`;

export async function sendMessageToATXP(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
  try {
    // Build messages array with system prompt and conversation history
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from ATXP AI');
    }

    return response;
  } catch (error) {
    console.error('Error calling ATXP AI:', error);
    
    // Fallback response if API fails
    return 'Maaf, saya sedang mengalami gangguan. Coba tanya lagi nanti ya! 😅';
  }
}

// Helper to build conversation history from messages
export function buildConversationHistory(messages: Array<{ sender: 'user' | 'bot'; text: string }>): ChatMessage[] {
  return messages
    .slice(-6) // Keep last 6 messages for context (3 exchanges)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })) as ChatMessage[];
}
