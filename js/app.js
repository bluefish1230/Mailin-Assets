/* 麥箖公司財產管理系統 - 核心引擎 v9.0 (路由與報表完全版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    // 初始化載入
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在擷取麥箖專屬雲端庫...</div>';
    await refreshData();

    // 全域路由
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');

    // 收起側欄 (手機)
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    // 清空舊狀態
    main.innerHTML = '<div class="loading">載入中...</div>';

    // 正規路徑處理
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

    // 更新標籤狀態
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

// 2. 資產列表與過濾
function renderAssetList(main, title) {
    title.innerText = '資產清單管理';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name" style="margin:10px 0;">${a.name}</div>
                    <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary);">
                        <p>保管人: ${a.custodian}</p>
                        <p>日期: ${a.purchase_date || '-'}</p>
                    </div>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" onclick="window.location.hash='#edit/${a.id}'"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action" style="color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 3. 新增資產 (包含規格說明)
function renderAddAsset(main, title) {
    title.innerText = '建立新資產';
    main.innerHTML = `
        <div class="card">
            <h3>輸入資產完整資料</h3>
            <div class="form-group"><label>類別</label><select id="nc"><option value="PC">電腦 PC</option><option value="NB">筆電/平板 NB</option><option value="N">其它 N</option></select></div>
            <div class="form-group"><label>資產名稱</label><input type="text" id="nn" placeholder="例如：DELL 工作站"></div>
            <div class="form-grid">
                <div class="form-group"><label>保管人</label><input type="text" id="nu"></div>
                <div class="form-group"><label>存放地點</label><input type="text" id="nl"></div>
            </div>
            <div class="form-group"><label>購買日期</label><input type="date" id="nd" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>規格說明</label><textarea id="ns" rows="3" placeholder="例如：RTX 4090 / 64G RAM"></textarea></div>
            <div class="form-actions"><button id="sBtn" class="btn-primary" style="width:100%; justify-content:center;">確認並送出雲端</button></div>
        </div>
    `;
    document.getElementById('sBtn').onclick = async () => {
        const cat = document.getElementById('nc').value;
        const no = `${cat}${String(assetsData.filter(a => a.category === cat).length + 1).padStart(3, '0')}`;
        const data = { asset_no: no, category: cat, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value, location: document.getElementById('nl').value, purchase_date: document.getElementById('nd').value, specs: document.getElementById('ns').value, status: '使用中' };
        await FIREBASE_API.addAsset(data);
        alert(`雲端資產 ${no} 已成功建檔！`);
        await refreshData(); window.location.hash = '#assets';
    };
}

// 4. 編輯頁面 (具備路由)
function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    const main = document.getElementById('mainSection');
    if (!a) { window.location.hash = '#assets'; return; }

    main.innerHTML = `
        <div class="card">
            <h3>編輯資產：${a.asset_no}</h3>
            <div class="form-group"><label>品名</label><input type="text" id="en" value="${a.name}"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="eu" value="${a.custodian}"></div>
            <div class="form-group"><label>存放地點</label><input type="text" id="el" value="${a.location || ''}"></div>
            <div class="form-group"><label>購買日期</label><input type="date" id="ed" value="${a.purchase_date || ''}"></div>
            <div class="form-group"><label>規格說明</label><textarea id="es" rows="3">${a.specs || ''}</textarea></div>
            <div class="form-actions" style="display:flex; gap:10px;">
                <button class="btn-outline" style="flex:1;" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="upBtn">更新資料</button>
            </div>
        </div>
    `;
    document.getElementById('upBtn').onclick = async () => {
        await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value, custodian: document.getElementById('eu').value, location: document.getElementById('el').value, purchase_date: document.getElementById('ed').value, specs: document.getElementById('es').value });
        alert("更新成功！"); await refreshData(); window.location.hash = '#assets';
    };
}

// 5. 其餘報廢與簽名
function renderScrapping(main, title) {
    title.innerText = '報廢資產管理';
    main.innerHTML = `<div class="card"><h3>目前紀錄</h3><table style="width:100%; color:white; border-collapse:collapse;"><thead><tr style="text-align:left; border-bottom:1px solid #333;"><th style="padding:10px;">編號</th><th style="padding:10px;">品名</th><th style="padding:10px;">日期</th></tr></thead><tbody>${scrapData.map(s => `<tr style="border-bottom:1px solid #222;"><td style="padding:10px;">${s.asset_no}</td><td style="padding:10px;">${s.name}</td><td style="padding:10px;">${s.scrap_date}</td></tr>`).join('')}</tbody></table>${scrapData.length === 0 ? '<p style="padding:20px; opacity:0.3; text-align:center;">暫無紀錄</p>' : ''}</div>`;
}

function renderAddScrap(main, title) {
    const aid = sessionStorage.getItem('st');
    const a = assetsData.find(x => x.id === aid);
    main.innerHTML = `<div class="card"><h3>資產報廢：${a.asset_no}</h3><div class="form-group"><label>報廢原因</label><textarea id="sr" rows="3"></textarea></div><button class="btn-primary" id="doScrap" style="width:100%; justify-content:center; background:var(--danger);">確認報廢移出</button></div>`;
    document.getElementById('doScrap').onclick = async () => {
        await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: new Date().toISOString().split('T')[0] });
        await FIREBASE_API.deleteAsset(aid);
        alert("已成功移入報廢清冊！"); await refreshData(); window.location.hash = '#scrapping';
    };
}

// ... 靜態模組
function renderDashboard(main, title) {
    title.innerText = '系統總覽';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>電腦 PC</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div><div class="stat-card"><h3>筆電 NB</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div><div class="stat-card"><h3>總報廢</h3><p class="count">${scrapData.length}</p></div></div>`;
}

function renderSignManager(main, title) {
    title.innerText = '建立簽名網址';
    main.innerHTML = `<div class="card"><h3>勾選資產</h3><div style="margin:20px 0;">${assetsData.map(a => `<label style="display:block; margin:8px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no} - ${a.name}</label>`).join('')}</div><button class="btn-primary" id="g">產出並複製網址</button></div>`;
    document.getElementById('g').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; navigator.clipboard.writeText(url); alert("網址已複製！"); };
}

function renderSignMode(ids) { document.body.innerHTML = `<div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;"><h2>資產簽收確認</h2><p>${ids.join(', ')}</p><canvas id="sp" style="width:100%; height:300px; background:white; border-radius:15px; margin:20px 0;"></canvas><button class="btn-primary" style="width:100%;" onclick="alert('簽收成功！');location.href='./'">確認送出</button></div>`; }

// 基礎功能
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle')); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
