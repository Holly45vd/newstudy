// src/components/vocabulary/VocabularyCard.jsx
import React, { useState } from "react";

export default function VocabularyCard({ hanzi, pinyin, pronunciation, meaning }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="border rounded shadow-md w-32 h-32 flex items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition"
    >
      {flipped ? (
        <div>
          <p className="text-xl font-bold">{meaning}</p>
          <p className="text-gray-600 text-sm">{pronunciation}</p>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold">{hanzi}</p>
          <p className="text-gray-500">{pinyin}</p>
        </div>
      )}
    </div>
  );
}
