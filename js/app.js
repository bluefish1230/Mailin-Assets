/* 麥箖公司財產管理系統 - 核心引擎 v12.0 (簽名穩定修正版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = [];
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
// 手機簽名主引擎 (修復 v11.0 語法錯誤 e();)
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;">
             <h2>麥箖資產簽收確認</h2>
             <p style="color:var(--text-secondary); margin-bottom:20px;">資產編號：${ids.join(', ')}</p>
             <div style="background:white; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.5);"><canvas id="sp" style="width:100%; height:320px; touch-action:none;"></canvas></div>
             <div style="margin-top:20px; display:flex; gap:12px;">
                <button class="btn-outline" style="flex:1;" id="clearSign">清除(重簽)</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveSign">簽完送出雲端庫</button>
             </div>
        </div>
    `;

    const canvas = document.getElementById('sp');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)' });

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveSign').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請先完成您的簽署！"); return; }
        const btn = document.getElementById('saveSign');
        btn.innerText = '正在傳送...'; btn.disabled = true;

        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: signaturePad.toDataURL() });
            alert("✅ 點收成功！簽名已存入雲端存證。");
            window.location.href = './';
        } catch (e) { alert("上傳失敗：" + e.message); btn.innerText = '簽完送出'; btn.disabled = false; }
    };
}

// ---------------------------------
// 管理功能清單 (完整版)
// ---------------------------------
function renderSignHistory(main, title) {
    title.innerText = '點收紀錄查詢';
    main.innerHTML = `
        <div class="card">
            <h3>已簽署電子存證清單</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #444; text-align:left; color:var(--text-secondary); opacity:0.6;"><th style="padding:10px;">時間</th><th style="padding:10px;">資產編號</th><th style="padding:10px;">簽名影像</th></tr></thead>
                    <tbody>
                        ${signData.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:2rem; opacity:0.3;">目前無簽收紀錄</td></tr>' :
            signData.map(s => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); cursor:default;">
                                <td style="padding:10px; font-size:0.85rem;">${s.timestamp.toDate ? s.timestamp.toDate().toLocaleString() : '-'}</td>
                                <td style="padding:10px; color:var(--accent); font-weight:700;">${s.item_ids}</td>
                                <td style="padding:10px;"><img src="${s.signature_img}" style="height:35px; background:white; border-radius:4px; cursor:zoom-in;" onclick="window.preview('${s.signature_img}')"></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.preview = (src) => { const w = window.open(""); w.document.write(`<body style='margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;'><img src='${src}' style='max-width:90%;border:2px solid #fff;padding:20px;background:#fff;'></body>`); };

function renderDashboard(main, title) {
    title.innerText = '系統概況';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>在用資產</h3><p class="count">${assetsData.length}</p></div><div class="stat-card"><h3>報廢歷程</h3><p class="count">${scrapData.length}</p></div><div class="stat-card"><h3>簽名存單</h3><p class="count">${signData.length}</p></div></div>`;
}

function renderAssetList(main, title) {
    title.innerText = '資產清單';
    main.innerHTML = `
        <div class="list-header-actions" style="margin-bottom:20px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">${assetsData.filter(a => currentFilter === 'ALL' || a.category === currentFilter).map(a => `<div class="asset-card">
            <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
            <div class="asset-id">${a.asset_no}</div>
            <div class="asset-name">${a.name}</div>
            <p style="font-size:0.8rem; opacity:0.6;">保管人: ${a.custodian}</p>
            <div class="card-footer-actions">
                <button class="btn-action edit-btn" onclick="window.location.hash='#edit/${a.id}'"><i data-lucide="edit-3"></i><span>編輯</span></button>
                <button class="btn-action" style="color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
            </div>
        </div>`).join('')}</div>
    `;
    safeCreateIcons();
}

function renderAddAsset(main, title) {
    title.innerText = '新增資產紀錄';
    main.innerHTML = `<div class="card"><h3>輸入新品</h3><div class="form-group"><label>類別</label><select id="nc"><option value="PC">PC</option><option value="NB">NB</option></select></div><div class="form-group"><label>品名</label><input type="text" id="nn"></div><div class="form-group"><label>保管人</label><input type="text" id="nu"></div><button class="btn-primary" id="sS" style="width:100%; justify-content:center;">儲存至雲端</button></div>`;
    document.getElementById('sS').onclick = async () => {
        const no = `PC${Date.now().toString().slice(-4)}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: document.getElementById('nc').value, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value });
        alert("成功！"); await refreshData(); window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯：${a.asset_no}</h3><input type="text" id="en" value="${a.name}"><button class="btn-primary" id="upB">儲存更新</button></div>`;
    document.getElementById('upB').onclick = async () => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("已更新！"); await refreshData(); window.location.hash = '#assets'; };
}

function renderScrapping(main, title) {
    title.innerText = '報廢清冊';
    main.innerHTML = `<div class="card"><h3>雲端檔案</h3>${scrapData.map(s => `<p>${s.asset_no} - ${s.name}</p>`).join('')}</div>`;
}

function renderAddScrap(main, title) {
    const a = assetsData.find(x => x.id === sessionStorage.getItem('st'));
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>報廢：${a.asset_no}</h3><textarea id="sr" placeholder="原因"></textarea><button id="fS" class="btn-primary" style="background:var(--danger);">確認報廢</button></div>`;
    document.getElementById('fS').onclick = async () => { await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: new Date().toISOString().split('T')[0] }); await FIREBASE_API.deleteAsset(a.id); alert("完成"); await refreshData(); window.location.hash = '#scrapping'; };
}

function renderSignManager(main, title) {
    title.innerText = '建立簽名網址';
    main.innerHTML = `<div class="card"><h3>勾選資產</h3>${assetsData.map(a => `<label style="display:block;margin:10px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}</label>`).join('')}<button class="btn-primary" id="gB">產出網址</button><div id="uz" class="hidden"><code id="uv"></code></div></div>`;
    document.getElementById('gB').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden'); navigator.clipboard.writeText(url); alert("已複製連結"); };
}

// 通用 (不變)
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle')); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
