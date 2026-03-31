// 麥箖公司財產清單 - 主程式邏輯

// 資料儲存 (全域變數 改為空，由 Firebase 載入)
let assetsData = [];

// 追蹤當前篩選類別
let currentFilter = 'ALL';

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    loadAssetsFromFirebase(); // 初始化時從雲端載入

    // 暴露回調給全域 (供 onclick 使用)
    window.updateFilter = (cat) => {
        currentFilter = cat;
        renderAssetList();
    };

    // 登入按鈕監聽
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const pw = document.getElementById('adminPassword').value;
            const error = document.getElementById('loginError');
            if (pw === '671230') {
                sessionStorage.setItem('isAdmin', 'true');
                checkAuth();
            } else {
                error.classList.remove('hidden');
            }
        });
    }

    // 手機版選單切換
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active-sidebar');
        });
    }

    lucide.createIcons();
});

async function loadAssetsFromFirebase() {
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在連線至雲端資料庫...</div>';

    try {
        const { default: api } = await import('./api.js');
        assetsData = await api.fetchAssets();
        renderAssetList();
    } catch (e) {
        console.error(e);
        mainSection.innerHTML = `<div class="error">連線失敗：請檢查 api.js 中的 Firebase 設定是否完整。<br>${e.message}</div>`;
    }
}

function checkAuth() {
    const isAuth = sessionStorage.getItem('isAdmin');
    const overlay = document.getElementById('loginOverlay');
    if (isAuth === 'true') {
        overlay.style.display = 'none';
        safeCreateIcons(); // 確保背景圖示也更新
    } else {
        overlay.style.display = 'flex';
        safeCreateIcons();
    }
}

// 終極修復：全域安全呼叫 Lucide
function safeCreateIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    } else {
        // 如果還沒載入，過 300 毫秒再試一次
        setTimeout(safeCreateIcons, 300);
    }
}

// 導覽功能控制
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-links li');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 切換 Active 狀態
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const page = item.getAttribute('data-page');
            switchPage(page);
        });
    });
}

function switchPage(page) {
    const pageTitle = document.getElementById('pageTitle');
    const mainSection = document.getElementById('mainSection');

    mainSection.innerHTML = '<div class="loading">載入中...</div>';

    setTimeout(() => {
        switch (page) {
            case 'dashboard':
                pageTitle.innerText = '資產總覽';
                renderDashboard();
                break;
            case 'assets':
                pageTitle.innerText = '資產列表';
                renderAssetList();
                break;
            case 'signature':
                pageTitle.innerText = '手寫簽名管理';
                renderSignatureManager();
                break;
            case 'scrapping':
                pageTitle.innerText = '報廢管理';
                renderScrappingList();
                break;
        }
        lucide.createIcons();
    }, 300);
}

