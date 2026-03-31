import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCJxxNG3cYTRUfQ0Dr074RfPGDoJ91hD98",
    authDomain: "company-sign.firebaseapp.com",
    projectId: "company-sign",
    storageBucket: "company-sign.firebasestorage.app",
    messagingSenderId: "990145383182",
    appId: "1:990145383182:web:35131a6a9e76d99381255f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIREBASE_API = {
    // --- 資產管理 (Assets) ---
    async addAsset(data) {
        try {
            const docRef = await addDoc(collection(db, "assets"), data);
            return docRef.id;
        } catch (e) { throw e; }
    },

    async fetchAssets() {
        try {
            const q = query(collection(db, "assets"), orderBy("asset_no", "asc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { throw e; }
    },

    async updateAsset(docId, data) {
        const assetRef = doc(db, "assets", docId);
        return await updateDoc(assetRef, data);
    },

    async deleteAsset(docId) {
        const assetRef = doc(db, "assets", docId);
        return await deleteDoc(assetRef);
    },

    // --- 報廢紀錄 (Scrapping) ---
    async addScrap(data) {
        try {
            await addDoc(collection(db, "scrapping"), {
                ...data,
                created_at: new Date()
            });
        } catch (e) { throw e; }
    },

    async fetchScraps() {
        try {
            const q = query(collection(db, "scrapping"), orderBy("created_at", "desc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { throw e; }
    }
};

export default FIREBASE_API;
