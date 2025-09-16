"use client";

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handlePlayClick = () => {
    router.push('/play');
  };
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl text-white mb-4" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
          Jet Lagged
        </h1>
        <p className="text-xl text-white mb-6" style={{ fontFamily: "'Rubik', sans-serif" }}>
          AI Game Inspired by Jet Lag: Hide <span className="text-gray-300">+</span> Seek
        </p>
        <button
          className="px-6 py-2 border border-white text-white text-sm hover:bg-white hover:text-black transition-colors duration-200"
          style={{ fontFamily: "'Rubik', sans-serif", borderRadius: '5%' }}
          onClick={handlePlayClick}
        >
          Play
        </button>
      </div>
    </div>
  );
}
