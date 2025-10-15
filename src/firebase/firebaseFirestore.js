import { db } from "./firebaseConfig";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  where,
  documentId,
} from "firebase/firestore";

/* ================= UNITS (기존 유지) ================ */
const UNITS_COLLECTION = "units";

/* ================= NEW: WORDS / DAILIES ============ */
const WORDS_COLLECTION = "words";
const DAILIES_COLLECTION = "dailies"; // ex) dailies/{YYYY-MM-DD} = { date, wordIds: [...] }

/* -------------------- 공통 유틸 --------------------- */
function coerceArray(a) {
  if (!a) return [];
  return Array.isArray(a) ? a : [a];
}

/** 키 보정: sentencePron → sentenceKoPronunciation, extensions[].pron → koPron */
function fixWordSchema(word) {
  const w = { ...(word || {}) };

  // 최상단 문장 한국어 발음 키 통일
  if (w.sentenceKoPronunciation == null && w.sentencePron != null) {
    w.sentenceKoPronunciation = w.sentencePron;
  }

  // 확장 예문 발음 키 통일
  if (Array.isArray(w.extensions)) {
    w.extensions = w.extensions.map((e) => {
      const ex = { ...(e || {}) };
      if (ex.koPron == null && ex.pron != null) ex.koPron = ex.pron;
      return ex;
    });
  }

  return w;
}

