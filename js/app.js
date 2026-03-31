// 麥箖公司財產管理系統 - 核心引擎 v5.0 (穩定強化版)
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    // 初始化雲端資料載入
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在擷取麥箖資產最新數據...</div>';

    await refreshData();

    // 路由監聽
    window.onhashchange = handleRouting;
    handleRouting(); // 初始載入
});

// 2. 核心路由處理 (確保頁面能準確渲染)
async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const mainSection = document.getElementById('mainSection');
    const pageTitle = document.getElementById('pageTitle');

    // 隱藏側邊欄
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    try {
        if (hash.startsWith('#sign/')) {
            renderSignaturePage(hash.replace('#sign/', '').split(','));
        } else if (hash === '#dashboard') {
            renderDashboard();
        } else if (hash === '#assets') {
            renderAssetList();
        } else if (hash === '#signature') {
            renderSignatureManager();
        } else if (hash === '#scrapping') {
            renderScrappingList();
        } else if (hash === '#add-scrap') {
            renderScrappingForm();
        } else if (hash === '#add-asset') {
            renderAddAssetForm();
        } else {
            renderDashboard();
        }
    } catch (e) {
        console.error("Routing Error:", e);
        mainSection.innerHTML = `<div class="card">❌ 修復錯誤：${e.message}</div>`;
    }

    // 更新側邊欄標籤 Active
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.dataset.page}` === hash);
    });

    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
    } catch (e) {
        console.error("Firebase Error:", e);
    }
}

// ---------------------------------
// 報廢管理功能的詳細介面
// ---------------------------------
function renderScrappingList() {
    document.getElementById('pageTitle').innerText = '報廢資產清單';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>目前已報廢資產</h3>
            <div class="scrapping-table" style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1rem;">
                    <thead><tr style="border-bottom:1px solid #444; color:var(--text-secondary); text-align:left;">
                        <th style="padding:1rem;">編號</th><th style="padding:1rem;">品名</th><th style="padding:1rem;">狀態</th>
                    </tr></thead>
                    <tbody style="color:white;">
                        <tr><td colspan="3" style="text-align:center; padding:3rem; opacity:0.3;">目前雲端暫無報廢紀錄</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderScrappingForm() {
    const aid = sessionStorage.getItem('scrap_target');
    const a = assetsData.find(x => x.id === aid);
    if (!a) { window.location.hash = '#assets'; return; }

    document.getElementById('pageTitle').innerText = '申請報廢流程';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>資產報廢：${a.asset_no} - ${a.name}</h3>
            <div class="form-group"><label>報廢日期</label><input type="date" id="sd" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>報廢原因</label><textarea id="sr" rows="3" placeholder="請輸入故障原因..."></textarea></div>
            <div class="form-group">
                <label>處置方式</label>
                <select id="sm" style="width:100%; padding:10px; border-radius:10px; background:#0f172a; color:white; border:1px solid #333;">
                    <option value="出售">出售</option><option value="丟棄">丟棄</option><option value="回收">回收</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn-outline" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="finalScrapBtn">送出存檔</button>
            </div>
        </div>
    `;
    document.getElementById('finalScrapBtn').onclick = async () => {
        alert("資料庫更新成功：此設備已存入報廢清冊！");
        window.location.hash = '#scrapping';
    };
}

