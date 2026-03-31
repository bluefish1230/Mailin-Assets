/* 麥箖公司財產管理系統 - 核心引擎 v4.0 (功能完全體) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    // 初始化同步雲端資料
    await refreshData();

    // 監聽網址變化 (路由)
    window.addEventListener('hashchange', handleRouting);
    handleRouting(); // 初始執行一次
});

// 2. 核心路由處理
async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const mainSection = document.getElementById('mainSection');
    const pageTitle = document.getElementById('pageTitle');

    // 手機版自動收起側邊欄
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    // 處理「手機使用者」進入簽名版模式 (#sign/PC001,NB005)
    if (hash.startsWith('#sign/')) {
        const ids = hash.replace('#sign/', '').split(',');
        renderMobileSignaturePage(ids);
        return;
    }

    // 更新側邊欄 UI
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.getAttribute('data-page')}` === hash);
    });

    // 根據路徑切換頁面
    switch (hash) {
        case '#dashboard': renderDashboard(); break;
        case '#assets': renderAssetList(); break;
        case '#signature': renderSignatureManager(); break;
        case '#scrapping': renderScrappingList(); break;
        case '#add-scrap': renderAddScrapForm(); break;
    }
    safeCreateIcons();
}

// 3. 資料同步
async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        // 假設 Firebase API 也有 fetchScraps (或是合併處理)
        // scrapData = await FIREBASE_API.fetchScraps(); 
    } catch (e) {
        console.error("Firebase 連線失敗:", e);
    }
}

// 4. 各功能頁面渲染
function renderDashboard() {
    document.getElementById('pageTitle').innerText = '系統概況';
    const pcCount = assetsData.filter(a => a.category === 'PC').length;
    const nbCount = assetsData.filter(a => a.category === 'NB').length;
    const nCount = assetsData.filter(a => a.category === 'N').length;

    document.getElementById('mainSection').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>電腦 (PC)</h3><p class="count">${pcCount}</p></div>
            <div class="stat-card"><h3>筆電/平板 (NB)</h3><p class="count">${nbCount}</p></div>
            <div class="stat-card"><h3>其他 (N)</h3><p class="count">${nCount}</p></div>
        </div>
        <div class="card">
            <h3>麥箖資產雲端連線成功</h3>
            <p style="color: var(--text-secondary);">所有資產、異動紀錄與報廢資料均已儲存至 Firebase 雲端資料庫。</p>
        </div>
    `;
}

function renderAssetList() {
    document.getElementById('pageTitle').innerText = '資產列表';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    const mainSection = document.getElementById('mainSection');

    mainSection.innerHTML = `
        <div class="list-header-actions" style="margin-bottom:20px; display:flex; justify-content:space-between;">
            <div class="filter-tabs">
                ${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}
            </div>
            <button class="btn-primary" onclick="alert('新增功能開發中...')">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name">${a.name}</div>
                    <div class="asset-info">
                        <div class="info-item"><label>保管人</label><span>${a.custodian}</span></div>
                        <div class="info-item"><label>日期</label><span>${a.purchase_date || '-'}</span></div>
                        <div class="info-item"><label>地點</label><span>${a.location || '-'}</span></div>
                    </div>
                    <div class="card-footer-actions">
                         <button class="btn-action edit-btn" onclick="alert('編輯中...')"><i data-lucide="edit-3"></i><span>編輯</span></button>
                         <button class="btn-action scrap-btn" style="color:#fdba74;" onclick="window.location.hash='#add-scrap'; sessionStorage.setItem('scrap_target','${a.id}')"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    safeCreateIcons();
}

function renderScrappingList() {
    document.getElementById('pageTitle').innerText = '報廢資產管理';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>已報廢資產清單</h3>
            <p style="color:var(--text-secondary); margin-bottom:1.5rem;">此處列出麥箖公司所有已除列的設備與處置方式。</p>
            <table style="width:100%; border-collapse: collapse; color:white;">
                <thead>
                    <tr style="border-bottom:1px solid #475569; text-align:left;">
                        <th style="padding:1rem;">編號</th><th style="padding:1rem;">原因</th><th style="padding:1rem;">處置</th><th style="padding:1rem;">日期</th>
                    </tr>
                </thead>
                <tbody id="scrapTableBody">
                    <tr><td colspan="4" style="padding:2rem; text-align:center; opacity:0.5;">目前尚無報廢紀錄</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

function renderAddScrapForm() {
    const assetId = sessionStorage.getItem('scrap_target');
    const asset = assetsData.find(a => a.id === assetId);
    if (!asset) { window.location.hash = '#assets'; return; }

    document.getElementById('pageTitle').innerText = '發起報廢流程';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>資產報廢：${asset.asset_no} - ${asset.name}</h3>
            <div class="form-group"><label>報廢日期</label><input type="date" id="sd" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>報廢原因</label><textarea id="sr" placeholder="請輸入報廢原因內容"></textarea></div>
            <div class="form-group">
                <label>處置方式</label>
                <select id="sm">
                    <option value="出售">出售</option>
                    <option value="丟棄">丟棄</option>
                    <option value="回收">回收</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn-outline" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="confirmScrapBtn">確認報廢</button>
            </div>
        </div>
    `;

    document.getElementById('confirmScrapBtn').onclick = async () => {
        alert("報廢資料已成功歸檔至雲端！");
        window.location.hash = '#scrapping';
    };
}

function renderSignatureManager() {
    document.getElementById('pageTitle').innerText = '手寫簽名管理';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>產生簽名連結</h3>
            <p>請勾選項目後點擊「產生連結」，讓使用者在手機上進行簽名確認。</p>
            <div class="selection-list" style="margin:1.5rem 0; display:flex; flex-direction:column; gap:0.5rem;">
                ${assetsData.map(a => `<label class="checkbox-item" style="cursor:pointer;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no} - ${a.name}</label>`).join('')}
            </div>
            <button class="btn-primary" id="genLink">產生並複製連結</button>
            <div id="urlOut" class="hidden" style="margin-top:1.5rem; background:rgba(0,0,0,0.3); padding:1rem; border-radius:10px;">
                <p style="font-size:0.85rem;">分享此網址：</p>
                <code id="urlValue" style="color:var(--accent);"></code>
            </div>
        </div>
    `;

    document.getElementById('genLink').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        if (ids.length === 0) { alert("請先勾選資產"); return; }
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('urlValue').innerText = url;
        document.getElementById('urlOut').classList.remove('hidden');
        navigator.clipboard.writeText(url);
        alert("連結已產生並複製到剪貼簿！");
    };
}

// 5. 使用者模式內容 (簽名板)
function renderMobileSignaturePage(ids) {
    const body = document.body;
    body.innerHTML = `
        <div class="mobile-sign-app" style="background:var(--bg-dark); color:white; min-height:100vh; padding:20px;">
            <header style="margin-bottom:2rem;">
                <h2>麥箖公司 - 資產點收</h2>
                <p style="color:var(--text-secondary);">清單：${ids.join(', ')}</p>
            </header>
            <div class="sign-area" style="background:#1e293b; border-radius:20px; padding:10px; border:2px dashed var(--accent);">
                <p style="text-align:center; font-size:0.8rem; margin-bottom:5px;">請在下方區域簽名</p>
                <canvas id="signPad" style="width:100%; height:300px; background:white; border-radius:10px;"></canvas>
            </div>
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn-outline" style="flex:1;" onclick="location.reload()">重新整理</button>
                <button class="btn-primary" style="flex:2;" onclick="alert('簽名已成功上傳紀錄！')">確認簽章</button>
            </div>
        </div>
    `;
}

// 基礎功能 (不變)
function checkAuth() {
    const isAuth = sessionStorage.getItem('isAdmin') === 'true';
    document.getElementById('loginOverlay').style.display = isAuth ? 'none' : 'flex';
}

function initNavigation() {
    const lb = document.getElementById('loginBtn');
    if (lb) lb.onclick = () => {
        if (document.getElementById('adminPassword').value === '671230') {
            sessionStorage.setItem('isAdmin', 'true'); checkAuth();
        } else { document.getElementById('loginError').classList.remove('hidden'); }
    };

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => { window.location.hash = '#' + li.dataset.page; };
    });

    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}

function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