// 渲染儀表板
function renderDashboard() {
    const mainSection = document.getElementById('mainSection');
    const pcCount = assetsData.filter(a => a.category === 'PC').length;
    const nbCount = assetsData.filter(a => a.category === 'NB').length;
    const nCount = assetsData.filter(a => a.category === 'N').length;

    mainSection.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>電腦 (PC)</h3>
                <p class="count">${pcCount}</p>
            </div>
            <div class="stat-card">
                <h3>筆電/平板 (NB)</h3>
                <p class="count">${nbCount}</p>
            </div>
            <div class="stat-card">
                <h3>其他 (N)</h3>
                <p class="count">${nCount}</p>
            </div>
        </div>
        <div class="recent-activity">
            <h2>最近動態</h2>
            <ul class="activity-list">
                <li><i data-lucide="info"></i> <span>請至資產列表管理您的財產資料。</span></li>
                <li><i data-lucide="check-circle"></i> <span>資料已同步至 Firebase 雲端。</span></li>
            </ul>
        </div>
    `;

    safeCreateIcons();
}

// 渲染資產列表
function renderAssetList() {
    const mainSection = document.getElementById('mainSection');

    // 篩選資產
    const filteredAssets = currentFilter === 'ALL'
        ? assetsData
        : assetsData.filter(a => a.category === currentFilter);

    let html = `
        <div class="list-header-actions">
            <div class="filter-tabs">
                <button class="tab ${currentFilter === 'ALL' ? 'active' : ''}" onclick="window.updateFilter('ALL')">全部</button>
                <button class="tab ${currentFilter === 'PC' ? 'active' : ''}" onclick="window.updateFilter('PC')">電腦 (PC)</button>
                <button class="tab ${currentFilter === 'NB' ? 'active' : ''}" onclick="window.updateFilter('NB')">平板筆電 (NB)</button>
                <button class="tab ${currentFilter === 'N' ? 'active' : ''}" onclick="window.updateFilter('N')">其它 (N)</button>
            </div>
            <button id="addAssetBtn" class="btn-primary" style="width: auto;">+ 新增資產</button>
        </div>
        <div class="asset-grid">
    `;

    filteredAssets.forEach(asset => {
        html += `
            <div class="asset-card">
                <span class="asset-badge badge-${asset.category.toLowerCase()}">${asset.category}</span>
                <div class="asset-id">${asset.id}</div>
                <div class="asset-name">${asset.name}</div>
                <div class="asset-info">
                    <div class="info-item">
                        <label>保管人</label>
                        <span><strong>${asset.custodian}</strong></span>
                    </div>
                    <div class="info-item">
                        <label>地點</label>
                        <span>${asset.location}</span>
                    </div>
                    <div class="info-item">
                        <label>購買日期</label>
                        <span>${asset.purchase_date || '未設定'}</span>
                    </div>
                    <div class="info-item">
                        <label>規格</label>
                        <span class="specs-text">${asset.specs}</span>
                    </div>
                </div>
                <div class="card-footer-actions">
                    <button class="btn-action edit-btn" data-id="${asset.id}">
                        <i data-lucide="edit-3"></i> <span>編輯</span>
                    </button>
                    <button class="btn-action delete-btn" data-id="${asset.id}">
                        <i data-lucide="trash-2"></i> <span>刪除</span>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    mainSection.innerHTML = html;

    // 綁定編輯與刪除事件
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            renderEditAssetForm(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteAssetById(id);
        });
    });

    document.getElementById('addAssetBtn').addEventListener('click', renderAddAssetForm);
    safeCreateIcons();
}

async function deleteAssetById(docId) {
    if (confirm(`確定要刪除此資產嗎？此操作將同步從雲端移除！`)) {
        try {
            const { default: api } = await import('./api.js');
            await api.deleteAsset(docId);
            alert("資產已成功從雲端刪除！");
            loadAssetsFromFirebase();
        } catch (e) {
            alert("刪除失敗：" + e.message);
        }
    }
}

