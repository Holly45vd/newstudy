// src/firebase/firebaseAuth.js
import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

// 이메일 회원가입
export function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// 이메일 로그인
export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// 로그아웃
export function logout() {
  return signOut(auth);
}

// ✅ 구글 로그인
export function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}
