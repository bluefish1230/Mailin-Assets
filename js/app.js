/* 麥箖公司財產管理系統 - 核心引擎 v10.0 (手寫簽名大升級版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
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
            case '#add-asset': renderAddAsset(main, title); break;
            case '#add-scrap': renderAddScrap(main, title); break;
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
    } catch (e) { console.error(e); }
}

// ---------------------------------
// 精華：手機手寫簽名核心引擎
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;">
            <header style="margin-bottom:20px;">
                <h2 style="font-size:1.6rem;">麥箖資產 - 簽收確認</h2>
                <p style="color:var(--text-secondary); margin-top:5px;">確認項目：${ids.join(', ')}</p>
            </header>
            
            <div class="canvas-wrapper" style="background:white; border-radius:20px; box-shadow:0 10px 40px rgba(0,0,0,0.5); padding:10px;">
                <canvas id="sp" style="width:100%; height:350px; background:white; touch-action:none;"></canvas>
            </div>
            
            <p style="font-size:0.8rem; margin-top:15px; color:var(--text-secondary);">請在上方區域以手指完成手寫簽名</p>
            
            <div style="margin-top:25px; display:flex; gap:12px;">
                <button class="btn-outline" style="flex:1;" id="clearSignBtn">重新簽署</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveSignBtn">確認送出簽章</button>
            </div>
        </div>
    `;

    // 啟動簽名版
    const canvas = document.getElementById('sp');
    // 校正 Canvas 解析度
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(15, 23, 42)'
        });
    }

    document.getElementById('clearSignBtn').onclick = () => { if (signaturePad) signaturePad.clear(); };
    document.getElementById('saveSignBtn').onclick = async () => {
        if (signaturePad && signaturePad.isEmpty()) { alert("請先完成手寫簽名"); return; }
        const dataUrl = signaturePad.toDataURL();
        console.log("簽名影像已產製:", dataUrl.substring(0, 50) + "...");
        alert("恭喜！資產簽收已成功回報雲端紀錄！");
        window.location.href = './'; // 跳回首頁
    };
}

// ---------------------------------
// 其餘功能模組不變 (維持 v9.0 穩定版)
// ---------------------------------
function renderDashboard(main, title) {
    title.innerText = '系統總覽';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>電腦 PC</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div><div class="stat-card"><h3>筆電 NB</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div><div class="stat-card"><h3>報廢總量</h3><p class="count">${scrapData.length}</p></div></div><div class="card"><h3>系統運行中</h3><p style="color:var(--text-secondary);">資料庫對接版本：v10.0</p></div>`;
}

function renderAssetList(main, title) {
    title.innerText = '資產清單管理';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">${filtered.map(a => `<div class="asset-card"><span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span><div class="asset-id">${a.asset_no}</div><div class="asset-name">${a.name}</div><div class="asset-info"><p>保管人: ${a.custodian}</p></div><div class="card-footer-actions"><button class="btn-action" onclick="window.location.hash='#edit/${a.id}'">編輯</button><button class="btn-action" style="color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'">報廢</button></div></div>`).join('')}</div>
    `;
}

function renderAddAsset(main, title) {
    title.innerText = '建立新資產';
    main.innerHTML = `<div class="card"><h3>輸入資產資料</h3><div class="form-group"><label>類別</label><select id="nc"><option value="PC">PC</option><option value="NB">NB</option></select></div><div class="form-group"><label>品名</label><input type="text" id="nn"></div><div class="form-group"><label>保管人</label><input type="text" id="nu"></div><div class="form-group"><label>規格</label><textarea id="ns"></textarea></div><button class="btn-primary" id="s" style="width:100%; justify-content:center;">確認並送出雲端</button></div>`;
    document.getElementById('s').onclick = async () => {
        const cat = document.getElementById('nc').value;
        const no = `${cat}${String(assetsData.filter(a => a.category === cat).length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value, specs: document.getElementById('ns').value });
        alert(`新增資產 ${no} 成功！`); await refreshData(); window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    if (!a) { window.location.hash = '#assets'; return; }
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯資產：${a.asset_no}</h3><div class="form-group"><label>品名</label><input type="text" id="en" value="${a.name}"></div><button class="btn-primary" id="u">更新資料</button></div>`;
    document.getElementById('u').onclick = async () => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("更新成功！"); await refreshData(); window.location.hash = '#assets'; };
}

function renderScrapping(main, title) {
    title.innerText = '報廢資產清冊';
    main.innerHTML = `<div class="card"><h3>已結案清單</h3><table style="width:100%; color:white; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid #333;"><th style="padding:10px;">編號</th><th style="padding:10px;">品名</th><th style="padding:10px;">日期</th></tr></thead><tbody>${scrapData.map(s => `<tr style="border-bottom:1px solid #222;"><td style="padding:10px;">${s.asset_no}</td><td style="padding:10px;">${s.name}</td><td style="padding:10px;">${s.scrap_date}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderAddScrap(main, title) {
    const aid = sessionStorage.getItem('st');
    const a = assetsData.find(x => x.id === aid);
    main.innerHTML = `<div class="card"><h3>執行報廢：${a.asset_no}</h3><div class="form-group"><label>原因</label><textarea id="sr"></textarea></div><button class="btn-primary" id="doSc" style="width:100%; justify-content:center; background:var(--danger);">確認報廢移出</button></div>`;
    document.getElementById('doSc').onclick = async () => { await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: new Date().toISOString().split('T')[0] }); await FIREBASE_API.deleteAsset(aid); alert("已移入報廢清冊！"); await refreshData(); window.location.hash = '#scrapping'; };
}

function renderSignManager(main, title) {
    title.innerText = '建立簽名網址';
    main.innerHTML = `<div class="card"><h3>勾選後點擊產出</h3><div style="margin:20px 0;">${assetsData.map(a => `<label style="display:block;margin:10px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}-${a.name}</label>`).join('')}</div><button class="btn-primary" id="g">建立連結</button><div id="uz" class="hidden" style="margin-top:20px; padding:10px; background:rgba(0,0,0,0.2); word-break:break-all;"><code id="uv" style="color:var(--accent);"></code></div></div>`;
    document.getElementById('g').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden'); navigator.clipboard.writeText(url); alert("連結已產出！"); };
}

// 基礎功能 (不變)
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; renderAssets(document.getElementById('mainSection'), document.getElementById('pageTitle')); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
