/* 麥箖公司財產管理系統 - 核心引擎 v13.0 (究極美化穩定版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = [];
let currentFilter = 'ALL';
let signaturePad = null;

// 1. 初始化
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

    main.innerHTML = '<div class="loading">正在擷取頁面...</div>';

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
            case '#add-scrap': renderAddScrap(main, title); break;
            default: renderDashboard(main, title);
        }
    }

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.toggle('active', `#${li.dataset.page}` === hash.split('/')[0]);
    });
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
        signData = await FIREBASE_API.fetchSignatures();
    } catch (e) { console.error("同步出錯:", e); }
}

// ---------------------------------
// 頁面渲染模組 (恢復豪華樣式)
// ---------------------------------
function renderDashboard(main, title) {
    title.innerText = '系統總覽';
    main.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>在用電腦 (PC)</h3><p class="count">${assetsData.filter(a => a.category === 'PC').length}</p></div>
            <div class="stat-card"><h3>筆電/平板 (NB)</h3><p class="count">${assetsData.filter(a => a.category === 'NB').length}</p></div>
            <div class="stat-card"><h3>報廢總量</h3><p class="count">${scrapData.length}</p></div>
        </div>
        <div class="card" style="margin-top:20px;">
            <h3>麥箖資產管理中心</h3>
            <p style="color:var(--text-secondary); margin-top:10px;">目前雲端資料傳輸正常，系統版本 v13.0。</p>
        </div>
    `;
}

function renderAssetList(main, title) {
    title.innerText = '資產清單管理';
    const filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    main.innerHTML = `
        <div class="list-header-actions" style="display:flex; justify-content:space-between; margin-bottom:25px; flex-wrap:wrap; gap:15px;">
            <div class="filter-tabs">${['ALL', 'PC', 'NB', 'N'].map(c => `<button class="tab ${currentFilter === c ? 'active' : ''}" onclick="window.setFilter('${c}')">${c}</button>`).join('')}</div>
            <button class="btn-primary" onclick="window.location.hash='#add-asset'">+ 新增資產紀錄</button>
        </div>
        <div class="asset-grid">
            ${filtered.length === 0 ? '<div class="card" style="grid-column:1/-1; text-align:center; opacity:0.5;">目前暫無此類別資產</div>' : filtered.map(a => `
                <div class="asset-card">
                    <span class="asset-badge badge-${a.category.toLowerCase()}">${a.category}</span>
                    <div class="asset-id">${a.asset_no}</div>
                    <div class="asset-name">${a.name}</div>
                    <div class="asset-info" style="font-size:0.85rem; color:var(--text-secondary); margin:15px 0;">
                        <p><i data-lucide="user" style="width:12px; height:12px; vertical-align:middle; margin-right:5px;"></i>保管人: ${a.custodian}</p>
                        <p><i data-lucide="map-pin" style="width:12px; height:12px; vertical-align:middle; margin-right:5px;"></i>地點: ${a.location || '-'}</p>
                    </div>
                    <div class="card-footer-actions">
                        <button class="btn-action edit-btn" onclick="window.location.hash='#edit/${a.id}'"><i data-lucide="edit-3"></i><span>編輯</span></button>
                        <button class="btn-action" style="color:#fdba74;" onclick="sessionStorage.setItem('st','${a.id}');window.location.hash='#add-scrap'"><i data-lucide="archive"></i><span>報廢</span></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    safeCreateIcons();
}

function renderScrapping(main, title) {
    title.innerText = '已報廢資產清冊';
    main.innerHTML = `
        <div class="card">
            <h3>歷史報廢存檔紀錄</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1.5rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #334155; text-align:left; color:var(--text-secondary); font-size:0.9rem;">
                        <th style="padding:1rem;">資產編號</th><th style="padding:1rem;">品名</th><th style="padding:1rem;">報廢原因</th><th style="padding:1rem;">日期</th>
                    </tr></thead>
                    <tbody>${scrapData.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:3rem; opacity:0.3;">目前暫無雲端紀錄</td></tr>' :
            scrapData.map(s => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                            <td style="padding:1rem; color:var(--accent); font-weight:700;">${s.asset_no}</td>
                            <td style="padding:1rem;">${s.name}</td>
                            <td style="padding:1rem; font-size:0.9rem; opacity:0.7;">${s.reason || '-'}</td>
                            <td style="padding:1rem; font-size:0.85rem; color:var(--text-secondary);">${s.scrap_date}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSignHistory(main, title) {
    title.innerText = '手寫點收紀錄';
    main.innerHTML = `
        <div class="card">
            <h3>雲端數位簽章存證清單</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; margin-top:1.5rem; color:white;">
                    <thead><tr style="border-bottom:1px solid #334155; text-align:left; color:var(--text-secondary); font-size:0.9rem;">
                        <th style="padding:1rem;">簽署時間</th><th style="padding:1rem;">資產項目</th><th style="padding:1rem;">簽名預覽</th>
                    </tr></thead>
                    <tbody>${signData.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding:3rem; opacity:0.3;">目前無點收紀錄</td></tr>' :
            signData.map(s => `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                            <td style="padding:1rem; font-size:0.85rem; color:var(--text-secondary);">${s.timestamp.toDate ? s.timestamp.toDate().toLocaleString() : '-'}</td>
                            <td style="padding:1rem; font-weight:700; color:var(--accent);">${s.item_ids}</td>
                            <td style="padding:1rem;"><img src="${s.signature_img}" style="height:38px; background:white; border-radius:4px; padding:2px; cursor:zoom-in;" onclick="window.previewSign('${s.signature_img}')"></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
}

window.previewSign = (img) => { const w = window.open(""); w.document.write(`<body style='margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;'><img src='${img}' style='max-width:90%; border:5px solid #fff; background:#fff;'></body>`); };

// ---------------------------------
// 手機端簽名核心 (穩定防錯版)
// ---------------------------------
function renderSignMode(ids) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:35px; text-align:center; display:flex; flex-direction:column;">
            <div style="margin-bottom:30px;">
                <h2 style="font-size:1.6rem; color:var(--accent);">麥箖資產簽收</h2>
                <p style="color:var(--text-secondary); margin-top:10px;">欲簽收編號：${ids.join(', ')}</p>
            </div>
            <div style="background:white; border-radius:20px; box-shadow:0 15px 50px rgba(0,0,0,0.6); overflow:hidden; flex-grow:1; display:flex;">
                <canvas id="sp" style="width:100%; min-height:350px; cursor:crosshair; touch-action:none;"></canvas>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:20px;">請在白色區域內完成您的數位簽署</p>
            <div style="margin-top:20px; display:flex; gap:15px;">
                <button class="btn-outline" style="flex:1;" id="clearSign">清除</button>
                <button class="btn-primary" style="flex:2; justify-content:center;" id="saveBtn">執行簽收回傳</button>
            </div>
        </div>
    `;
    const canvas = document.getElementById('sp');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio; canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (window.SignaturePad) signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)' });

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveBtn').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請先完成簽署"); return; }
        const btn = document.getElementById('saveBtn'); btn.innerText = '連線雲端中...'; btn.disabled = true;
        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: signaturePad.toDataURL() });
            alert("✅ 成功！麥箖公司已收到您的簽收確認。"); window.location.href = './';
        } catch (e) { alert("失敗: " + e.message); btn.innerText = '執行簽收回傳'; btn.disabled = false; }
    };
}

// ---------------------------------
// 新增、編輯、報廢表單 (恢復欄位)
// ---------------------------------
function renderAddAsset(main, title) {
    title.innerText = '建立資產紀錄庫';
    main.innerHTML = `
        <div class="card">
            <h3>資產資料輸入</h3>
            <div class="form-group"><label>資產分類</label><select id="nc"><option value="PC">電腦 PC</option><option value="NB">筆電/平板 NB</option><option value="N">其它 N</option></select></div>
            <div class="form-group"><label>資產名稱</label><input type="text" id="nn" placeholder="例如：DELL 工作站 01"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="nu" placeholder="使用者姓名"></div>
            <div class="form-grid"><div class="form-group"><label>存放地點</label><input type="text" id="nl"></div><div class="form-group"><label>購買日期</label><input type="date" id="nd" value="${new Date().toISOString().split('T')[0]}"></div></div>
            <div class="form-group"><label>規格說明</label><textarea id="ns" rows="3"></textarea></div>
            <button class="btn-primary" id="sS" style="width:100%; justify-content:center; margin-top:20px;">送出至雲端存儲</button>
        </div>
    `;
    document.getElementById('sS').onclick = async () => {
        const cat = document.getElementById('nc').value;
        const no = `${cat}${String(assetsData.filter(x => x.category === cat).length + 1).padStart(3, '0')}`;
        await FIREBASE_API.addAsset({ asset_no: no, category: cat, name: document.getElementById('nn').value, custodian: document.getElementById('nu').value, location: document.getElementById('nl').value, purchase_date: document.getElementById('nd').value, specs: document.getElementById('ns').value, status: '使用中' });
        alert("新增成功！編號為 " + no); await refreshData(); window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    document.getElementById('mainSection').innerHTML = `
        <div class="card">
            <h3>編輯資產：${a.asset_no}</h3>
            <div class="form-group"><label>品名</label><input type="text" id="en" value="${a.name}"></div>
            <div class="form-group"><label>保管人</label><input type="text" id="eu" value="${a.custodian}"></div>
            <div class="form-group"><label>存放地點</label><input type="text" id="el" value="${a.location || ''}"></div>
            <div class="form-group"><label>購買日期</label><input type="date" id="ed" value="${a.purchase_date || ''}"></div>
            <div class="form-group"><label>規格說明</label><textarea id="es" rows="3">${a.specs || ''}</textarea></div>
            <div class="form-actions" style="display:flex; gap:10px; margin-top:30px;">
                <button class="btn-outline" style="flex:1;" onclick="window.location.hash='#assets'">取消</button>
                <button class="btn-primary" id="upB" style="flex:2; justify-content:center;">更新雲端數據</button>
            </div>
        </div>
    `;
    document.getElementById('upB').onclick = async () => {
        await FIREBASE_API.updateAsset(id, { name: document.getElementById('en').value, custodian: document.getElementById('eu').value, location: document.getElementById('el').value, purchase_date: document.getElementById('ed').value, specs: document.getElementById('es').value });
        alert("雲端同步成功！"); await refreshData(); window.location.hash = '#assets';
    };
}

function renderAddScrap(main, title) {
    const a = assetsData.find(x => x.id === sessionStorage.getItem('st'));
    main.innerHTML = `
        <div class="card">
            <h3>資產報廢：${a.asset_no}</h3>
            <div class="form-group"><label>報廢原因</label><textarea id="sr" placeholder="故障原因..."></textarea></div>
            <div class="form-group"><label>報廢日期</label><input type="date" id="sd" value="${new Date().toISOString().split('T')[0]}"></div>
            <button id="fS" class="btn-primary" style="width:100%; justify-content:center; background:var(--danger); margin-top:30px;">確認報廢並正式移出清單</button>
        </div>
    `;
    document.getElementById('fS').onclick = async () => {
        await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, reason: document.getElementById('sr').value, scrap_date: document.getElementById('sd').value });
        await FIREBASE_API.deleteAsset(a.id);
        alert("已移入報廢紀錄！"); await refreshData(); window.location.hash = '#scrapping';
    };
}

function renderSignManager(main, title) {
    title.innerText = '建立簽名連結';
    main.innerHTML = `
        <div class="card">
            <h3>點收對象勾選</h3>
            <div style="max-height:400px; overflow-y:auto; margin:20px 0;">
                ${assetsData.map(a => `<label style="display:block;margin:12px 0;"><input type="checkbox" class="sc" value="${a.asset_no}"> ${a.asset_no} - ${a.name}</label>`).join('')}
            </div>
            <button class="btn-primary" id="gB">產出點收連結並複製</button>
            <div id="uz" class="hidden" style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.3); border-radius:10px; word-break:break-all;"><code id="uv" style="color:var(--accent);"></code></div>
        </div>
    `;
    document.getElementById('gB').onclick = () => {
        const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
        if (ids.length === 0) { alert("請至少選一個"); return; }
        const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
        document.getElementById('uv').innerText = url; document.getElementById('uz').classList.remove('hidden');
        navigator.clipboard.writeText(url); alert("網址已成功產出並複製！");
    };
}

// 基礎功能
function checkAuth() { sessionStorage.getItem('isAdmin') === 'true' ? document.getElementById('loginOverlay').style.display = 'none' : document.getElementById('loginOverlay').style.display = 'flex'; }
function initNavigation() {
    document.getElementById('loginBtn').onclick = () => { if (document.getElementById('adminPassword').value === '671230') { sessionStorage.setItem('isAdmin', 'true'); checkAuth(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
    document.querySelectorAll('.nav-links li').forEach(li => li.onclick = () => { window.location.hash = '#' + li.dataset.page; });
    window.setFilter = (c) => { currentFilter = c; handleRouting(); };
    document.getElementById('mobileMenuBtn').onclick = () => document.querySelector('.sidebar').classList.add('active-sidebar');
}
function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }
