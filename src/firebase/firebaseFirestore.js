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
  serverTimestamp, // ✅ 추가
} from "firebase/firestore";

/* ================= UNITS (기존 유지) ================ */
const UNITS_COLLECTION = "units";


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

/* =============== EVERYDAY (일일 단어) =================
 * 구조: everyday_days/{date}/words/{zh}
 * ==================================================== */
const EVERYDAY_DAYS = "everyday_days";

/** [UPSERT] 단어 저장(같은 zh면 덮어쓰기) + 상위 날짜 문서 보장 */
export async function upsertEverydayWord(date, word) {
  if (!date) throw new Error("date(YYYY-MM-DD)가 필요합니다.");
  if (!word?.zh) throw new Error("word.zh(중국어 단어)가 필요합니다.");

  // ✅ 상위 날짜 문서 생성/갱신(목록 스캔 가능하도록)
  await setDoc(
    doc(db, EVERYDAY_DAYS, date),
    { date, updatedAt: serverTimestamp() },
    { merge: true }
  );

  const ref = doc(db, EVERYDAY_DAYS, date, "words", String(word.zh));
  await setDoc(ref, word, { merge: true });
}

/** [READ] 특정 날짜의 단어 전체 */
export async function listEverydayWordsByDate(date) {
  if (!date) throw new Error("date(YYYY-MM-DD)가 필요합니다.");
  const snap = await getDocs(collection(db, EVERYDAY_DAYS, date, "words"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** [READ] 날짜별 그룹 전체 조회 (최신 날짜 우선 정렬) */
export async function listEverydayWordsGroupedByDate() {
  const daysSnap = await getDocs(collection(db, EVERYDAY_DAYS));
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

/** [DELETE] 단어 삭제 */
export async function deleteEverydayWord(date, zh) {
  if (!date || !zh) throw new Error("date와 zh가 필요합니다.");
  await deleteDoc(doc(db, EVERYDAY_DAYS, date, "words", String(zh)));
}

/** [BULK UPSERT] 여러 날짜/단어 일괄 업로드 */
export async function importEverydayGroupsBulk(groups) {
  if (!Array.isArray(groups)) throw new Error("groups 배열이 필요합니다.");

  let batch = writeBatch(db);
  let count = 0;
  const commitNow = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const g of groups) {
    if (!g?.date || !Array.isArray(g.words)) continue;

    // ✅ 상위 날짜 문서 보장
    batch.set(
      doc(db, EVERYDAY_DAYS, g.date),
      { date: g.date, updatedAt: serverTimestamp() },
      { merge: true }
    );
    count++;

    for (const w of g.words) {
      if (!w?.zh) continue;
      const ref = doc(db, EVERYDAY_DAYS, g.date, "words", String(w.zh));
      batch.set(ref, w, { merge: true });
      count++;
      if (count >= 450) await commitNow();
    }
  }
  await commitNow();
}

/** [REPLACE] 하루치 전체 교체(추가/수정 + 미포함 항목 삭제) */
export async function replaceEverydayDateWords(date, words) {
  if (!date) throw new Error("date가 필요합니다.");
  if (!Array.isArray(words)) throw new Error("words 배열이 필요합니다.");

  const curSnap = await getDocs(collection(db, EVERYDAY_DAYS, date, "words"));
  const currentIds = new Set(curSnap.docs.map((d) => d.id));
  const incoming = words.filter((w) => w && w.zh);
  const incomingIds = new Set(incoming.map((w) => String(w.zh)));

  let batch = writeBatch(db);
  let count = 0;
  const commitNow = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  // ✅ 상위 날짜 문서 보장
  batch.set(
    doc(db, EVERYDAY_DAYS, date),
    { date, updatedAt: serverTimestamp() },
    { merge: true }
  );
  count++;

  // upsert
  for (const w of incoming) {
    const ref = doc(db, EVERYDAY_DAYS, date, "words", String(w.zh));
    batch.set(ref, w, { merge: true });
    count++;
    if (count >= 450) await commitNow();
  }
  // delete
  for (const id of currentIds) {
    if (!incomingIds.has(id)) {
      batch.delete(doc(db, EVERYDAY_DAYS, date, "words", id));
      count++;
      if (count >= 450) await commitNow();
    }
  }
  await commitNow();
}


/** [READ] 날짜 무시하고 모든 단어 평면 조회 */
export async function listEverydayWordsFlat() {
  // 모든 날짜의 subcollection 'words'를 한 번에
  const snap = await getDocs(collectionGroup(db, "words"));
  // 각 문서의 상위(=words)의 상위가 날짜 문서
  return snap.docs.map((d) => ({
    id: d.id,
    date: d.ref.parent.parent?.id ?? "", // "YYYY-MM-DD"
    ...d.data(),
  }));
}