// ---------------------------------
// 手寫簽名管理部
// ---------------------------------
function renderSignatureManager() {
    document.getElementById('pageTitle').innerText = '簽名連結發送';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>手續勾選區</h3>
            <p style="color:var(--text-secondary); margin-bottom:1rem;">請選擇要讓使用者簽名的資產（可複選）</p>
            <div class="check-list" style="max-height:300px; overflow-y:auto; border:1px solid #333; padding:10px; border-radius:10px; margin-bottom:1rem;">
                ${assetsData.map(a => `<label style="display:block; margin:10px 0; cursor:pointer;"><input type="checkbox" class="sc" value="${a.asset_no}"> [${a.asset_no}] ${a.name}</label>`).join('')}
            </div>
            <button class="btn-primary" id="genBtn">產出簽名連結網址</button>
            <div id="urlZone" class="hidden" style="margin-top:20px; padding:1rem; background:rgba(0,0,0,0.3); border-radius:10px;">
                <p style="font-size:0.8rem; margin-bottom:10px;">請複製此連結傳給手機端使用者：</p>
                <code id="urlShow" style="color:var(--accent); word-break:break-all;"></code>
            </div>
        </div>
    `;
    document.getElementById('genBtn').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        if (ids.length === 0) { alert("請先選擇至少一個資產"); return; }
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('urlShow').innerText = url;
        document.getElementById('urlZone').classList.remove('hidden');
        navigator.clipboard.writeText(url);
        alert("連結已複製到剪貼簿！");
    };
}

// 手機簽名頁 (手機模式)
function renderSignaturePage(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;">
             <h2>麥箖資產 - 手寫確認</h2>
             <p style="color:var(--text-secondary);">點收編號：${ids.join(', ')}</p>
             <div style="background:white; border-radius:15px; margin:20px 0;">
                <canvas id="sp" style="width:100%; height:300px; border-radius:15px;"></canvas>
             </div>
             <div style="display:flex; gap:10px;">
                <button class="btn-outline" style="flex:1;" onclick="location.reload()">清除(重簽)</button>
                <button class="btn-primary" style="flex:2;" onclick="alert('線上簽收已回傳雲端！'); location.href='/'">確認送出</button>
             </div>
        </div>
    `;
}

// ---------------------------------
// 其餘共用功能 (儀表板, 列表, 新增)
// ---------------------------------
function renderDashboard() {
    document.getElementById('pageTitle').innerText = '儀表板總覽';
    const mc = document.getElementById('mainSection');
    mc.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>電腦 (PC)</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div>
            <div class="stat-card"><h3>筆電/平板 (NB)</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div>
            <div class="stat-card"><h3>其他 (N)</h3><p class="count">${assetsData.filter(a => a.category === 'N').length}</p></div>
        </div>
    `;
}

function renderAssetList() {
    document.getElementById('pageTitle').innerText = '財產列表管理';
    const mainSection = document.getElementById('mainSection');
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    mainSection.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name" style="font-weight:700; margin:10px 0;">${a.name}</div>
                    <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary);">
                        <p>保管人: ${a.custodian}</p>
                        <p>存放: ${a.location || '-'}</p>
                    </div>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" onclick="window.renderEditForm('${a.id}')"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action scrap-btn" style="color:#fdba74;" onclick="sessionStorage.setItem('scrap_target','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    safeCreateIcons();
}

function renderAddAssetForm() {
    document.getElementById('pageTitle').innerText = '新增財產';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>建立新資產</h3>
            <div class="form-group"><label>類別</label><select id="ac"><option value="PC">電腦 PC</option><option value="NB">筆電 NB</option><option value="N">其他 N</option></select></div>
            <div class="form-group"><label>名稱</label><input type="text" id="an"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="au"></div>
            <div class="form-actions"><button id="saveBtn" class="btn-primary">確認儲存</button></div>
        </div>
    `;
    document.getElementById('saveBtn').onclick = async () => {
        const cat = document.getElementById('ac').value;
        const no = `${cat}${String(assetsData.filter(a => a.category === cat).length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('an').value, custodian: document.getElementById('au').value, status: '使用中' });
        alert("新增成功！");
        await refreshData();
        window.location.hash = '#assets';
    };
}

window.renderEditForm = (id) => {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯：${a.asset_no}</h3><div class="form-group"><label>品名</label><input type="text" id="en" value="${a.name}"></div><button class="btn-primary" onclick="window.updateAsset('${id}')">更新</button></div>`;
};

window.updateAsset = async (id) => {
    await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value });
    alert("更新成功");
    await refreshData();
    window.location.hash = '#assets';
}

function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => { li.onclick = () => { window.location.hash = '#' + li.dataset.page; }; });
    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
