// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase 콘솔에서 가져온 설정
const firebaseConfig = {
  apiKey: "AIzaSyCtu7U6oAplL9-yL8zfov8b208s7wTeAXc",
  authDomain: "studynote-8c150.firebaseapp.com",
  projectId: "studynote-8c150",
  storageBucket: "studynote-8c150.firebasestorage.app",
  messagingSenderId: "754481466909",
  appId: "1:754481466909:web:cb131025ce5d550f7640f4",
  measurementId: "G-7WZP2H1Y34",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 각 서비스 초기화
export const auth = getAuth(app);        // 로그인 관련
export const db = getFirestore(app);     // Firestore
export const storage = getStorage(app);  // Storage (이미지, 오디오 저장)

// 기본 앱 export
export default app;
