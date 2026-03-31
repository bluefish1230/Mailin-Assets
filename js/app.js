/* 麥箖公司財產管理系統 - 核心引擎 v4.5 (全功能解禁版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();
    await refreshData();
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

// 2. 核心路由處理
async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const mainSection = document.getElementById('mainSection');
    const pageTitle = document.getElementById('pageTitle');
    document.querySelector('.sidebar').classList.remove('active-sidebar');

    if (hash.startsWith('#sign/')) {
        const ids = hash.replace('#sign/', '').split(',');
        renderMobileSignaturePage(ids);
        return;
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.getAttribute('data-page')}` === hash);
    });

    switch (hash) {
        case '#dashboard': renderDashboard(); break;
        case '#assets': renderAssetList(); break;
        case '#signature': renderSignatureManager(); break;
        case '#scrapping': renderScrappingList(); break;
        case '#add-asset': renderAddAssetForm(); break;
        case '#add-scrap': renderAddScrapForm(); break;
    }
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
    } catch (e) {
        console.error("Firebase 連線失敗:", e);
    }
}

// 各頁面渲染
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
            <h3>資產狀態快速覽</h3>
            <p style="color:var(--text-secondary);">目前系統已與麥箖公司 Firebase 雲端資料庫保持動態同步。</p>
        </div>
    `;
}

function renderAssetList() {
    document.getElementById('pageTitle').innerText = '資產列表';
    const mainSection = document.getElementById('mainSection');
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    mainSection.innerHTML = `
        <div class="list-header-actions" style="margin-bottom:20px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div class="filter-tabs">
                ${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}
            </div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
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
                         <button class="btn-action edit-btn" onclick="window.renderEditForm('${a.id}')"><i data-lucide="edit-3"></i><span>編輯</span></button>
                         <button class="btn-action scrap-btn" style="color:#fdba74;" onclick="window.location.hash='#add-scrap'; sessionStorage.setItem('scrap_target','${a.id}')"><i data-lucide="archive"></i><span>報廢</span></button>
                         <button class="btn-action delete-btn" style="opacity:0.3;" onclick="window.deleteAsset('${a.id}')"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    safeCreateIcons();
}

function renderAddAssetForm() {
    document.getElementById('pageTitle').innerText = '新增財產資產';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>建立新資產紀錄</h3>
            <div class="form-group">
                <label>資產類別</label>
                <select id="ac" style="width:100%; padding:10px; border-radius:10px; background:#0f172a; color:white;">
                    <option value="PC">電腦 PC</option>
                    <option value="NB">平板筆電 NB</option>
                    <option value="N">其它 N</option>
                </select>
            </div>
            <div class="form-group"><label>資產名稱</label><input type="text" id="an" placeholder="例如：開發部工作站-01"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="au" placeholder="請輸入保管人姓名"></div>
            <div class="form-group"><label>規格說明</label><textarea id="as" rows="3"></textarea></div>
            <div class="form-grid">
                <div class="form-group"><label>存放地點</label><input type="text" id="al" placeholder="辦公室位置"></div>
                <div class="form-group"><label>購買日期</label><input type="date" id="ad" value="${new Date().toISOString().split('T')[0]}"></div>
            </div>
            <div class="form-actions">
                <button class="btn-outline" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="saveAssetBtn">儲存至雲端</button>
            </div>
        </div>
    `;

    document.getElementById('saveAssetBtn').onclick = async () => {
        const cat = document.getElementById('ac').value;
        const count = assetsData.filter(a => a.category === cat).length + 1;
        const assetNo = `${cat}${String(count).padStart(3, '0')}`;

        const data = {
            asset_no: assetNo,
            category: cat,
            name: document.getElementById('an').value,
            custodian: document.getElementById('au').value,
            specs: document.getElementById('as').value,
            location: document.getElementById('al').value,
            purchase_date: document.getElementById('ad').value,
            status: '使用中'
        };

        if (!data.name || !data.custodian) { alert("請填寫資產名稱與保管人"); return; }
        await FIREBASE_API.addAsset(data);
        alert(`雲端資產 ${assetNo} 已成功建立！`);
        await refreshData();
        window.location.hash = '#assets';
    };
}

window.renderEditForm = (id) => {
    const a = assetsData.find(x => x.id === id);
    if (!a) return;
    document.getElementById('pageTitle').innerText = '編輯資產資訊';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>編輯：${a.asset_no}</h3>
            <div class="form-group"><label>名稱</label><input type="text" id="en" value="${a.name}"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="ec" value="${a.custodian}"></div>
            <div class="form-group"><label>存放地點</label><input type="text" id="el" value="${a.location || ''}"></div>
            <div class="form-actions">
                <button class="btn-outline" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="updateBtn">儲存修改</button>
            </div>
        </div>
    `;
    document.getElementById('updateBtn').onclick = async () => {
        await FIREBASE_API.updateAsset(id, {
            name: document.getElementById('en').value,
            custodian: document.getElementById('ec').value,
            location: document.getElementById('el').value
        });
        await refreshData();
        window.location.hash = '#assets';
    };
};

window.deleteAsset = async (id) => {
    if (confirm("確定刪除此雲端資產？")) {
        await FIREBASE_API.deleteAsset(id);
        await refreshData();
        renderAssetList();
    }
};

// ...其餘報廢與簽名功能由 v4.0 承接邏輯...
function renderScrappingList() {
    document.getElementById('pageTitle').innerText = '報廢資產清單';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>已報廢資產</h3>
            <p style="color:var(--text-secondary); margin-bottom:1rem;">列出所有報廢後的設備紀錄。</p>
            <table style="width:100%; color:white; border-collapse:collapse;">
                <thead><tr style="border-bottom:1px solid #444; text-align:left;"><th style="padding:10px;">編號</th><th style="padding:10px;">原因</th><th style="padding:10px;">日期</th></tr></thead>
                <tbody><tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">目前暫無報廢紀錄</td></tr></tbody>
            </table>
        </div>
    `;
}

function renderAddScrapForm() {
    const aid = sessionStorage.getItem('scrap_target');
    const a = assetsData.find(x => x.id === aid);
    if (!a) { window.location.hash = "#assets"; return; }
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>將資產 ${a.asset_no} 報廢</h3>
            <div class="form-group"><label>報廢原因</label><textarea id="sr" rows="3"></textarea></div>
            <div class="form-actions"><button class="btn-primary" id="confirmScrap">確認報廢存檔</button></div>
        </div>
    `;
    document.getElementById('confirmScrap').onclick = async () => {
        alert("資產已成功除位並歸入報廢紀錄。");
        window.location.hash = "#scrapping";
    };
}

function renderSignatureManager() {
    document.getElementById('pageTitle').innerText = '簽名連結管理';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>產生手寫簽名連結</h3>
            <div class="selection-list" style="margin:20px 0;">
                ${assetsData.map(a => `<label style="display:block; margin:5px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no} - ${a.name}</label>`).join('')}
            </div>
            <button class="btn-primary" id="gen">產生連結</button>
            <div id="urlOut" class="hidden" style="margin-top:20px; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px; word-break:break-all;">
                <code id="urlValue" style="color:var(--accent);"></code>
            </div>
        </div>
    `;
    document.getElementById('gen').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('urlValue').innerText = url;
        document.getElementById('urlOut').classList.remove('hidden');
        navigator.clipboard.writeText(url);
        alert("連結已產生並複製！");
    };
}

function renderMobileSignaturePage(ids) {
    document.body.innerHTML = `
        <div style="padding:20px; text-align:center; background:#0f172a; min-height:100vh; color:white;">
            <h2>麥箖資產簽名確認</h2>
            <p>編號：${ids.join(',')}</p>
            <canvas id="sp" style="width:100%; height:300px; background:white; margin:20px 0; border-radius:10px;"></canvas>
            <button class="btn-primary" style="width:100%; justify-content:center;" onclick="alert('簽收成功！')">確認簽章</button>
        </div>
    `;
}

function checkAuth() {
    if (sessionStorage.getItem('isAdmin') !== 'true') document.getElementById('loginOverlay').style.display = 'flex';
    else document.getElementById('loginOverlay').style.display = 'none';
}

function initNavigation() {
    const lb = document.getElementById('loginBtn');
    if (lb) lb.onclick = () => {
        if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); }
        else document.getElementById('loginError').classList.remove('hidden');
    };
    document.querySelectorAll('.nav-links li').forEach(li => { li.onclick = () => { window.location.hash = '#' + li.dataset.page; }; });
    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}

function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
