// 麥箖公司財產清單 - 主程式邏輯

// 模擬資料 (Mock Data)
const mockAssets = [
    { id: 'PC001', name: '開發部工作站-01', specs: 'Intel i9 / 64GB / RTX 4090', location: '台北辦公室', purchaseDate: '2025-01-10', custodian: '張小明', category: 'PC' },
    { id: 'NB001', name: '業務部筆電-01', specs: 'MacBook Pro M3 14"', location: '外派', purchaseDate: '2024-12-15', custodian: '李美美', category: 'NB' },
    { id: 'NB002', name: '經理專用平板', specs: 'iPad Pro 12.9" 512GB', location: '主管辦公室', purchaseDate: '2025-03-01', custodian: '王大同', category: 'NB' },
    { id: 'N001', name: '會議室投影機', specs: 'Epson 4K Projector', location: '大會議室', purchaseDate: '2024-11-20', custodian: '林總務', category: 'N' }
];

// 追蹤當前篩選類別
let currentFilter = 'ALL';

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    renderDashboard();

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

function checkAuth() {
    const isAuth = sessionStorage.getItem('isAdmin');
    const overlay = document.getElementById('loginOverlay');
    if (isAuth === 'true') {
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'flex';
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
    const pcCount = mockAssets.filter(a => a.category === 'PC').length;
    const nbCount = mockAssets.filter(a => a.category === 'NB').length;
    const nCount = mockAssets.filter(a => a.category === 'N').length;

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
            <h2>最近異動紀錄</h2>
            <ul class="activity-list">
                <li><i data-lucide="refresh-cw"></i> <span>PC001 由 張小明 轉交至 王小華 (2026-03-30)</span></li>
                <li><i data-lucide="plus-circle"></i> <span>新增資產 NB002 - 經理專用平板 (2026-03-31)</span></li>
            </ul>
        </div>
    `;

    // 儀表板專用樣式 (動態加入或在 main.css 預留)
    appendDashboardStyles();
}

// 渲染資產列表
function renderAssetList() {
    const mainSection = document.getElementById('mainSection');

    // 篩選資產
    const filteredAssets = currentFilter === 'ALL'
        ? mockAssets
        : mockAssets.filter(a => a.category === currentFilter);

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
                        <span>${asset.purchaseDate}</span>
                    </div>
                    <div class="info-item">
                        <label>規格</label>
                        <span class="specs-text">${asset.specs}</span>
                    </div>
                </div>
                <div class="card-footer-actions">
                    <button class="btn-action edit-btn" onclick="alert('編輯功能開發中...')">
                        <i data-lucide="edit-3"></i> 編輯
                    </button>
                    <button class="btn-action delete-btn" data-id="${asset.id}">
                        <i data-lucide="trash-2"></i> 刪除
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    mainSection.innerHTML = html;

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteAssetById(id);
        });
    });

    document.getElementById('addAssetBtn').addEventListener('click', renderAddAssetForm);
    lucide.createIcons();
}

async function deleteAssetById(assetId) {
    if (confirm(`確定要刪除資產 ${assetId} 嗎？此操作不可恢復！`)) {
        try {
            // FIREBASE_API.deleteAsset(assetId); 
            // 為求 demo 流暢，先 mock 刪除本地陣列
            const index = mockAssets.findIndex(a => a.id === assetId);
            if (index > -1) mockAssets.splice(index, 1);
            alert("資產已成功移除！");
            renderAssetList();
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
        const count = mockAssets.filter(a => a.category === cat).length + 1;
        idInput.value = `${cat}${String(count).padStart(3, '0')}`;
    };

    catSelect.addEventListener('change', updateId);
    updateId();

    document.getElementById('saveAssetBtn').addEventListener('click', () => {
        const newAsset = {
            id: idInput.value,
            name: document.getElementById('assetNameInput').value,
            specs: document.getElementById('assetSpecsInput').value,
            location: document.getElementById('assetLocationInput').value,
            purchaseDate: document.getElementById('assetDateInput').value,
            custodian: document.getElementById('assetCustodianInput').value,
            category: catSelect.value
        };

        if (!newAsset.name || !newAsset.custodian) {
            alert("請填寫資產名稱與保管人！");
            return;
        }

        mockAssets.push(newAsset);
        alert(`資產 ${newAsset.id} 已建立！`);
        switchPage('assets');
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
                        <input type="checkbox" value="${a.id}">
                        <span>${a.id} - ${a.name} (${a.custodian})</span>
                    </label>
                `).join('')}
            </div>
            <button id="generateLinkBtn" class="btn-primary">產生簽名連結</button>
        </div>
        <div id="linkOutput" class="hidden">
            <p>請將此連結分享給使用者進行手機簽名：</p>
            <div class="generated-url">
                <input type="text" readonly value="https://mailin-assets.github.io/sign#session-12345">
                <button class="btn-icon"><i data-lucide="copy"></i></button>
            </div>
        </div>
    `;

    document.getElementById('generateLinkBtn').addEventListener('click', () => {
        document.getElementById('linkOutput').classList.remove('hidden');
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
