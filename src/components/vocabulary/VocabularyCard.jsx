// src/components/vocabulary/VocabularyCard.jsx — v2 (정규화 스키마 대응)
import React, { useState } from "react";

export default function VocabularyCard(props) {
  const [flipped, setFlipped] = useState(false);

  // ✅ props 정규화
  const zh = props.zh || props.hanzi || props.id || "";
  const pinyin = props.pinyin || "";
  const ko = props.ko || props.meaning || "";
  const pronunciationArr = Array.isArray(props.pronunciation)
    ? props.pronunciation
    : [];

  // pronunciation 배열에서 ko(한글발음) 우선 표시
  const koPron =
    pronunciationArr.find((p) => p?.label === zh && p.ko)?.ko ||
    pronunciationArr[0]?.ko ||
    props.koPronunciation ||
    "";

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="border rounded-lg shadow-md w-36 h-36 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-gray-50 transition-all duration-200"
    >
      {flipped ? (
        <div>
          <p className="text-lg font-bold">{ko}</p>
          {koPron && <p className="text-gray-500 text-sm">{koPron}</p>}
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold">{zh}</p>
          <p className="text-gray-600 text-sm">{pinyin}</p>
        </div>
      )}
    </div>
  );
}
