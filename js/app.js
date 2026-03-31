/* 麥箖公司財產管理系統 - 核心引擎 v14.0 (視覺強化版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = [];
let currentFilter = 'ALL';
let searchQuery = '';
let selectedAssets = new Set();
let signaturePad = null;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initNavigation();
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在連結麥箖雲端庫...</div>';
    await refreshData();
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');
    document.querySelector('.sidebar').classList.remove('active-sidebar');

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
            case '#sign-history': renderSignHistory(main, title); break;
            case '#add-asset': renderAddAsset(main, title); break;
            default: renderDashboard(main, title);
        }
    }
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.toggle('active', `#${li.dataset.page}` === hash.split('/')[0]));
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
        signData = await FIREBASE_API.fetchSignatures();
    } catch (e) { console.error(e); }
}

// ---------------------------------
// 精華：資產列表 (具備簽名預覽與放大功能)
// ---------------------------------
function renderAssetList(main, title) {
    title.innerText = '資產清單管理';

    let filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    if (searchQuery) {
        filtered = filtered.filter(a => (a.custodian || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.asset_no || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }

    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; flex-direction:column; gap:20px; margin-bottom:25px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
                <div class="search-box" style="position:relative; flex-grow:1; max-width:400px;">
                    <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:18px; color:var(--text-secondary);"></i>
                    <input type="text" id="assetSearch" placeholder="搜尋保管人、品名或編號..." value="${searchQuery}" style="padding-left:40px; width:100%; height:45px; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:12px; color:white;">
                </div>
                <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產</button>
            </div>
            
            <div id="batchActions" class="card" style="margin-bottom:0; padding:15px 25px; display:${selectedAssets.size > 0 ? 'flex' : 'none'}; align-items:center; justify-content:space-between; background:rgba(99, 102, 241, 0.1); border-color:var(--accent);">
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-weight:600; color:var(--accent);">已選取 ${selectedAssets.size} 項資產</span>
                    <button class="btn-outline" style="padding:5px 15px; font-size:0.8rem;" onclick="window.clearSelection()">取消全選</button>
                </div>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="newCustodian" placeholder="輸入新保管人" style="width:180px; padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-dark); color:white;">
                    <button class="btn-primary" style="padding:8px 20px; font-size:0.9rem;" onclick="window.batchUpdateCustodian()">變更保管人</button>
                    <button class="btn-action" style="background:#ef4444; color:white; padding:8px 20px;" onclick="window.batchScrap()"><i data-lucide="trash-2"></i><span>批次報廢</span></button>
                </div>
            </div>
            
            <div style="display:flex; align-items:center; padding-left:15px;">
                <input type="checkbox" id="selectAll" ${filtered.length > 0 && Array.from(selectedAssets).length >= filtered.length ? 'checked' : ''} onclick="window.toggleSelectAll(this.checked)" style="width:18px; height:18px; cursor:pointer;">
                <label for="selectAll" style="margin-left:10px; cursor:pointer; font-size:0.9rem; color:var(--text-secondary);">全選目前列表</label>
            </div>
        </div>

        <div class="asset-grid">
            ${filtered.map(a => {
        const latestSign = signData.find(s => s.item_ids.includes(a.asset_no));
        const isSelected = selectedAssets.has(a.id);
        return `
                <div class="asset-card ${isSelected ? 'selected' : ''}" style="display:flex; flex-direction:column; position:relative;">
                    <input type="checkbox" class="asset-checkbox" data-id="${a.id}" ${isSelected ? 'checked' : ''} onclick="window.toggleSelect('${a.id}')" style="position:absolute; top:20px; left:20px; width:20px; height:20px; z-index:5; cursor:pointer;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-left:35px;">
                        <div>
                            <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                            <div class="asset-id">${a.asset_no}</div>
                            <div class="asset-name" style="margin:10px 0; font-size:1.2rem; height: auto;">${a.name}</div>
                            <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary);">
                                <p><i data-lucide="user" style="width:14px; display:inline-block; vertical-align:middle; margin-right:5px;"></i>保管人: ${a.custodian}</p>
                                <p><i data-lucide="map-pin" style="width:14px; display:inline-block; vertical-align:middle; margin-right:5px;"></i>地點: ${a.location || '-'}</p>
                            </div>
                        </div>
                        ${latestSign ? `<div class="card-sign-preview" onclick="window.previewSign('${latestSign.signature_img}')" title="點擊放大簽名" style="cursor:zoom-in;">
                            <img src="${latestSign.signature_img}" style="width:80px; height:60px; background:white; border:2px solid #334155; border-radius:10px; padding:3px; object-fit:contain;">
                            <p style="font-size:0.6rem; text-align:center; color:var(--accent); margin-top:3px; font-weight:700;">已簽收</p>
                        </div>` : ''}
                    </div>
                    <div class="card-footer-actions" style="margin-top:20px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05); display:flex; gap:10px;">
                        <button class="btn-action edit-btn" style="flex:1;" onclick="window.location.hash='#edit/${a.id}'"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action" style="flex:1; color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>`;
    }).join('')}
        </div>
    `;

    // 獲取當前是否有聚焦在搜尋框
    const wasFocused = document.activeElement && document.activeElement.id === 'assetSearch';
    const searchInput = document.getElementById('assetSearch');

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value;
            clearTimeout(window.searchTimer);
            window.searchTimer = setTimeout(() => {
                renderAssetList(main, title);
            }, 500); // 延長到 500ms 避免過頻繁
        };

        if (wasFocused) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.setSelectionRange(val.length, val.length);
        }
    }

    safeCreateIcons();
}

window.previewSign = (img) => {
    const w = window.open("");
    w.document.write(`<body style='margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;'><img src='${img}' style='max-width:90%; border:5px solid #fff; background:#fff; box-shadow:0 0 50px rgba(255,255,255,0.2);'></body>`);
};

// ---------------------------------
// 手機/滑鼠 簽名引擎 (雙支援優化)
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:35px; text-align:center; display:flex; flex-direction:column;">
            <div style="margin-bottom:25px;">
                <h2>資產簽收確認</h2>
                <p style="color:var(--text-secondary);">${ids.join(', ')}</p>
            </div>
            <div style="background:white; border-radius:20px; flex-grow:1; display:flex; overflow:hidden;">
                <canvas id="sp" style="width:100%; height:100%; touch-action:none;"></canvas>
            </div>
            <div style="margin-top:20px; display:flex; gap:15px;">
                <button class="btn-outline" style="flex:1;" id="clearSign">重簽</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveBtn">本人確認送出</button>
            </div>
        </div>
    `;
    const canvas = document.getElementById('sp');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio; canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)', minWidth: 2, maxWidth: 4 });

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveBtn').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請先完成簽署"); return; }
        const b = document.getElementById('saveBtn'); b.innerText = '雲端存檔中...'; b.disabled = true;
        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: signaturePad.toDataURL() });
            alert("✅ 點收完成！"); window.location.href = './';
        } catch (e) { alert("上傳失敗"); b.innerText = '本人確認送出'; b.disabled = false; }
    };
}

// 其餘功能模組不變 ...
function renderDashboard(main, title) {
    title.innerText = '儀表板';
    main.innerHTML = `<div class="stats-grid"><div class="stat-card"><h3>在用資產</h3><p class="count">${assetsData.length}</p></div><div class="stat-card"><h3>報廢總數</h3><p class="count">${scrapData.length}</p></div><div class="stat-card"><h3>點收存單</h3><p class="count">${signData.length}</p></div></div>`;
}

function renderAddAsset(main, title) {
    title.innerText = '新增財產資產';
    main.innerHTML = `<div class="card"><h3>資產建檔</h3><div class="form-group"><label>類別</label><select id="nc"><option value="PC">PC</option><option value="NB">NB</option></select></div><div class="form-group"><label>品名</label><input type="text" id="nn"></div><div class="form-group"><label>保管人</label><input type="text" id="nu"></div><button class="btn-primary" id="sS" style="width:100%; justify-content:center; margin-top:20px;">儲存</button></div>`;
    document.getElementById('sS').onclick = async () => {
        const no = `ASSET${Date.now().toString().slice(-4)}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: document.getElementById('nc').value, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value });
        alert("成功！"); await refreshData(); window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `<div class="card"><h3>編輯資產：${a.asset_no}</h3><input type="text" id="en" value="${a.name}"><button class="btn-primary" id="uB">儲存</button></div>`;
    document.getElementById('uB').onclick = async () => { await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value }); alert("OK"); await refreshData(); window.location.hash = '#assets'; };
}

function renderScrapping(main, title) {
    title.innerText = '報廢資產清冊';
    main.innerHTML = `
        <div class="card" style="padding:0; overflow:hidden;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#1e293b; text-align:left;">
                        <th style="padding:15px; border-bottom:1px solid var(--border-color);">資產編號</th>
                        <th style="padding:15px; border-bottom:1px solid var(--border-color);">品名</th>
                        <th style="padding:15px; border-bottom:1px solid var(--border-color);">報廢日期</th>
                        <th style="padding:15px; border-bottom:1px solid var(--border-color);">狀態</th>
                    </tr>
                </thead>
                <tbody>
                    ${scrapData.map(s => `
                        <tr>
                            <td style="padding:15px; border-bottom:1px solid var(--border-color); font-family:monospace;">${s.asset_no}</td>
                            <td style="padding:15px; border-bottom:1px solid var(--border-color);">${s.name}</td>
                            <td style="padding:15px; border-bottom:1px solid var(--border-color); color:var(--text-secondary);">${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                            <td style="padding:15px; border-bottom:1px solid var(--border-color);"><span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:2px 10px; border-radius:20px; font-size:0.8rem;">已報廢</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${scrapData.length === 0 ? '<p style="padding:40px; text-align:center; color:var(--text-secondary);">目前無報廢紀錄</p>' : ''}
        </div>
    `;
}

function renderSignHistory(main, title) {
    title.innerText = '手寫點收紀錄';
    main.innerHTML = `
        <div class="asset-grid">
            ${signData.map(s => `
                <div class="asset-card" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                        <div>
                            <div style="color:var(--accent); font-size:0.8rem; font-weight:600; margin-bottom:5px;">簽收單據</div>
                            <div style="font-size:0.9rem; font-weight:700;">簽收編號: ${s.item_ids}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:5px;">時間: ${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                    <div style="background:white; border-radius:12px; padding:10px; display:flex; justify-content:center; align-items:center;">
                        <img src="${s.signature_img}" style="max-width:100%; height:120px; object-fit:contain;">
                    </div>
                    <div style="margin-top:15px; display:flex; justify-content:flex-end;">
                        <button class="btn-outline" style="padding:5px 12px; font-size:0.8rem;" onclick="window.previewSign('${s.signature_img}')">查看原始大小</button>
                    </div>
                </div>
            `).join('')}
        </div>
        ${signData.length === 0 ? '<div class="card" style="text-align:center; color:var(--text-secondary);">尚未有任何簽收紀錄</div>' : ''}
    `;
}

function renderSignManager(main, title) {
    title.innerText = '產生點收連結';
    main.innerHTML = `<div class="card"><h3>資產清單</h3>${assetsData.map(a => `<p><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no}</p>`).join('')}<button class="btn-primary" id="gB">建立網址</button><div id="uz" class="hidden"><code id="uv"></code></div></div>`;
    document.getElementById('gB').onclick = () => { const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value); const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`; document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden'); navigator.clipboard.writeText(url); alert("複製成功"); };
}

function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });

    // 全域輔助函數
    window.setFilter = (c) => { currentFilter = c; handleRouting(); };

    window.toggleSelect = (id) => {
        if (selectedAssets.has(id)) selectedAssets.delete(id);
        else selectedAssets.add(id);
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    };

    window.toggleSelectAll = (checked) => {
        const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
        const searchFiltered = searchQuery ? filtered.filter(a => (a.custodian || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.asset_no || '').toLowerCase().includes(searchQuery.toLowerCase())) : filtered;

        if (checked) searchFiltered.forEach(a => selectedAssets.add(a.id));
        else searchFiltered.forEach(a => selectedAssets.delete(a.id));

        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    };

    window.clearSelection = () => {
        selectedAssets.clear();
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    };

    window.batchUpdateCustodian = async () => {
        const newVal = document.getElementById('newCustodian').value;
        if (!newVal) return alert("請輸入新保管人名稱");
        if (!confirm(`確定要將這 ${selectedAssets.size} 項資產的保管人變更為「${newVal}」嗎？`)) return;

        try {
            const list = Array.from(selectedAssets);
            for (const id of list) {
                await FIREBASE_API.updateAsset(id, { custodian: newVal });
            }
            alert("✅ 批次變更成功");
            selectedAssets.clear();
            await refreshData();
            renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
        } catch (e) { alert("變更失敗: " + e.message); }
    };

    window.batchScrap = async () => {
        if (!confirm(`確定要將這 ${selectedAssets.size} 項資產報廢嗎？注意：此操作無法復原。`)) return;
        try {
            const list = Array.from(selectedAssets);
            for (const id of list) {
                const a = assetsData.find(x => x.id === id);
                if (a) {
                    await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name });
                    await FIREBASE_API.deleteAsset(id);
                }
            }
            alert("✅ 批次報廢完成");
            selectedAssets.clear();
            await refreshData();
            renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
        } catch (e) { alert("報廢過程出錯: " + e.message); }
    };

    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}

function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
