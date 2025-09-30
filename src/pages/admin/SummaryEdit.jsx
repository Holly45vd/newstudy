// src/pages/admin/SummaryEdit.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function SummaryEdit() {
  const { id } = useParams();
  const [summary, setSummary] = useState({ vocabulary: [], grammar: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      const docRef = doc(db, "units", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSummary(docSnap.data().summary || { vocabulary: [], grammar: [] });
      }
      setLoading(false);
    };
    fetchSummary();
  }, [id]);

  const handleArrayChange = (field, value) => {
    setSummary({ ...summary, [field]: value.split(",") });
  };

  const handleSave = async () => {
    const docRef = doc(db, "units", id);
    await updateDoc(docRef, { summary });
    alert("요약이 업데이트되었습니다!");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">요약 관리 (Unit {id})</h2>
      <div className="mb-4">
        <label className="block font-bold">단어 요약</label>
        <input
          className="border p-1 w-full"
          placeholder="단어 목록 (쉼표로 구분)"
          value={summary.vocabulary.join(",")}
          onChange={(e) => handleArrayChange("vocabulary", e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block font-bold">문법 요약</label>
        <input
          className="border p-1 w-full"
          placeholder="문법 목록 (쉼표로 구분)"
          value={summary.grammar.join(",")}
          onChange={(e) => handleArrayChange("grammar", e.target.value)}
        />
      </div>
      <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleSave}>
        저장
      </button>
    </div>
  );
}