function renderAddAssetForm() {
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = `
        <div class="card add-form">
            <h3>建立新資產</h3>
            <div class="form-group">
                <label>資產類別</label>
                <select id="assetCategorySelect">
                    <option value="PC">電腦 (PC)</option>
                    <option value="NB">平板筆電 (NB)</option>
                    <option value="N">其它 (N)</option>
                </select>
            </div>
            <div class="form-group">
                <label>預計編號</label>
                <input type="text" id="newAssetId" readonly value="..." placeholder="由類別自動生成">
            </div>
            <div class="form-group">
                <label>資產名稱</label>
                <input type="text" id="assetNameInput" placeholder="例如：開發部工作站-02">
            </div>
            <div class="form-group">
                <label>規格說明</label>
                <textarea id="assetSpecsInput" rows="3" placeholder="例如：Intel i7 / 32GB / SSD 1TB"></textarea>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>存放地點</label>
                    <input type="text" id="assetLocationInput" placeholder="例如：台中辦公室">
                </div>
                <div class="form-group">
                    <label>購買日期</label>
                    <input type="date" id="assetDateInput">
                </div>
            </div>
            <div class="form-group">
                <label>保管人</label>
                <input type="text" id="assetCustodianInput" placeholder="例如：陳大文">
            </div>
            <div class="form-actions">
                <button class="btn-outline" onclick="switchPage('assets')">取消</button>
                <button id="saveAssetBtn" class="btn-primary">儲存資產</button>
            </div>
        </div>
    `;

    const catSelect = document.getElementById('assetCategorySelect');
    const idInput = document.getElementById('newAssetId');

    const updateId = () => {
        const cat = catSelect.value;
        const count = assetsData.filter(a => a.category === cat).length + 1;
        idInput.value = `${cat}${String(count).padStart(3, '0')}`;
    };

    catSelect.addEventListener('change', updateId);
    updateId();

    document.getElementById('saveAssetBtn').addEventListener('click', async () => {
        const newAsset = {
            asset_no: idInput.value,
            name: document.getElementById('assetNameInput').value,
            specs: document.getElementById('assetSpecsInput').value,
            location: document.getElementById('assetLocationInput').value,
            purchase_date: document.getElementById('assetDateInput').value,
            custodian: document.getElementById('assetCustodianInput').value,
            category: catSelect.value,
            status: '使用中'
        };

        if (!newAsset.name || !newAsset.custodian) {
            alert("請填寫資產名稱與保管人！");
            return;
        }

        try {
            const { default: api } = await import('./api.js');
            await api.addAsset(newAsset);
            alert(`雲端資產 ${newAsset.asset_no} 已建立！`);
            loadAssetsFromFirebase();
            switchPage('assets');
        } catch (e) {
            alert("儲存失敗：請確認 Firebase 有無正確連線。");
        }
    });
}

function renderEditAssetForm(docId) {
    const asset = assetsData.find(a => a.id === docId);
    if (!asset) return;

    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = `
        <div class="card add-form">
            <h3>編輯資產：${asset.id}</h3>
            <div class="form-group">
                <label>資產名稱</label>
                <input type="text" id="editNameInput" value="${asset.name}">
            </div>
            <div class="form-group">
                <label>規格說明</label>
                <textarea id="editSpecsInput" rows="3">${asset.specs}</textarea>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>存放地點</label>
                    <input type="text" id="editLocationInput" value="${asset.location}">
                </div>
                <div class="form-group">
                    <label>購買日期</label>
                    <input type="date" id="editDateInput" value="${asset.purchaseDate}">
                </div>
            </div>
            <div class="form-group">
                <label>保管人</label>
                <input type="text" id="editCustodianInput" value="${asset.custodian}">
            </div>
            <div class="form-actions">
                <button class="btn-outline" onclick="switchPage('assets')">取消</button>
                <button id="updateAssetBtn" class="btn-primary">更新資產</button>
            </div>
        </div>
    `;

    document.getElementById('updateAssetBtn').addEventListener('click', async () => {
        const updateData = {
            name: document.getElementById('editNameInput').value,
            specs: document.getElementById('editSpecsInput').value,
            location: document.getElementById('editLocationInput').value,
            purchaseDate: document.getElementById('editDateInput').value,
            custodian: document.getElementById('editCustodianInput').value
        };

        try {
            const { default: api } = await import('./api.js');
            await api.updateAsset(docId, updateData);
            alert("雲端資料已同步更新！");
            loadAssetsFromFirebase();
            switchPage('assets');
        } catch (e) {
            alert("更新失敗：" + e.message);
        }
    });
}