/** in 쿼리 chunking (30개 씩 안전 범위) */
function chunk(arr, size = 30) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ================= UNITS CRUD ====================== */
export async function fetchUnits() {
  const qs = await getDocs(collection(db, UNITS_COLLECTION));
  return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchUnitById(id) {
  const ref = doc(db, UNITS_COLLECTION, String(id));
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addUnit(unitId, data) {
  await setDoc(doc(db, UNITS_COLLECTION, String(unitId)), data);
}

export async function updateUnit(unitId, data) {
  await updateDoc(doc(db, UNITS_COLLECTION, String(unitId)), data);
}

export async function deleteUnit(unitId) {
  await deleteDoc(doc(db, UNITS_COLLECTION, String(unitId)));
}

export async function saveUnit(unitId, data) {
  await setDoc(doc(db, UNITS_COLLECTION, String(unitId)), data);
}

/* =============== WORDS (정규화 스키마) ============== */

/** 단어 1개 upsert (wordId 권장: zh 또는 고유 slug) */
export async function upsertWord(wordId, wordData) {
  if (!wordId) throw new Error("wordId가 필요합니다.");
  const fixed = fixWordSchema(wordData || {});
  await setDoc(
    doc(db, WORDS_COLLECTION, String(wordId)),
    {
      ...fixed,
      meta: { ...(fixed.meta || {}), updatedAt: serverTimestamp() },
    },
    { merge: true }
  );
}

/** 단어 삭제 */
export async function deleteWord(wordId) {
  await deleteDoc(doc(db, WORDS_COLLECTION, String(wordId)));
}

/** 여러 ID로 단어 일괄 조회 (요청 순서 유지) */
export async function fetchWordsByIds(ids = []) {
  const list = coerceArray(ids).map(String).filter(Boolean);
  if (!list.length) return [];
  const pos = Object.fromEntries(list.map((x, i) => [x, i]));
  const out = [];

  for (const ch of chunk(list, 30)) {
    const qs = await getDocs(
      // firestore: where(documentId(), "in", [...])
      (await import("firebase/firestore")).query(
        collection(db, WORDS_COLLECTION),
        where(documentId(), "in", ch)
      )
    );
    out.push(...qs.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  return out.sort((a, b) => (pos[a.id] ?? 0) - (pos[b.id] ?? 0));
}

/* =============== UNITS ⟷ WORDS 관계 ================ */

/** 유닛의 단어 참조를 주어진 ID 배열로 설정(치환) */
export async function attachWordsToUnit(unitId, wordIds = []) {
  await updateDoc(doc(db, UNITS_COLLECTION, String(unitId)), {
    vocabIds: Array.from(new Set(coerceArray(wordIds).map(String))),
  });
}

/** 유닛에 단어 ID 추가(중복 제거) */
export async function addWordIdsToUnit(unitId, addIds = []) {
  const ref = doc(db, UNITS_COLLECTION, String(unitId));
  const snap = await getDoc(ref);
  const cur = snap.exists() ? coerceArray(snap.data().vocabIds) : [];
  const next = Array.from(new Set([...cur.map(String), ...coerceArray(addIds).map(String)]));
  await updateDoc(ref, { vocabIds: next });
}

/** 유닛에서 단어 ID 제거 */
export async function removeWordIdFromUnit(unitId, wordId) {
  const ref = doc(db, UNITS_COLLECTION, String(unitId));
  const snap = await getDoc(ref);
  const cur = snap.exists() ? coerceArray(snap.data().vocabIds) : [];
  await updateDoc(ref, { vocabIds: cur.filter((x) => String(x) !== String(wordId)) });
}

/* ================== DAILIES (매일 단어) ============== */

/** 하루 단어 ID 배열을 통째로 설정 */
export async function setDailyWords(date, wordIds = []) {
  if (!date) throw new Error("date(YYYY-MM-DD)가 필요합니다.");
  await setDoc(
    doc(db, DAILIES_COLLECTION, date),
    {
      date,
      wordIds: Array.from(new Set(coerceArray(wordIds).map(String))),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 특정 날짜 문서 읽기 */
export async function getDaily(date) {
  const snap = await getDoc(doc(db, DAILIES_COLLECTION, String(date)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** 모든 날짜 목록(최신 우선) */
export async function listDailies() {
  const qs = await getDocs(collection(db, DAILIES_COLLECTION));
  return qs.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ===== 하위호환: 기존 everyday_days 기반 함수들 대체 구현 =====
   (앱의 다른 파일들이 기존 API를 import하더라도 새 구조로 동작) */

/** [UPSERT] (구 API) 특정 날짜에 단어 객체 upsert → /words 저장 후 그 ID를 dailies에 연결 */
export async function upsertEverydayWord(date, word) {
  if (!date) throw new Error("date가 필요합니다.");
  const w = fixWordSchema(word || {});
  const wordId = String(w.id || w.zh);
  if (!wordId) throw new Error("word.id 또는 word.zh가 필요합니다.");

  await upsertWord(wordId, w);

  // 날짜 문서의 wordIds에 포함시킴
  const d = await getDaily(date);
  const cur = d?.wordIds || [];
  if (!cur.includes(wordId)) {
    await setDailyWords(date, [...cur, wordId]);
  } else {
    // 그래도 updatedAt 반영
    await setDailyWords(date, cur);
  }
}

/** [READ] (구 API) 특정 날짜의 단어 전체 */
export async function listEverydayWordsByDate(date) {
  if (!date) throw new Error("date(YYYY-MM-DD)가 필요합니다.");
  // 신 스키마 우선
  const d = await getDaily(date);
  if (d && Array.isArray(d.wordIds) && d.wordIds.length) {
    const words = await fetchWordsByIds(d.wordIds);
    return words.map((w) => ({ id: w.id, ...w }));
  }

  // 폴백: 구 스키마 everyday_days/{date}/words/*
  const wordsSnap = await getDocs(collection(db, "everyday_days", date, "words"));
  const legacy = wordsSnap.docs.map((w) => ({ id: w.id, ...w.data() }));
  return legacy;
}

/** [READ] (구 API) 날짜별 그룹 전체 조회 (최신 날짜 우선 정렬) */
export async function listEverydayWordsGroupedByDate() {
  // 신 스키마 우선
  const groups = await listDailies(); // [{ date, wordIds }]
  if (groups.length) {
    const out = [];
    for (const g of groups) {
      const words = await fetchWordsByIds(g.wordIds || []);
      out.push({ date: g.date, words: words.map((w) => ({ id: w.id, ...w })) });
    }
    return out;
  }

  // 폴백: 구 스키마
  const daysSnap = await getDocs(collection(db, "everyday_days"));
  const result = [];
  for (const d of daysSnap.docs) {
    const wordsSnap = await getDocs(collection(d.ref, "words"));
    result.push({
      date: d.id,
      words: wordsSnap.docs.map((w) => ({ id: w.id, ...w.data() })),
    });
  }
  result.sort((a, b) => (a.date < b.date ? 1 : -1));
  return result;
}

/** [DELETE] (구 API) 단어 삭제: 날짜에서 연결만 제거(단어 자체는 /words에 남김) */
export async function deleteEverydayWord(date, zhOrId) {
  if (!date || !zhOrId) throw new Error("date와 zh(or id)가 필요합니다.");
  const d = await getDaily(date);
  if (d && Array.isArray(d.wordIds)) {
    const next = d.wordIds.filter((x) => String(x) !== String(zhOrId));
    await setDailyWords(date, next);
    return;
  }
  // 구 스키마 문서 삭제
  await deleteDoc(doc(db, "everyday_days", date, "words", String(zhOrId)));
}

/** [BULK UPSERT] (구 API) 여러 날짜/단어 일괄 업로드 */
export async function importEverydayGroupsBulk(groups) {
  if (!Array.isArray(groups)) throw new Error("groups 배열이 필요합니다.");

  let batch = writeBatch(db);
  let count = 0;
  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const g of groups) {
    if (!g?.date || !Array.isArray(g.words)) continue;

    const wordIds = [];
    for (const raw of g.words) {
      const w = fixWordSchema(raw || {});
      const wordId = String(w.id || w.zh);
      if (!wordId) continue;
      await upsertWord(wordId, w); // 단어 저장(순차)
      wordIds.push(wordId);
    }

    // 날짜 문서 저장(배치)
    batch.set(
      doc(db, DAILIES_COLLECTION, g.date),
      {
        date: g.date,
        wordIds: Array.from(new Set(wordIds)),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    count++;
    if (count >= 450) await flush();
  }
  await flush();
}

/** [REPLACE] (구 API) 하루치 전체 교체(추가/수정 + 미포함 삭제) */
export async function replaceEverydayDateWords(date, words) {
  if (!date) throw new Error("date가 필요합니다.");
  if (!Array.isArray(words)) throw new Error("words 배열이 필요합니다.");

  // 단어 upsert
  const ids = [];
  for (const raw of words) {
    const w = fixWordSchema(raw || {});
    const wordId = String(w.id || w.zh);
    if (!wordId) continue;
    await upsertWord(wordId, w);
    ids.push(wordId);
  }
  // 날짜에 세팅(미포함은 자동 제거)
  await setDailyWords(date, Array.from(new Set(ids)));
}

/** [READ] 날짜 무시하고 모든 단어 평면 조회
 *  새 구조 우선(dailies → wordIds 펼치기) + 구 스키마 폴백(collectionGroup("words"))
 */
export async function listEverydayWordsFlat() {
  // 1) 새 구조: dailies/{date}.wordIds → words
  const groups = await listDailies();
  if (groups.length) {
    const out = [];
    for (const g of groups) {
      const ids = g.wordIds || [];
      if (!ids.length) continue;
      const words = await fetchWordsByIds(ids);
      for (const w of words) {
        out.push({ id: w.id, date: g.date, ...w });
      }
    }
    return out;
  }

  // 2) 폴백: 구 스키마 — everyday_days/{date}/words/*
  const snap = await getDocs(collectionGroup(db, "words"));
  return snap.docs.map((d) => ({
    id: d.id,
    date: d.ref.parent.parent?.id ?? "",
    ...d.data(),
  }));
}

// === MIGRATION HELPERS: old -> new schema ===============================
// old everyday: everyday_days/{date}/words/{zh}
// new: /words/{id}, /dailies/{date} {wordIds:[]}
// unit: old unit.vocabulary(array of objects) -> new unit.vocabIds(array of ids)

// 공통 노말라이저 (키 보정)
function normalizeWord(raw = {}) {
  const w = { ...raw };

  // id/zh 정규화
  w.zh = String(w.zh || w.hanzi || w.id || "").trim();
  if (!w.zh) throw new Error("normalizeWord: zh/hanzi/id 중 하나는 필수");

  // 최상단 필드
  w.pinyin = String(w.pinyin || "").trim();
  w.ko = String(w.ko || w.meaning || "").trim();
  w.pos = String(w.pos || "").trim();
  w.tags = Array.isArray(w.tags) ? w.tags : [];

  // 예문
  w.sentence = String(w.sentence || w.exampleZh || w.example_zh || "").trim();
  w.sentencePinyin = String(w.sentencePinyin || w.examplePy || w.example_pinyin || "").trim();
  w.sentenceKo = String(w.sentenceKo || w.exampleKo || w.example_ko || "").trim();
  if (w.sentenceKoPronunciation == null && w.sentencePron != null) {
    w.sentenceKoPronunciation = w.sentencePron;
  }

  // 확장 예문
  if (Array.isArray(w.extensions)) {
    w.extensions = w.extensions.map((e) => ({
      zh: String(e?.zh || "").trim(),
      pinyin: String(e?.pinyin || "").trim(),
      ko: String(e?.ko || "").trim(),
      koPron: String(e?.koPron ?? e?.koPronunciation ?? e?.pron ?? "").trim(),
    }));
  } else {
    w.extensions = [];
  }

  // 문법
  w.grammar = Array.isArray(w.grammar)
    ? w.grammar.map((g) => ({
        term: String(g?.term || "").trim(),
        pinyin: String(g?.pinyin || "").trim(),
        pron: String(g?.pron || "").trim(),
        desc: String(g?.desc || "").trim(),
        structure: String(g?.structure || "").trim(),
        note: String(g?.note || "").trim(),
      }))
    : [];

  // 핵심 포인트
  w.keyPoints = Array.isArray(w.keyPoints) ? w.keyPoints.map((k) => String(k || "").trim()) : [];

  // 발음 표
  if (Array.isArray(w.pronunciation_items) && !Array.isArray(w.pronunciation)) {
    w.pronunciation = w.pronunciation_items;
  }
  w.pronunciation = Array.isArray(w.pronunciation)
    ? w.pronunciation.map((p) => ({
        label: String(p?.label || "").trim(),
        pinyin: String(p?.pinyin || "").trim(),
        ko: String(p?.ko || "").trim(),
        tone: String(p?.tone || "").trim(),
      }))
    : [];

  return {
    id: w.zh, // 문서 ID로 사용
    ...w,
  };
}

// === 1) everyday_days -> /words + /dailies 마이그레이션 ===
export async function migrateEverydayOldToNew() {
  const daysSnap = await getDocs(collection(db, "everyday_days"));
  let batch = writeBatch(db);
  let count = 0;
  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const dayDoc of daysSnap.docs) {
    const date = dayDoc.id; // YYYY-MM-DD
    const wordsCol = collection(db, "everyday_days", date, "words");
    const wordsSnap = await getDocs(wordsCol);

    const wordIds = [];

    for (const wDoc of wordsSnap.docs) {
      const raw = wDoc.data();
      const norm = normalizeWord(raw);
      const wid = String(norm.id);

      // /words upsert
      batch.set(doc(db, "words", wid), { ...norm, updatedAt: serverTimestamp() }, { merge: true });
      count++; wordIds.push(wid);
      if (count >= 450) await flush();
    }

    // /dailies/{date}
    batch.set(
      doc(db, "dailies", date),
      { date, wordIds: Array.from(new Set(wordIds)), updatedAt: serverTimestamp() },
      { merge: true }
    );
    count++;
    if (count >= 450) await flush();
  }

  await flush();
  return { ok: true };
}

// === 2) unit.vocabulary -> unit.vocabIds 마이그레이션 ===
export async function migrateUnitVocabularyToIds() {
  const qs = await getDocs(collection(db, "units"));
  let batch = writeBatch(db);
  let count = 0;
  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const u of qs.docs) {
    const unitId = u.id;
    const data = u.data() || {};
    const vocab = Array.isArray(data.vocabulary) ? data.vocabulary : [];
    if (!vocab.length) continue;

    const ids = [];
    for (const item of vocab) {
      try {
        const norm = normalizeWord(item);
        const wid = String(norm.id);
        // /words upsert
        batch.set(doc(db, "words", wid), { ...norm, updatedAt: serverTimestamp() }, { merge: true });
        count++; ids.push(wid);
        if (count >= 450) await flush();
      } catch (e) {
        console.warn(`unit ${unitId} 단어 스킵:`, e?.message);
      }
    }

    // unit 갱신: vocabIds 설정
    batch.set(
      doc(db, "units", unitId),
      { vocabIds: Array.from(new Set(ids)), updatedAt: serverTimestamp() },
      { merge: true }
    );
    count++;
    if (count >= 450) await flush();
  }

  await flush();
  return { ok: true };
}

// === 3) (선택) old 컬렉션 정리 도우미 ===
export async function dropOldEverydayCollections() {
  // ⚠️ 정말 필요할 때만 사용. 삭제는 되돌릴 수 없음.
  // 여기서는 루트 날짜 문서만 삭제(하위 words 서브컬렉션은 콘솔에서 일괄 삭제 권장)
  const daysSnap = await getDocs(collection(db, "everyday_days"));
  for (const d of daysSnap.docs) {
    await deleteDoc(doc(db, "everyday_days", d.id));
  }
  return { ok: true };
}
// ===== ONE-SHOT SEED: words + dailies + unit link ==================
export async function seedDailyBundle({ date, words = [], unitId = null }) {
  if (!date) throw new Error("date(YYYY-MM-DD)가 필요합니다.");
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error("words 배열이 비어 있습니다.");
  }

  // 1) 단어 upsert
  const wordIds = [];
  for (const raw of words) {
    const w = fixWordSchema(raw || {});
    const id = String(w.id || w.zh || w.hanzi || "").trim();
    if (!id) throw new Error("각 단어는 zh/hanzi/id 중 하나가 필요합니다.");
    await upsertWord(id, w);
    wordIds.push(id);
  }

  // 2) dailies/{date} 에 묶기
  await setDailyWords(date, wordIds);

  // 3) unitId가 오면 unit.vocabIds 연결(추가 병합)
  if (unitId != null) {
    await addWordIdsToUnit(String(unitId), wordIds);
  }

  return { ok: true, date, wordIds, unitId };
}
