// 麥箖公司財產管理系統 - 核心引擎 v3.5
import FIREBASE_API from './api.js';

let assetsData = [];
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

    // 處理手寫簽名連結模式 (#sign/NB001,NB002)
    if (hash.startsWith('#sign/')) {
        const ids = hash.replace('#sign/', '').split(',');
        renderSignaturePage(ids);
        return;
    }

    // 更新側邊欄 UI
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.getAttribute('data-page')}` === hash);
    });

    // 根據路徑切換頁面
    switch (hash) {
        case '#dashboard':
            renderDashboard();
            break;
        case '#assets':
            renderAssetList();
            break;
        case '#signature':
            renderSignatureManager();
            break;
        case '#scrapping':
            mainSection.innerHTML = '<div class="card"><h3>報廢管理</h3><p>此功能開發中，敬請期待。</p></div>';
            pageTitle.innerText = '報廢管理';
            break;
    }
    safeCreateIcons();
}

// 3. 資料讀取與更新
async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        console.log("資料同步完成:", assetsData.length, "筆");
    } catch (e) {
        console.error("Firebase 連線失敗:", e);
        alert("雲端連線失敗，請檢查網路或 Firebase 設定。");
    }
}

// 4. 各頁面渲染邏輯
function renderDashboard() {
    document.getElementById('pageTitle').innerText = '資產總覽';
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
            <h3>系統訊息</h3>
            <p>目前資料已與 Cloud Firestore 連線作業中。</p>
        </div>
    `;
}

function renderAssetList() {
    document.getElementById('pageTitle').innerText = '資產列表';
    const mainSection = document.getElementById('mainSection');

    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);

    mainSection.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div class="filter-tabs">
                ${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.updateFilter('${c}')">${c}</button>`).join('')}
            </div>
            <button class="btn-primary" onclick="window.location.hash='#add'">+ 新增資產</button>
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
                    </div>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" data-id="${a.id}"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action delete-btn" data-id="${a.id}"><i data-lucide="trash-2"></i><span>刪除</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // 綁定事件
    document.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => deleteAsset(b.dataset.id));
    document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => renderEditForm(b.dataset.id));
}

// 5. 基礎功能
function checkAuth() {
    if (sessionStorage.getItem('isAdmin') !== 'true') {
        document.getElementById('loginOverlay').style.display = 'flex';
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
    }
}

function initNavigation() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = () => {
            if (document.getElementById('adminPassword').value === '671230') {
                sessionStorage.setItem('isAdmin', 'true');
                checkAuth();
            } else {
                document.getElementById('loginError').classList.remove('hidden');
            }
        };
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.onclick = () => { window.location.hash = '#' + li.dataset.page; };
    });

    document.getElementById('mobileMenuBtn').onclick = () => {
        document.querySelector('.sidebar').classList.add('active-sidebar');
    };

    window.updateFilter = (c) => { currentFilter = c; renderAssetList(); };
}

function safeCreateIcons() {
    if (window.lucide) window.lucide.createIcons();
    else setTimeout(safeCreateIcons, 200);
}

// 刪除與編輯功能 (Firebase 介接)
async function deleteAsset(id) {
    if (confirm("確定刪除此資產？")) {
        await FIREBASE_API.deleteAsset(id);
        await refreshData();
        renderAssetList();
    }
}

function renderEditForm(id) {
    const a = assetsData.find(x => x.id === id);
    if (!a) return;
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>編輯資產：${a.asset_no}</h3>
            <div class="form-group"><label>名稱</label><input type="text" id="en" value="${a.name}"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="ec" value="${a.custodian}"></div>
            <div class="form-actions">
                <button class="btn-outline" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="updateBtn">更新資料</button>
            </div>
        </div>
    `;
    document.getElementById('updateBtn').onclick = async () => {
        await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value, custodian: document.getElementById('ec').value });
        await refreshData();
        window.location.hash = '#assets';
    };
}
