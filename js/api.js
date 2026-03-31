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
    // --- 資產 (Assets) ---
    async addAsset(data) {
        return await addDoc(collection(db, "assets"), data);
    },
    async fetchAssets() {
        const q = query(collection(db, "assets"), orderBy("asset_no", "asc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async updateAsset(id, data) {
        return await updateDoc(doc(db, "assets", id), data);
    },
    async deleteAsset(id) {
        return await deleteDoc(doc(db, "assets", id));
    },

    // --- 報廢 (Scrapping) ---
    async addScrap(data) {
        return await addDoc(collection(db, "scrapping"), { ...data, timestamp: new Date() });
    },
    async fetchScraps() {
        const q = query(collection(db, "scrapping"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // --- 簽名 (Signatures) ---
    async addSignature(data) {
        return await addDoc(collection(db, "signatures"), { ...data, timestamp: new Date() });
    },
    async fetchSignatures() {
        const q = query(collection(db, "signatures"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // --- 異動紀錄 (Transfers) ---
    async addTransfer(data) {
        return await addDoc(collection(db, "transfers"), { ...data, timestamp: new Date() });
    },
    async fetchTransfers() {
        const q = query(collection(db, "transfers"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};

export default FIREBASE_API;
