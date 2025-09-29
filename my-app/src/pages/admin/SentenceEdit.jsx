// src/pages/admin/SentenceEdit.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function SentenceEdit() {
  const { id } = useParams();
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSentences = async () => {
      const docRef = doc(db, "units", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSentences(docSnap.data().sentences || []);
      }
      setLoading(false);
    };
    fetchSentences();
  }, [id]);

  const handleChange = (index, field, value) => {
    const updated = [...sentences];
    updated[index][field] = value;
    setSentences(updated);
  };

  const handleAdd = () => {
    setSentences([...sentences, { chinese: "", pinyin: "", pronunciation: "", meaning: "" }]);
  };

  const handleDelete = (index) => {
    setSentences(sentences.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const docRef = doc(db, "units", id);
    await updateDoc(docRef, { sentences });
    alert("대표 문장이 업데이트되었습니다!");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">대표문장 관리 (Unit {id})</h2>
      {sentences.map((item, index) => (
        <div key={index} className="grid grid-cols-5 gap-2 mb-2">
          <input className="border p-1" placeholder="중국어" value={item.chinese} onChange={(e) => handleChange(index, "chinese", e.target.value)} />
          <input className="border p-1" placeholder="Pinyin" value={item.pinyin} onChange={(e) => handleChange(index, "pinyin", e.target.value)} />
          <input className="border p-1" placeholder="발음" value={item.pronunciation} onChange={(e) => handleChange(index, "pronunciation", e.target.value)} />
          <input className="border p-1" placeholder="뜻" value={item.meaning} onChange={(e) => handleChange(index, "meaning", e.target.value)} />
          <button className="bg-red-500 text-white px-2 rounded" onClick={() => handleDelete(index)}>삭제</button>
        </div>
      ))}
      <button className="bg-green-500 text-white px-3 py-1 mr-2 rounded" onClick={handleAdd}>추가</button>
      <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleSave}>저장</button>
    </div>
  );
}
