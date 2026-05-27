import type { MoodName } from '../../src/types/ipc';

const API_KEY = process.env.API_NINJAS_KEY || 'XsnjbCvVotXxY9YqTDV8jORjvwIfW3JpWLHHDx8w';
const API_ROOT = 'https://api.api-ninjas.com/v2';

type ApiQuote = {
  quote: string;
  author?: string;
  work?: string;
  categories?: string[];
};

const moodCategories: Record<MoodName, string> = {
  calm: 'wisdom,life',
  focused: 'success,wisdom',
  grateful: 'happiness,life',
  curious: 'philosophy,wisdom',
  tired: 'inspirational,courage',
  stressed: 'courage,wisdom',
  happy: 'happiness,inspirational',
  low: 'inspirational,courage'
};

const quotesByMood: Record<MoodName, string[]> = {
  calm: ['Move slowly enough that your day can keep up with your heart.', 'Peace is not empty space. It is room to choose well.'],
  focused: ['Make the next right thing small enough to begin now.', 'Attention is devotion in work clothes.'],
  grateful: ['Let the good things land before you run to the next thing.', 'Gratitude turns ordinary minutes into proof that life is here.'],
  curious: ['Follow the question. It usually knows the hidden door.', 'Curiosity is momentum with wonder still attached.'],
  tired: ['Lower the hill. Keep the promise. Rest is part of the plan.', 'You can move gently and still move forward.'],
  stressed: ['Name the next step, not the whole mountain.', 'Pressure gets quieter when the work becomes specific.'],
  happy: ['Let joy be useful too. Build from the extra light.', 'This is worth remembering while it is still happening.'],
  low: ['No need to bloom on command. Just stay near the light.', 'A soft beginning is still a beginning.']
};

const dailyQuotes = [
  'Build a life that your future self recognizes as kindness.',
  'Small systems protect big dreams from ordinary chaos.',
  'Design your day like someone you love has to live inside it.'
];

const formatQuote = (quote: ApiQuote): string => {
  const author = quote.author?.trim();
  const work = quote.work?.trim();
  const suffix = [author, work].filter(Boolean).join(', ');
  return suffix ? `${quote.quote} — ${suffix}` : quote.quote;
};

const fetchApiQuote = async (endpoint: string, params?: Record<string, string>): Promise<string | null> => {
  try {
    const url = new URL(`${API_ROOT}/${endpoint}`);
    Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    if (!response.ok) return null;
    const data = (await response.json()) as ApiQuote[];
    const quote = Array.isArray(data) ? data[0] : null;
    return quote?.quote ? formatQuote(quote) : null;
  } catch {
    return null;
  }
};

const localMoodQuote = (mood: MoodName, avoidQuote?: string | null): string => {
  const quotes = quotesByMood[mood];
  let quote = quotes[Math.floor(Math.random() * quotes.length)];
  if (avoidQuote && quote === avoidQuote) quote = quotes[(quotes.indexOf(quote) + 1) % quotes.length];
  return quote;
};

export const getMoodQuote = async (mood: MoodName, avoidQuote?: string | null): Promise<string> => {
  const apiQuote = await fetchApiQuote('randomquotes', { categories: moodCategories[mood] });
  if (apiQuote && apiQuote !== avoidQuote) return apiQuote;
  return localMoodQuote(mood, avoidQuote);
};

export const getQuoteOfTheDay = async (): Promise<string> => {
  const apiQuote = await fetchApiQuote('quoteoftheday');
  if (apiQuote) return apiQuote;
  const key = new Date().toISOString().slice(0, 10);
  const index = key.split('').reduce((total, character) => total + character.charCodeAt(0), 0) % dailyQuotes.length;
  return dailyQuotes[index];
};
