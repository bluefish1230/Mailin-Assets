/* 麥箖公司財產管理系統 - 核心引擎 v11.0 (資產簽收存證版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = []; // 儲存簽名紀錄
let currentFilter = 'ALL';
let signaturePad = null;

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在擷取麥箖專屬雲端庫...</div>';
    await refreshData();

    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    main.innerHTML = '<div class="loading">載入中...</div>';

    if (hash.startsWith('#sign/')) {
        renderSignMode(hash.replace('#sign/', '').split(','));
    } else if (hash.startsWith('#edit/')) {
        renderEditPage(hash.replace('#edit/', ''));
    } else {
        switch (hash) {
            case '#dashboard': renderDashboard(main, title); break;
            case '#assets': renderAssetList(main, title); break;
            case '#signature': renderSignManager(main, title); break;
            case '#scrapping': renderScrapping(main, title); break;
            case '#sign-history': renderSignHistory(main, title); break;
            case '#add-asset': renderAddAsset(main, title); break;
            default: renderDashboard(main, title);
        }
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.dataset.page}` === hash.split('/')[0]);
    });
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
        signData = await FIREBASE_API.fetchSignatures();
    } catch (e) { console.error(e); }
}

// ---------------------------------
// 管理端：查詢簽名紀錄頁面
// ---------------------------------
function renderSignHistory(main, title) {
    title.innerText = '資產點收簽名紀錄';
    main.innerHTML = `
        <div class="card">
            <h3>已簽署之數位點收單</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1.5rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #444; color:var(--text-secondary); text-align:left;">
                        <th style="padding:1rem;">簽署日期</th><th style="padding:1rem;">資產項目</th><th style="padding:1rem;">簽名預覽</th>
                    </tr></thead>
                    <tbody>
                        ${signData.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:3rem; opacity:0.3;">目前無簽署紀錄</td></tr>' :
            signData.map(s => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:1rem; font-size:0.9rem;">${s.timestamp.toDate ? s.timestamp.toDate().toLocaleString() : '-'}</td>
                                <td style="padding:1rem; font-weight:700; color:var(--accent);">${s.item_ids}</td>
                                <td style="padding:1rem;">
                                    <img src="${s.signature_img}" style="height:40px; background:white; border-radius:4px; padding:2px; cursor:pointer;" onclick="window.previewSign('${s.signature_img}')">
                                </td>
                            </tr>
                          `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.previewSign = (img) => {
    const w = window.open("");
    w.document.write(`<img src="${img}" style="width:100%; max-width:600px; border:1px solid #ccc; padding:20px;">`);
};

// ---------------------------------
// 手機端：執行簽名並存入雲端
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;">
             <h2>麥箖資產簽收</h2>
             <p style="color:var(--text-secondary); margin-bottom:20px;">編號：${ids.join(', ')}</p>
             <div style="background:white; border-radius:15px;"><canvas id="sp" style="width:100%; height:300px; touch-action:none;"></canvas></div>
             <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn-outline" style="flex:1;" id="clearSign">重新簽名</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveSign">確認並回傳雲端</button>
             </div>
        </div>
    `; e();
    const canvas = document.getElementById('sp');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio; canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)' });

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveSign').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請簽名！"); return; }
        const btn = document.getElementById('saveSign');
        btn.innerText = '正在上傳...'; btn.disabled = true;

        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: signaturePad.toDataURL() });
            alert("簽名已成功存入麥箖雲端庫！感謝您的點收。");
            window.location.href = './';
        } catch (e) { alert("上傳失敗：" + e.message); btn.innerText = '確認並回傳雲端'; btn.disabled = false; }
    };
}

// ---------------------------------
// 管理後台側邊欄調整
// ---------------------------------
function renderDashboard(main, title) {
    title.innerText = '系統總覽';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>在用資產</h3><p class="count">${assetsData.length}</p></div><div class="stat-card"><h3>報廢清冊</h3><p class="count">${scrapData.length}</p></div><div class="stat-card"><h3>簽名存證</h3><p class="count">${signData.length}</p></div></div>`;
}

// 其餘模組 (Assets, Scrapping, etc.) 沿用 v10.0 ...
function renderAssetList(main, title) {
    title.innerText = '財產管理';
    main.innerHTML = `<div class="asset-grid">${assetsData.map(a => `<div class="asset-card"><span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span><div class="asset-id">${a.asset_no}</div><div class="asset-name">${a.name}</div><div class="card-footer-actions"><button class="btn-action" onclick="window.location.hash='#edit/${a.id}'">編輯</button><button class="btn-action" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'">報廢</button></div></div>`).join('')}</div>`;
}

function renderAddAsset(main, title) {
    title.innerText = '新增財產';
    main.innerHTML = `<div class="card"><h3>輸入品名</h3><input type="text" id="an"><button class="btn-primary" id="s">儲存</button></div>`;
    document.getElementById('s').onclick = async () => { await FIREBASE_API.addAsset({ asset_no: 'PC' + Date.now(), name: document.getElementById('an').value, custodian: 'admin' }); alert("成功"); await refreshData(); window.location.hash = '#assets'; };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯：${a.asset_no}</h3><input type="text" id="en" value="${a.name}"><button class="btn-primary" id="u">更新</button></div>`;
    document.getElementById('u').onclick = async () => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("OK"); await refreshData(); window.location.hash = '#assets'; };
}

function renderScrapping(main, title) {
    title.innerText = '報廢清冊';
    main.innerHTML = `<div class="card"><h3>報廢列表</h3>${scrapData.map(s => `<p>${s.asset_no} - ${s.name}</p>`).join('')}</div>`;
}

function renderAddScrap(main, title) {
    const aid = sessionStorage.getItem('st');
    const a = assetsData.find(x => x.id === aid);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>將報廢：${a.asset_no}</h3><textarea id="sr"></textarea><button class="btn-primary" id="ds">確認報廢</button></div>`;
    document.getElementById('ds').onclick = async () => { await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: new Date().toISOString().split('T')[0] }); await FIREBASE_API.deleteAsset(aid); alert("已移出"); await refreshData(); window.location.hash = '#scrapping'; };
}

function renderSignManager(main, title) {
    title.innerText = '建立簽名連結';
    main.innerHTML = `<div class="card"><h3>點收勾選</h3>${assetsData.map(a => `<p><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}</p>`).join('')}<button class="btn-primary" id="g">建立</button><div id="uz" class="hidden"><code id="uv"></code></div></div>`;
    document.getElementById('g').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden'); navigator.clipboard.writeText(url); alert("已複製連結"); };
}

// 基礎功能
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle')); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
