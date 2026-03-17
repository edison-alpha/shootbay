// AI Wish Service using ATXP
import OpenAI from 'openai';

const ATXP_CONNECTION = import.meta.env.VITE_ATXP_CONNECTION;

const openai = new OpenAI({
  apiKey: ATXP_CONNECTION,
  baseURL: 'https://llm.atxp.ai/v1',
  dangerouslyAllowBrowser: true,
});

// Zodiac calculator
function zodiacFromDayMonth(day: number, month: number): string {
  const zodiacSigns = [
    { name: 'Capricorn', start: [12, 22], end: [1, 19] },
    { name: 'Aquarius', start: [1, 20], end: [2, 18] },
    { name: 'Pisces', start: [2, 19], end: [3, 20] },
    { name: 'Aries', start: [3, 21], end: [4, 19] },
    { name: 'Taurus', start: [4, 20], end: [5, 20] },
    { name: 'Gemini', start: [5, 21], end: [6, 20] },
    { name: 'Cancer', start: [6, 21], end: [7, 22] },
    { name: 'Leo', start: [7, 23], end: [8, 22] },
    { name: 'Virgo', start: [8, 23], end: [9, 22] },
    { name: 'Libra', start: [9, 23], end: [10, 22] },
    { name: 'Scorpio', start: [10, 23], end: [11, 21] },
    { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
  ];

  for (const sign of zodiacSigns) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;

    if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay)
    ) {
      return sign.name;
    }
  }

  return 'Capricorn';
}

// Generate romantic birthday wish response
export async function generateBirthdayWishResponse(
  wish: string,
  day: number,
  month: number
): Promise<{ text: string; prompt: string }> {
  const cleanWish = wish.trim();
  const zodiac = zodiacFromDayMonth(day, month);

  const prompt = [
    'Kamu adalah AI penulis ucapan ulang tahun romantis berbahasa Indonesia.',
    'Tugas:',
    '- Buat balasan 5-8 kalimat yang romantis, manis, dan hangat.',
    '- Wajib selaras dengan isi wish user.',
    `- User lahir tanggal ${day} bulan ${month} dengan zodiak ${zodiac}.`,
    '- Sisipkan istilah zodiak secara natural, contoh: "seorang Pisces yang lembut, intuitif, dan penuh empati".',
    '- Gunakan gaya bahasa puitis ringan, tidak berlebihan, tetap elegan.',
    '- Tutup dengan kalimat doa + dukungan penuh cinta.',
    '',
    `Wish user: "${cleanWish}"`,
  ].join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Kamu AI romantis berbahasa Indonesia. Tulis hangat, puitis, tidak berlebihan, dan relevan dengan wish user.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 400,
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (text) {
      return { text, prompt };
    }

    throw new Error('No response from AI');
  } catch (error) {
    console.error('Error generating birthday wish:', error);

    // Fallback response
    const zodiacStyle =
      zodiac === 'Pisces'
        ? 'seorang Pisces yang lembut, intuitif, dan penuh empati'
        : `seorang ${zodiac} yang punya cahaya unik dan hati yang kuat`;

    const text = [
      'AI Wish Balasan Romantis 💌',
      '',
      `Aku membaca wish kamu: "${cleanWish}" ✨`,
      `Dan itu terasa begitu tulus, seperti ${zodiacStyle}.`,
      'Semoga setiap langkahmu tahun ini dipenuhi keberanian, ketenangan, dan cinta yang selalu pulang kepadamu.',
      'Biarkan semesta memelukmu dengan cara paling lembut, lalu mengantar satu per satu harapanmu jadi nyata.',
      'Kalau hari ini kamu ragu, ingat: kamu pantas dicintai sebesar mimpimu sendiri.',
      'Selamat ulang tahun, semoga hatimu selalu hangat, doamu terjawab indah, dan bahagiamu tidak pernah kehabisan alasan. 🎂💝',
    ].join('\n');

    return { text, prompt };
  }
}

// Generate wish suggestions for players
export async function generateWishSuggestions(milestone: number): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah AI yang membantu pemain game membuat wish. Berikan 3 contoh wish yang inspiratif, positif, dan personal dalam bahasa Indonesia. Setiap wish harus singkat (1-2 kalimat) dan berbeda tema.',
        },
        {
          role: 'user',
          content: `Pemain mencapai milestone ${milestone} poin. Berikan 3 contoh wish yang bisa mereka pilih. Format: satu wish per baris, tanpa numbering.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content?.trim();

    if (response) {
      // Split by newline and filter empty lines
      const suggestions = response
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^\d+\./)) // Remove numbered items
        .slice(0, 3);

      if (suggestions.length > 0) {
        return suggestions;
      }
    }

    throw new Error('No suggestions generated');
  } catch (error) {
    console.error('Error generating wish suggestions:', error);

    // Fallback suggestions
    return [
      'Semoga tahun ini aku bisa lebih berani mengejar mimpi dan bahagia dengan prosesnya 🌟',
      'Aku ingin menjadi versi terbaik dari diriku sendiri dan membawa kebahagiaan untuk orang-orang tersayang 💫',
      'Semoga setiap langkahku dipenuhi berkah, kesehatan, dan cinta yang tulus ✨',
    ];
  }
}
