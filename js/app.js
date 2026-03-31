/* 麥箖公司財產管理系統 - 核心引擎 v8.0 正式穩定版 */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化與全域事件
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();
    const main = document.getElementById('mainSection');
    main.innerHTML = '<div class="loading">正在連結麥箖雲端系統...</div>';
    await syncAllData();
    window.onhashchange = handleRouting;
    handleRouting();
});

async function syncAllData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
    } catch (e) { console.error("同步失敗:", e); }
}

// 2. 路由控制
async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    if (hash.startsWith('#sign/')) {
        renderSignMode(hash.replace('#sign/', '').split(','));
        return;
    }

    document.querySelectorAll('.nav-links li').forEach(li => li.classList.toggle('active', `#${li.dataset.page}` === hash));

    switch (hash) {
        case '#dashboard': renderDashboard(main, title); break;
        case '#assets': renderAssets(main, title); break;
        case '#signature': renderSignManager(main, title); break;
        case '#scrapping': renderScrapping(main, title); break;
        case '#add-asset': renderAddAsset(main, title); break;
        case '#add-scrap': renderAddScrap(main, title); break;
    }
    safeCreateIcons();
}

// 3. 功能模組
function renderDashboard(main, title) {
    title.innerText = '儀表板';
    main.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>在用電腦</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div>
            <div class="stat-card"><h3>在用筆電</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div>
            <div class="stat-card"><h3>總報廢量</h3><p class="count">${scrapData.length}</p></div>
        </div>
        <div class="card"><h3>系統動態</h3><p style="color:var(--text-secondary);">資料庫目前運作正常，最近同步時間：${new Date().toLocaleTimeString()}</p></div>
    `;
}

function renderAssets(main, title) {
    title.innerText = '資產清單管理';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name">${a.name}</div>
                    <div class="asset-info">
                        <p>保管人: ${a.custodian}</p>
                        <p>購買日期: ${a.purchase_date || '-'}</p>
                    </div>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" onclick="window.goEdit('${a.id}')"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action" style="color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAddAsset(main, title) {
    title.innerText = '新增財產資產';
    main.innerHTML = `
        <div class="card">
            <h3>輸入新資產資訊</h3>
            <div class="form-group"><label>類別</label><select id="nc"><option value="PC">電腦 PC</option><option value="NB">筆電 NB</option><option value="N">其他 N</option></select></div>
            <div class="form-group"><label>名稱</label><input type="text" id="nn" placeholder="品名"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="nu"></div>
            <div class="form-grid">
                <div class="form-group"><label>地點</label><input type="text" id="nl"></div>
                <div class="form-group"><label>日期</label><input type="date" id="nd" value="${new Date().toISOString().split('T')[0]}"></div>
            </div>
            <button class="btn-primary" id="saveAssetBtn" style="width:100%; justify-content:center; margin-top:1rem;">存入雲端</button>
        </div>
    `;
    document.getElementById('saveAssetBtn').onclick = async () => {
        const cat = document.getElementById('nc').value;
        const no = `${cat}${String(assetsData.filter(a => a.category === cat).length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value, location: document.getElementById('nl').value, purchase_date: document.getElementById('nd').value, status: '使用中' });
        alert(`新增資產 ${no} 成功！`);
        await syncAllData(); window.location.hash = '#assets';
    };
}

window.goEdit = (id) => {
    const a = assetsData.find(x => x.id === id);
    const main = document.getElementById('mainSection');
    document.getElementById('pageTitle').innerText = '編輯資產：' + a.asset_no;
    main.innerHTML = `
        <div class="card">
            <h3>修改資訊</h3>
            <div class="form-group"><label>名稱</label><input type="text" id="en" value="${a.name}"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="eu" value="${a.custodian}"></div>
            <div class="form-group"><label>地點</label><input type="text" id="el" value="${a.location || ''}"></div>
            <div class="form-group"><label>購買日期</label><input type="date" id="ed" value="${a.purchase_date || ''}"></div>
            <div class="form-actions"><button class="btn-outline" onclick="window.location.hash='#assets'">取消</button><button class="btn-primary" id="upBtn">更新至雲端</button></div>
        </div>
    `;
    document.getElementById('upBtn').onclick = async () => {
        await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value, custodian: document.getElementById('eu').value, location: document.getElementById('el').value, purchase_date: document.getElementById('ed').value });
        alert("更新成功！"); await syncAllData(); window.location.hash = '#assets';
    };
};

function renderScrapping(main, title) {
    title.innerText = '報廢資產清冊';
    main.innerHTML = `
        <div class="card">
            <h3>雲端紀錄清單</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #444; color:var(--text-secondary); text-align:left;"><th style="padding:10px;">編號</th><th style="padding:10px;">品名</th><th style="padding:10px;">原因</th><th style="padding:10px;">日期</th></tr></thead>
                    <tbody>${scrapData.map(s => `<tr><td style="padding:10px; color:var(--accent);">${s.asset_no}</td><td style="padding:10px;">${s.name}</td><td style="padding:10px;">${s.reason}</td><td style="padding:10px;">${s.scrap_date}</td></tr>`).join('')}</tbody>
                </table>
                ${scrapData.length === 0 ? '<p style="padding:2rem; text-align:center; opacity:0.3;">無紀錄</p>' : ''}
            </div>
        </div>
    `;
}

function renderAddScrap(main, title) {
    const aid = sessionStorage.getItem('st');
    const a = assetsData.find(x => x.id === aid);
    title.innerText = '執行報廢作業';
    main.innerHTML = `
        <div class="card">
            <h3>將資產移入報廢：${a.asset_no}</h3>
            <div class="form-group"><label>報廢日期</label><input type="date" id="sd" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>原因</label><textarea id="sr" rows="3"></textarea></div>
            <div class="form-actions"><button class="btn-primary" id="doScBtn" style="background:var(--danger);">確認報廢移出</button></div>
        </div>
    `;
    document.getElementById('doScBtn').onclick = async () => {
        await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: document.getElementById('sd').value });
        await FIREBASE_API.deleteAsset(aid);
        alert("已成功移入報廢清冊！"); await syncAllData(); window.location.hash = '#scrapping';
    };
}

function renderSignManager(main, title) {
    title.innerText = '產生點收連結';
    main.innerHTML = `
        <div class="card">
            <h3>資產多選</h3>
            <div id="sl" style="margin:20px 0;">${assetsData.map(a => `<label style="display:block; margin:8px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}-${a.name}</label>`).join('')}</div>
            <button class="btn-primary" id="gen">建立分享連結</button>
            <div id="urlZone" class="hidden" style="margin-top:20px; background:rgba(0,0,0,0.2); padding:1rem; border-radius:10px; word-break:break-all;"><code id="uv" style="color:var(--accent);"></code></div>
        </div>
    `;
    document.getElementById('gen').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('uv').innerText = url;
        document.getElementById('urlZone').classList.remove('hidden');
        navigator.clipboard.writeText(url); alert("連結已複製！");
    };
}

function renderSignMode(ids) {
    document.body.innerHTML = `<div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;"><h2>資產簽收</h2><p style="color:var(--text-secondary);">${ids.join(', ')}</p><canvas id="sp" style="width:100%; height:300px; background:white; border-radius:15px; margin:20px 0;"></canvas><button class="btn-primary" style="width:100%; justify-content:center;" onclick="alert('簽收成功！');location.href='./'">確認簽章</button></div>`;
}

// 通用基礎
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; renderAssets(document.getElementById('mainSection'), document.getElementById('pageTitle')); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