// 渲染手寫簽名管理部
function renderSignatureManager() {
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = `
        <div class="card signature-selector">
            <h3>選擇需要簽名的資產</h3>
            <p>請勾選項目後點擊「產生連結」</p>
            <div class="selection-list">
                ${mockAssets.map(a => `
                    <label class="checkbox-item">
                        <input type="checkbox" class="asset-checkbox" value="${a.id}">
                        <span>${a.id} - ${a.name} (${a.custodian})</span>
                    </label>
                `).join('')}
            </div>
            <button id="generateLinkBtn" class="btn-primary">產生簽名連結</button>
        </div>
        <div id="linkOutput" class="hidden">
            <p>請將此連結分享給使用者進行手機簽名：</p>
            <div class="generated-url">
                <input type="text" id="finalSignUrl" readonly value="">
                <button class="btn-icon" id="copyUrlBtn"><i data-lucide="copy"></i></button>
            </div>
        </div>
    `;

    document.getElementById('generateLinkBtn').addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll('.asset-checkbox:checked'))
            .map(cb => cb.value);

        if (selectedIds.length === 0) {
            alert("請至少先勾選一項資產！");
            return;
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const finalUrl = `${baseUrl}#sign/${selectedIds.join(',')}`;

        document.getElementById('finalSignUrl').value = finalUrl;
        document.getElementById('linkOutput').classList.remove('hidden');
    });

    document.getElementById('copyUrlBtn').addEventListener('click', () => {
        const urlInput = document.getElementById('finalSignUrl');
        urlInput.select();
        document.execCommand('copy');
        alert("連結已複製到剪貼簿！");
    });
}

function renderScrappingList() {
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = `
        <div class="card">
            <h3>報資產紀錄</h3>
            <p>目前尚無報廢資產紀錄</p>
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;">新增報廢申請</button>
        </div>
    `;
}

function appendDashboardStyles() {
    if (document.getElementById('dashboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = `
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .stat-card { background: var(--bg-surface-elevated); padding: 2rem; border-radius: 20px; text-align: center; border: 1px solid var(--border-color); }
        .stat-card h3 { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; }
        .count { font-size: 2.5rem; font-weight: 700; color: var(--primary); }
        .activity-list { list-style: none; margin-top: 1.5rem; }
        .activity-list li { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-surface); border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid var(--border-color); font-size: 0.9rem; }
        .activity-list li i { color: var(--primary); width: 18px; }
        .checkbox-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-surface); border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid var(--border-color); cursor: pointer; transition: 0.2s; }
        .checkbox-item:hover { background: rgba(255,255,255,0.05); }
        .btn-primary { background: var(--primary-gradient); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 1.5rem; width: 100%; transition: 0.3s; }
        .btn-primary:hover { opacity: 0.9; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); }
        .generated-url { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .generated-url input { flex: 1; background: #000; border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.8rem; border-radius: 8px; font-family: monospace; }
        .btn-icon { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px; cursor: pointer; }
        
        .add-form { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; background: var(--bg-surface-elevated); padding: 2rem; border-radius: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; }
        .form-group input, .form-group select, .form-group textarea { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 0.8rem; border-radius: 10px; font-size: 1rem; outline: none; }
        .form-group input:focus { border-color: var(--primary); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-top: 1rem; }
        .specs-text { font-size: 0.8rem; opacity: 0.8; height: 2.4rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

        /* Enhanced List & Actions */
        .list-header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .filter-tabs { display: flex; background: rgba(0,0,0,0.2); padding: 0.4rem; border-radius: 12px; gap: 0.4rem; }
        .tab { background: transparent; border: none; color: var(--text-secondary); padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; transition: 0.3s; font-weight: 600; font-size: 0.85rem; }
        .tab.active { background: var(--primary-gradient); color: white; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); }

        .card-footer-actions { border-top: 1px solid var(--border-color); margin-top: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding-top: 1rem; }
        .btn-action { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.8rem; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: 0.3s; }
        .btn-action.edit-btn { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .btn-action.delete-btn { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .btn-action:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .btn-action i { width: 16px; height: 16px; }

        /* Login Interface */
        .login-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
        }
        .login-box {
            background: var(--bg-surface-elevated); padding: 3rem; border-radius: 30px;
            width: 100%; max-width: 400px; border: 1px solid var(--border-color);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: center;
        }
        .login-box h2 { margin-bottom: 2rem; font-weight: 700; color: var(--text-primary); }
        .form-group-login { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; text-align: left; }
        .form-group-login label { font-size: 0.85rem; color: var(--text-secondary); }
        .form-group-login input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 0.8rem; border-radius: 10px; font-size: 1rem; width: 100%; }
        .error-text { color: var(--danger); margin-top: 1rem; font-size: 0.9rem; }
        .hidden { display: none; }
    `;
    document.head.appendChild(style);
}
