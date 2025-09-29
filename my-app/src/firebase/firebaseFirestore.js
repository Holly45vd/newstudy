// src/firebase/firebaseFirestore.js
import { db } from "./firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const UNITS_COLLECTION = "units";

/* ===========================
   [READ] 모든 유닛 가져오기
=========================== */
export async function fetchUnits() {
  try {
    const querySnapshot = await getDocs(collection(db, UNITS_COLLECTION));
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error("[fetchUnits] Error:", error);
    throw error;
  }
}

/* ===========================
   [READ] 특정 유닛 가져오기
=========================== */
export async function fetchUnitById(id) {
  try {
    const docRef = doc(db, UNITS_COLLECTION, id.toString());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`[fetchUnitById] Unit not found: ${id}`);
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error(`[fetchUnitById] Error fetching unit ${id}:`, error);
    throw error;
  }
}

/* ===========================
   [CREATE] 신규 유닛 추가
   (덮어쓰기 포함)
=========================== */
export async function addUnit(unitId, data) {
  try {
    await setDoc(doc(db, UNITS_COLLECTION, unitId.toString()), data);
    console.log(`[addUnit] Unit ${unitId} created/overwritten successfully!`);
  } catch (error) {
    console.error(`[addUnit] Error creating unit ${unitId}:`, error);
    throw error;
  }
}

/* ===========================
   [UPDATE] 유닛 부분 업데이트
=========================== */
export async function updateUnit(unitId, data) {
  try {
    const docRef = doc(db, UNITS_COLLECTION, unitId.toString());
    await updateDoc(docRef, data);
    console.log(`[updateUnit] Unit ${unitId} updated successfully!`);
  } catch (error) {
    console.error(`[updateUnit] Error updating unit ${unitId}:`, error);
    throw error;
  }
}

/* ===========================
   [DELETE] 유닛 삭제
=========================== */
export async function deleteUnit(unitId) {
  try {
    await deleteDoc(doc(db, UNITS_COLLECTION, unitId.toString()));
    console.log(`[deleteUnit] Unit ${unitId} deleted successfully!`);
  } catch (error) {
    console.error(`[deleteUnit] Error deleting unit ${unitId}:`, error);
    throw error;
  }
}

/* ===========================
   [SAVE] 유닛 저장 (완전 덮어쓰기)
   - addUnit과 동일 기능 (호환용)
=========================== */
export async function saveUnit(unitId, data) {
  try {
    await setDoc(doc(db, UNITS_COLLECTION, unitId.toString()), data);
    console.log(`[saveUnit] Unit ${unitId} saved successfully!`);
  } catch (error) {
    console.error(`[saveUnit] Error saving unit ${unitId}:`, error);
    throw error;
  }
}
