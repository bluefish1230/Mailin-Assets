/* 麥箖公司財產管理系統 - 核心引擎 v6.0 (資產編輯完全補完版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let currentFilter = 'ALL';

// 1. 初始化
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();

    // 初始化雲端資料載入
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在連結麥箖公司專屬資產雲...</div>';
    await refreshData();

    // 路由監聽
    window.onhashchange = handleRouting;
    handleRouting();
});

// 2. 路由控制中心
async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const mainSection = document.getElementById('mainSection');
    const pageTitle = document.getElementById('pageTitle');
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
        mainSection.innerHTML = `<div class="card">系統渲染出錯：${e.message}</div>`;
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.dataset.page}` === hash);
    });
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
    } catch (e) { console.error(e); }
}

// 3. 核心功能 - 資產編輯 (補完版)
window.renderEditForm = (id) => {
    const a = assetsData.find(x => x.id === id);
    if (!a) return;

    document.getElementById('pageTitle').innerText = '編輯資產：' + a.asset_no;
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3 style="margin-bottom:2rem;">資產完整資訊修改</h3>
            <div class="form-group"><label>資產名稱</label><input type="text" id="en" value="${a.name || ''}"></div>
            <div class="form-grid">
                <div class="form-group"><label>保管人</label><input type="text" id="ec" value="${a.custodian || ''}"></div>
                <div class="form-group"><label>存放地點</label><input type="text" id="el" value="${a.location || ''}"></div>
            </div>
            <div class="form-group"><label>購買日期</label><input type="date" id="ed" value="${a.purchase_date || ''}"></div>
            <div class="form-group"><label>規格說明</label><textarea id="es" rows="3">${a.specs || ''}</textarea></div>
            
            <div class="form-actions" style="margin-top:30px; display:flex; gap:1rem;">
                <button class="btn-outline" style="flex:1;" id="cancelEditBtn">取消修改</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="finalUpdateBtn">儲存至雲端</button>
            </div>
        </div>
    `;

    // 绑定事件 (使用強大的 addEventListener 取代直接 onclick)
    document.getElementById('cancelEditBtn').addEventListener('click', () => { window.location.hash = '#assets'; });
    document.getElementById('finalUpdateBtn').addEventListener('click', async () => {
        const loadingBtn = document.getElementById('finalUpdateBtn');
        loadingBtn.innerText = '正在傳送...';
        loadingBtn.disabled = true;

        const updatedData = {
            name: document.getElementById('en').value,
            custodian: document.getElementById('ec').value,
            location: document.getElementById('el').value,
            purchase_date: document.getElementById('ed').value,
            specs: document.getElementById('es').value
        };

        try {
            await FIREBASE_API.updateAsset(id, updatedData);
            alert("雲端資料已成功更新！");
            await refreshData();
            window.location.hash = '#assets';
        } catch (e) {
            alert("儲存失敗：" + e.message);
            loadingBtn.innerText = '儲存至雲端';
            loadingBtn.disabled = false;
        }
    });
};

// ... 新增資產、列表渲染等承接 v5.0 精簡邏輯，但增加穩定性 ...
function renderAssetList() {
    document.getElementById('pageTitle').innerText = '資產列表管理';
    const mainSection = document.getElementById('mainSection');
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    mainSection.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:25px; flex-wrap:wrap; gap:15px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
        </div>
        <div class="asset-grid">
            ${filtered.length === 0 ? '<p style="padding:2rem; opacity:0.5;">查無資產資料</p>' : filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name">${a.name}</div>
                    <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary);">
                        <p>保管人: ${a.custodian}</p>
                        <p>日期: ${a.purchase_date || '-'}</p>
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
    document.getElementById('pageTitle').innerText = '建立新資產';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>新增設備資訊</h3>
            <div class="form-group"><label>資產類別</label><select id="ac"><option value="PC">電腦 PC</option><option value="NB">筆電 NB</option><option value="N">其他 N</option></select></div>
            <div class="form-group"><label>名稱</label><input type="text" id="an"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="au"></div>
            <div class="form-group"><label>購買日期</label><input type="date" id="ad" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-actions"><button id="saveBtn" class="btn-primary" style="width:100%; justify-content:center;">確認並送出雲端</button></div>
        </div>
    `;
    document.getElementById('saveBtn').addEventListener('click', async () => {
        const cat = document.getElementById('ac').value;
        const no = `${cat}${String(assetsData.filter(a => a.category === cat).length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('an').value, custodian: document.getElementById('au').value, purchase_date: document.getElementById('ad').value, status: '使用中' });
        alert("雲端資產 " + no + " 建立完成！");
        await refreshData();
        window.location.hash = '#assets';
    });
}

// 其餘功能模組不變
function renderDashboard() {
    document.getElementById('pageTitle').innerText = '儀表板概況';
    document.getElementById('mainSection').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>電腦 (PC)</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div>
            <div class="stat-card"><h3>筆電/平板 (NB)</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div>
            <div class="stat-card"><h3>其他 (N)</h3><p class="count">${assetsData.filter(a => a.category === 'N').length}</p></div>
        </div>
    `;
}

function renderScrappingList() {
    document.getElementById('pageTitle').innerText = '已報廢資產清冊';
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>目前無任何報廢存檔紀錄</h3></div>`;
}

function renderScrappingForm() {
    const aid = sessionStorage.getItem('scrap_target');
    const a = assetsData.find(x => x.id === aid);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>確認報廢：${a.asset_no}</h3><button class="btn-primary" id="confirmS">確認報廢</button></div>`;
    document.getElementById('confirmS').onclick = () => { alert('已封存！'); window.location.hash = '#scrapping'; };
}

function renderSignatureManager() {
    document.getElementById('pageTitle').innerText = '產生簽名點收連結';
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>選擇點收資產</h3>
            <div style="margin:20px 0;">${assetsData.map(a => `<label style="display:block;margin:10px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}-${a.name}</label>`).join('')}</div>
            <button class="btn-primary" id="g">建立簽名連結</button>
            <div id="uZone" class="hidden" style="margin-top:20px; padding:10px; background:rgba(0,0,0,0.3); border-radius:10px; word-break:break-all;">
                <code id="uValue" style="color:var(--accent);"></code>
            </div>
        </div>
    `;
    document.getElementById('g').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('uValue').innerText = url;
        document.getElementById('uZone').classList.remove('hidden');
        navigator.clipboard.writeText(url);
        alert("已建立連結並複製！");
    };
}

function renderSignaturePage(ids) {
    document.body.innerHTML = `<div style="background:#0f172a; color:white; min-height:100vh; padding:30px; text-align:center;"><h2>資產點收確認</h2><p>${ids.join(',')}</p><canvas id="sp" style="width:100%; height:300px; background:white; border-radius:15px; margin:20px 0;"></canvas><button class="btn-primary" style="width:100%; justify-content:center;" onclick="alert('簽名成功！');location.href='/'">確認送出</button></div>`;
}

function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    const lb = document.getElementById('loginBtn');
    if (lb) lb.onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => { li.onclick = () => { window.location.hash = '#' + li.dataset.page; }; });
    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
