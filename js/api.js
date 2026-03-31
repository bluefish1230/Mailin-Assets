// 麥箖公司財產清單 - Firebase 後端串接模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// ⚠️ 請填入您的 Firebase 專案設定 ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyCJxxNG3cYTRUfQ0Dr074RfPGDoJ91hD98", // 已填入您的 Key
    authDomain: "company-sign.firebaseapp.com",
    projectId: "company-sign",
    storageBucket: "company-sign.appspot.com",
    messagingSenderId: "您的發送者ID",
    appId: "您的APP_ID"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIREBASE_API = {
    // 取得所有資產
    async fetchAssets() {
        try {
            const q = query(collection(db, "assets"), orderBy("asset_no", "asc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (e) {
            console.error("Fetch Error:", e);
            throw e;
        }
    },

    // 新增資產
    async addAsset(assetData) {
        return await addDoc(collection(db, "assets"), assetData);
    },

    // 更新資產
    async updateAsset(docId, updateData) {
        const assetRef = doc(db, "assets", docId);
        return await updateDoc(assetRef, updateData);
    },

    // 刪除資產
    async deleteAsset(docId) {
        const assetRef = doc(db, "assets", docId);
        return await deleteDoc(assetRef);
    }
};

export default FIREBASE_API;
