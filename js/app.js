/* 麥箖公司財產管理系統 - 核心引擎 v7.0 (雲端報廢完整版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在擷取麥箖資產與報廢清冊...</div>';
    await refreshData();

    window.onhashchange = handleRouting;
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const mainSection = document.getElementById('mainSection');
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
        console.error(e);
        mainSection.innerHTML = `<div class="card">頁面載入錯誤：${e.message}</div>`;
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.dataset.page}` === hash);
    });
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
    } catch (e) { console.error(e); }
}

// --- 報廢功能模組 ---
function renderScrappingList() {
    const pageTitle = document.getElementById('pageTitle');
    const mainSection = document.getElementById('mainSection');
    pageTitle.innerText = '已報廢資產清單';

    mainSection.innerHTML = `
        <div class="card">
            <h3>麥箖公司報廢清冊</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1.5rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #334155; text-align:left; color:var(--text-secondary);">
                        <th style="padding:1rem;">編號</th><th style="padding:1rem;">資產名稱</th><th style="padding:1rem;">報廢原因</th><th style="padding:1rem;">處置</th><th style="padding:1rem;">日期</th>
                    </tr></thead>
                    <tbody>
                        ${scrapData.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:3rem; opacity:0.3;">目前無任何雲端報廢紀錄</td></tr>' :
            scrapData.map(s => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:1rem; color:var(--accent); font-weight:700;">${s.asset_no}</td>
                                <td style="padding:1rem;">${s.name}</td>
                                <td style="padding:1rem; font-size:0.9rem;">${s.reason || '-'}</td>
                                <td style="padding:1rem;"><span style="background:rgba(239,68,68,0.1); color:#f87171; padding:2px 8px; border-radius:5px;">${s.method}</span></td>
                                <td style="padding:1rem; font-size:0.85rem; color:var(--text-secondary);">${s.scrap_date}</td>
                            </tr>
                          `).join('')}
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

    document.getElementById('pageTitle').innerText = '執行報廢動作';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>將資產移入報廢區：${a.asset_no}</h3>
            <div class="form-group"><label>報廢日期</label><input type="date" id="sd" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>報廢原因</label><textarea id="sr" rows="3" placeholder="請填寫報廢故障原因"></textarea></div>
            <div class="form-group">
                <label>處置方式</label>
                <select id="sm" style="width:100%; border-radius:10px; padding:10px; background:#0f172a; color:white; border:1px solid #334155;">
                    <option value="出售">出售</option><option value="丟棄">丟棄</option><option value="回收">回收</option>
                </select>
            </div>
            <div class="form-actions" style="display:flex; gap:1rem; margin-top:2rem;">
                <button class="btn-outline" style="flex:1;" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" style="flex:2; justify-content:center; background:var(--danger);" id="finalScrapBtn">確認報廢並除位</button>
            </div>
        </div>
    `;

    document.getElementById('finalScrapBtn').onclick = async () => {
        const loadingBtn = document.getElementById('finalScrapBtn');
        loadingBtn.innerText = '處理中...';
        loadingBtn.disabled = true;

        const scrapRecord = {
            asset_no: a.asset_no,
            name: a.name,
            reason: document.getElementById('sr').value,
            method: document.getElementById('sm').value,
            scrap_date: document.getElementById('sd').value,
            original_id: a.id
        };

        try {
            await FIREBASE_API.addScrap(scrapRecord);
            await FIREBASE_API.deleteAsset(a.id); // 從正常列表移除
            alert(`報廢成功：${a.asset_no} 已正式移入報廢清冊！`);
            await refreshData();
            window.location.hash = '#scrapping';
        } catch (e) {
            alert("雲端操作失敗：" + e.message);
            loadingBtn.innerText = '確認報廢並除位';
            loadingBtn.disabled = false;
        }
    };
}

// 其他渲染模組 (不變)
function renderDashboard() {
    document.getElementById('pageTitle').innerText = '儀表板';
    document.getElementById('mainSection').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>在用電腦</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div>
            <div class="stat-card"><h3>在用筆電</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div>
            <div class="stat-card"><h3>報廢總量</h3><p class="count">${scrapData.length}</p></div>
        </div>
    `;
}

function renderAssetList() {
    document.getElementById('pageTitle').innerText = '資產列表管理';
    const mainSection = document.getElementById('mainSection');
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    mainSection.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:25px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name" style="margin:10px 0;">${a.name}</div>
                    <p style="font-size:0.8rem; opacity:0.6;">保管人: ${a.custodian}</p>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" onclick="window.renderEditForm('${a.id}')">編輯</button>
                        <button class="btn-action" style="color:#f87171;" onclick="sessionStorage.setItem('scrap_target','${a.id}');window.location.hash='#add-scrap'">報廢</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    safeCreateIcons();
}

function renderAddAssetForm() {
    document.getElementById('pageTitle').innerText = '新增資產';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>新增設備</h3>
            <div class="form-group"><label>類別</label><select id="ac"><option value="PC">PC</option><option value="NB">NB</option></select></div>
            <div class="form-group"><label>名稱</label><input type="text" id="an"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="au"></div>
            <button class="btn-primary" id="sA">儲存</button>
        </div>
    `;
    document.getElementById('sA').onclick = async () => {
        const cat = document.getElementById('ac').value;
        const no = `${cat}${String(assetsData.length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('an').value, custodian: document.getElementById('au').value });
        alert("儲存成功"); await refreshData(); window.location.hash = '#assets';
    };
}

window.renderEditForm = (id) => {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯：${a.asset_no}</h3><div class="form-group"><input type="text" id="en" value="${a.name}"></div><button class="btn-primary" onclick="window.updateAsset('${id}')">更新</button></div>`;
};
window.updateAsset = async (id) => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("更新成功"); await refreshData(); window.location.hash = '#assets'; };
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => { li.onclick = () => { window.location.hash = '#' + li.dataset.page; }; });
    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
function renderSignatureManager() {
    document.getElementById('pageTitle').innerText = '產生簽名點收網址';
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>勾選項目</h3><div>${assetsData.map(a => `<label style="display:block;margin:10px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}-${a.name}</label>`).join('')}</div><button class="btn-primary" id="g">建立並複製連結</button></div>`;
    document.getElementById('g').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; navigator.clipboard.writeText(url); alert("連結已複製！"); };
}
function renderSignaturePage(ids) { document.body.innerHTML = `<div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;"><h2>資產點收簽名</h2><p>${ids.join(',')}</p><canvas id="sp" style="width:100%; height:300px; background:white; border-radius:15px; margin:20px 0;"></canvas><button class="btn-primary" style="width:100%;" onclick="alert('簽名成功！');location.href='/'">確認送出</button></div>`; }
