/* 麥箖公司財產管理系統 - 核心引擎 v14.0 (視覺強化版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = [];
let currentFilter = 'ALL';
let signaturePad = null;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在連結麥箖雲端庫...</div>';
    await refreshData();
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');
    document.querySelector('.sidebar').classList.remove('active-sidebar');

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
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.toggle('active', `#${li.dataset.page}` === hash.split('/')[0]));
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
// 精華：資產列表 (具備簽名預覽與放大功能)
// ---------------------------------
function renderAssetList(main, title) {
    title.innerText = '資產清單管理';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:25px; flex-wrap:wrap; gap:15px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => {
        // 比對是否有簽名紀錄
        const latestSign = signData.find(s => s.item_ids.includes(a.asset_no));
        return `
                <div class="asset-card" style="display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                            <div class="asset-id">${a.asset_no}</div>
                            <div class="asset-name" style="margin:10px 0; font-size:1.2rem;">${a.name}</div>
                            <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary);">
                                <p>保管人: ${a.custodian}</p>
                                <p>地點: ${a.location || '-'}</p>
                            </div>
                        </div>
                        ${latestSign ? `<div class="card-sign-preview" onclick="window.previewSign('${latestSign.signature_img}')" title="點擊放大簽名">
                            <img src="${latestSign.signature_img}" style="width:80px; height:60px; background:white; border:2px solid #334155; border-radius:10px; padding:3px; object-fit:contain;">
                            <p style="font-size:0.6rem; text-align:center; color:var(--accent); margin-top:3px;">已點收</p>
                        </div>` : ''}
                    </div>
                    <div class="card-footer-actions" style="margin-top:auto; padding-top:20px; border-top:1px solid rgba(255,255,255,0.05); display:flex; gap:10px;">
                        <button class="btn-action edit-btn" style="flex:1;" onclick="window.location.hash='#edit/${a.id}'"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action" style="flex:1; color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>`;
    }).join('')}
        </div>
    `;
    safeCreateIcons();
}

window.previewSign = (img) => {
    const w = window.open("");
    w.document.write(`<body style='margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;'><img src='${img}' style='max-width:90%; border:5px solid #fff; background:#fff; box-shadow:0 0 50px rgba(255,255,255,0.2);'></body>`);
};

// ---------------------------------
// 手機/滑鼠 簽名引擎 (雙支援優化)
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:35px; text-align:center; display:flex; flex-direction:column;">
            <div style="margin-bottom:25px;">
                <h2>資產簽收確認</h2>
                <p style="color:var(--text-secondary);">${ids.join(', ')}</p>
            </div>
            <div style="background:white; border-radius:20px; flex-grow:1; display:flex; overflow:hidden;">
                <canvas id="sp" style="width:100%; height:100%; touch-action:none;"></canvas>
            </div>
            <div style="margin-top:20px; display:flex; gap:15px;">
                <button class="btn-outline" style="flex:1;" id="clearSign">重簽</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveBtn">本人確認送出</button>
            </div>
        </div>
    `;
    const canvas = document.getElementById('sp');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio; canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)', minWidth: 2, maxWidth: 4 });

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveBtn').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請先完成簽署"); return; }
        const b = document.getElementById('saveBtn'); b.innerText = '雲端存檔中...'; b.disabled = true;
        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: signaturePad.toDataURL() });
            alert("✅ 點收完成！"); window.location.href = './';
        } catch (e) { alert("上傳失敗"); b.innerText = '本人確認送出'; b.disabled = false; }
    };
}

// 其餘功能模組不變 ...
function renderDashboard(main, title) {
    title.innerText = '儀表板';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>在用資產</h3><p class="count">${assetsData.length}</p></div><div class="stat-card"><h3>報廢總數</h3><p class="count">${scrapData.length}</p></div><div class="stat-card"><h3>點收存單</h3><p class="count">${signData.length}</p></div></div>`;
}

function renderAddAsset(main, title) {
    title.innerText = '新增財產資產';
    main.innerHTML = `<div class="card"><h3>資產建檔</h3><div class="form-group"><label>類別</label><select id="nc"><option value="PC">PC</option><option value="NB">NB</option></select></div><div class="form-group"><label>品名</label><input type="text" id="nn"></div><div class="form-group"><label>保管人</label><input type="text" id="nu"></div><button class="btn-primary" id="sS" style="width:100%; justify-content:center; margin-top:20px;">儲存</button></div>`;
    document.getElementById('sS').onclick = async () => {
        const no = `ASSET${Date.now().toString().slice(-4)}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: document.getElementById('nc').value, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value });
        alert("成功！"); await refreshData(); window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯資產：${a.asset_no}</h3><input type="text" id="en" value="${a.name}"><button class="btn-primary" id="uB">儲存</button></div>`;
    document.getElementById('uB').onclick = async () => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("OK"); await refreshData(); window.location.hash = '#assets'; };
}

function renderScrapping(main, title) {
    title.innerText = '報廢資產清冊';
    main.innerHTML = `<div class="card">${scrapData.map(s => `<p>${s.asset_no} - ${s.name}</p>`).join('')}</div>`;
}

function renderSignHistory(main, title) {
    title.innerText = '手寫點收紀錄';
    main.innerHTML = `<div class="card">${signData.map(s => `<p>${s.item_ids} - <img src="${s.signature_img}" height="30"></p>`).join('')}</div>`;
}

function renderSignManager(main, title) {
    title.innerText = '產生點收連結';
    main.innerHTML = `<div class="card"><h3>資產清單</h3>${assetsData.map(a => `<p><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}</p>`).join('')}<button class="btn-primary" id="gB">建立網址</button><div id="uz" class="hidden"><code id="uv"></code></div></div>`;
    document.getElementById('gB').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden'); navigator.clipboard.writeText(url); alert("複製成功"); };
}

function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; handleRouting(); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
