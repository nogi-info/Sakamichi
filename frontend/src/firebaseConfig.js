/* global __app_id, __initial_auth_token, __firebase_config */
// 上記の行を追加することで、ESLintにこれらの変数がグローバルであることを伝えます。

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Canvas環境から提供されるグローバル変数を使用
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 匿名認証を行う関数 (必要に応じてコンポーネント内で呼び出す)
export async function initializeFirebaseAndAuth() {
  try {
    if (typeof __initial_auth_token !== 'undefined') {
      // Canvas環境で提供されるトークンがあればそれを使用
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log("Signed in with custom token from Canvas.");
    } else {
      // それ以外の場合は匿名認証
      await signInAnonymously(auth);
      console.log("Signed in anonymously.");
    }
    const userId = auth.currentUser?.uid || crypto.randomUUID(); // 現在のユーザーIDを取得
    console.log("Firebase initialized. User ID:", userId);
    return { db, auth, userId };
  } catch (error) {
    console.error("Firebase initialization or authentication failed:", error);
    // エラーハンドリング
    throw error;
  }
}

export { db, auth, appId }; // 他のコンポーネントでFirestoreインスタンスなどを使えるようにエクスポート