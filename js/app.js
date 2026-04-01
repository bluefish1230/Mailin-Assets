/* 公司資產管理系統 - 核心引擎 v14.0 (視覺強化版) */
import FIREBASE_API from './api.js';

let assetsData = [];
let scrapData = [];
let signData = [];
let transfersData = [];
let currentFilter = 'ALL';
let searchQuery = '';
let selectedAssets = new Set();
let signaturePad = null;

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    checkAuth();
    const mainSection = document.getElementById('mainSection');
    mainSection.innerHTML = '<div class="loading">正在連結雲端資料庫...</div>';
    await refreshData();
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});

async function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const main = document.getElementById('mainSection');
    const title = document.getElementById('pageTitle');

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
            case '#transfers': renderTransferHistory(main, title); break;
            case '#add-asset': renderAddAsset(main, title); break;
            default: renderDashboard(main, title);
        }
    }
    safeCreateIcons();
}

async function refreshData() {
    try {
        assetsData = await FIREBASE_API.fetchAssets();
        scrapData = await FIREBASE_API.fetchScraps();
        signData = await FIREBASE_API.fetchSignatures();
        transfersData = await FIREBASE_API.fetchTransfers();
    } catch (e) { console.error(e); }
}

// ---------------------------------
// 精華：資產列表 (具備簽名預覽與放大功能)
// ---------------------------------
function renderAssetList(main, title) {
    title.innerText = '資產清單管理';

    let filtered = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
            (a.custodian || '').toLowerCase().includes(q) ||
            (a.name || '').toLowerCase().includes(q) ||
            (a.asset_no || '').toLowerCase().includes(q) ||
            (a.location || '').toLowerCase().includes(q)
        );
    }

    main.innerHTML = `
        <div class="flex flex-col gap-6 mb-8">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div class="flex flex-wrap gap-2">
                    ${['ALL', 'PC', 'NB', 'N'].map(c => {
        const count = c === 'ALL' ? assetsData.length : assetsData.filter(a => a.category === c).length;
        const active = currentFilter === c;
        return `
                            <button onclick="window.setFilter('${c}')" 
                                class="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
                                ${active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}">
                                ${c} <span class="opacity-60 text-xs font-normal">(${count})</span>
                            </button>`;
    }).join('')}
                </div>
                
                <div class="flex items-center gap-4 flex-1 lg:max-w-md">
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                        <input type="text" id="assetSearch" placeholder="搜尋保管人、品名或編號..." value="${searchQuery}" 
                            class="w-full bg-[#0f172a] border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    </div>
                    <button onclick="window.location.hash='#add-asset'" 
                        class="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/10 flex items-center gap-2 whitespace-nowrap transition-all">
                        <i data-lucide="plus" class="w-4 h-4"></i> 新增資產
                    </button>
                </div>
            </div>
            
            <div id="batchActions" class="${selectedAssets.size > 0 ? 'flex' : 'hidden'} items-center justify-between gap-4 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black">
                        ${selectedAssets.size}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-indigo-400">已選取資產</p>
                        <button onclick="window.clearSelection()" class="text-xs text-slate-500 hover:text-slate-300 underline decoration-dotted">取消全選</button>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap justify-end">
                    <input type="text" id="newCustodian" placeholder="新保管人" class="bg-[#0f172a] border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-32">
                    <input type="text" id="newLocation" placeholder="新地點" class="bg-[#0f172a] border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-32">
                    <button onclick="window.batchUpdateAssets()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors">批次變更</button>
                    <button onclick="window.batchScrap()" class="bg-rose-500/20 text-rose-500 border border-rose-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1">
                        <i data-lucide="trash-2" class="w-3 h-3"></i> 批次報廢
                    </button>
                </div>
            </div>
            
            <div class="flex items-center gap-3 px-4 py-2 bg-white/3 rounded-xl w-fit">
                <input type="checkbox" id="selectAll" ${filtered.length > 0 && filtered.every(a => selectedAssets.has(a.id)) ? 'checked' : ''} 
                    onclick="window.toggleSelectAll(this.checked)" class="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0">
                <label for="selectAll" class="text-xs font-medium text-slate-400 cursor-pointer">全選目前列表 (${filtered.length})</label>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            ${filtered.map(a => {
        const latestSign = signData.find(s => s.item_ids.includes(a.asset_no));
        const isSelected = selectedAssets.has(a.id);
        return `
                <div class="group relative bg-[#1e293b] border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-black/40 
                    ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/5 border-transparent' : ''}">
                    
                    <!-- Selection Overlay -->
                    <div class="absolute top-4 left-4 z-10 transition-opacity">
                        <input type="checkbox" data-id="${a.id}" ${isSelected ? 'checked' : ''} onclick="window.toggleSelect('${a.id}')"
                            class="w-5 h-5 rounded-lg border-white/10 bg-[#0f172a] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer shadow-lg transform transition-transform active:scale-90">
                    </div>
                    
                    <div class="flex justify-between items-start mb-4">
                        <div class="pl-8">
                            <span class="inline-block px-2.5 py-1 rounded-lg text-[0.65rem] font-black uppercase tracking-wider mb-2
                                ${a.category === 'PC' ? 'bg-blue-500/20 text-blue-400' : a.category === 'NB' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'}">
                                ${a.category}
                            </span>
                            <div class="text-xs font-mono font-bold text-indigo-400/80 mb-1 leading-none uppercase tracking-tighter">${a.asset_no}</div>
                            <h3 class="text-lg font-bold text-white leading-tight mb-4 group-hover:text-indigo-300 transition-colors">${a.name}</h3>
                        </div>
                        ${latestSign ? `
                        <div class="relative group/sign cursor-zoom-in" onclick="window.previewSign('${latestSign.signature_img}')">
                            <div class="absolute -inset-2 bg-indigo-500/20 rounded-2xl blur opacity-0 group-hover/sign:opacity-100 transition-opacity"></div>
                            <img src="${latestSign.signature_img}" class="relative w-20 h-14 bg-white rounded-xl p-1 shadow-xl border-2 border-slate-700 object-contain grayscale group-hover/sign:grayscale-0 transition-all">
                            <p class="text-[0.6rem] text-center font-black text-indigo-400 mt-2 tracking-widest uppercase">E-Signed</p>
                        </div>` : ''}
                    </div>

                    <div class="space-y-3 mb-6">
                        <div class="flex items-center gap-3 text-sm">
                            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <i data-lucide="user" class="w-4 h-4 text-slate-500"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[0.6rem] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Custodian</p>
                                <p class="text-slate-200 font-semibold truncate">${a.custodian}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 text-sm">
                            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <i data-lucide="package" class="w-4 h-4 text-slate-500"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[0.6rem] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Spec</p>
                                <p class="text-slate-400 truncate">${a.spec || '-'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 text-sm">
                            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <i data-lucide="map-pin" class="w-4 h-4 text-slate-500"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[0.6rem] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Office</p>
                                <p class="text-slate-400 truncate">${a.location || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.location.hash='#edit/${a.id}'" 
                            class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-xl text-xs font-bold transition-all">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> 編輯
                        </button>
                        <button onclick="window.scrapAsset('${a.id}')"
                            class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-orange-500/10 hover:text-orange-400 rounded-xl text-xs font-bold transition-all">
                            <i data-lucide="archive" class="w-3 h-3"></i> 報廢
                        </button>
                        <button onclick="window.deleteAsset('${a.id}')"
                            class="w-10 flex items-center justify-center py-2.5 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>`;
    }).join('')}
            ${filtered.length === 0 ? `
                <div class="col-span-full py-20 flex flex-col items-center justify-center bg-white/3 rounded-[3rem] border-2 border-dashed border-white/5">
                    <div class="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                        <i data-lucide="database-zap" class="w-8 h-8 text-slate-700"></i>
                    </div>
                    <p class="text-slate-500 font-bold tracking-widest uppercase text-sm">No assets found</p>
                    <p class="text-slate-600 text-xs mt-1">請嘗試調整篩選條件或關鍵字</p>
                </div>
            ` : ''}
        </div>
    `;

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
            <div style="background:white; border-radius:20px; flex:1; position:relative; overflow:hidden; min-height:400px; box-shadow:inset 0 0 10px rgba(0,0,0,0.1);">
                <canvas id="sp" style="position:absolute; top:0; left:0; width:100%; height:100%; touch-action:none; cursor:crosshair;"></canvas>
            </div>
            <div style="margin-top:20px; display:flex; gap:15px; flex-shrink:0;">
                <button class="btn-outline" style="flex:1; border-color:#334155; height:50px;" id="clearSign">重簽</button>
                <button class="btn-primary" style="flex:2; justify-content:center; height:50px;" id="saveBtn">本人確認送出</button>
            </div>
        </div>
    `;
    const canvas = document.getElementById('sp');
    const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0); // 重設變換
        ctx.scale(ratio, ratio);
        if (signaturePad) signaturePad.clear();
    };

    // 多次檢查並重設，確保穩定
    const initPad = () => {
        resizeCanvas();
        if (window.SignaturePad) {
            signaturePad = new SignaturePad(canvas, { penColor: 'rgb(15, 23, 42)', minWidth: 2, maxWidth: 5 });
        }
    };

    setTimeout(initPad, 100);
    setTimeout(initPad, 500); // 二度校正
    window.onresize = resizeCanvas;

    document.getElementById('clearSign').onclick = () => signaturePad.clear();
    document.getElementById('saveBtn').onclick = async () => {
        if (signaturePad.isEmpty()) { alert("請先完成簽署"); return; }
        const b = document.getElementById('saveBtn'); b.innerText = '雲端存檔中...'; b.disabled = true;
        const imgData = signaturePad.toDataURL();
        try {
            await FIREBASE_API.addSignature({ item_ids: ids.join(','), signature_img: imgData });
            renderSignSuccess(ids, imgData);
        } catch (e) { alert("上傳失敗"); b.innerText = '本人確認送出'; b.disabled = false; }
    };
}

function renderSignSuccess(ids, img) {
    document.body.innerHTML = `
        <div style="background:#0f172a; color:white; min-height:100vh; padding:35px; display:flex; justify-content:center; align-items:center;">
            <div class="card" style="max-width:500px; width:100%; text-align:center; animation: fadeIn 0.5s ease-out;">
                <div style="margin-bottom:25px;">
                    <i data-lucide="check-circle" style="width:64px; height:64px; color:#22c55e; margin:0 auto 15px;"></i>
                    <h2 style="color:#22c55e;">資產點收成功！</h2>
                    <p style="color:var(--text-secondary); margin-top:10px;">感謝您的配合，簽署紀錄已加密存檔</p>
                </div>
                <div style="background:#1e293b; border-radius:15px; padding:20px; margin-bottom:25px; border:1px solid var(--border-color); text-align:left;">
                    <div style="color:var(--accent); font-size:0.8rem; font-weight:600; margin-bottom:5px;">簽收單據預覽</div>
                    <div style="font-size:1rem; font-weight:700; margin-bottom:5px;">簽收編號: ${ids.join(', ')}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:15px;">時間: ${new Date().toLocaleString()}</div>
                    <div style="background:white; border-radius:10px; padding:10px; display:flex; justify-content:center;">
                        <img src="${img}" style="max-width:100%; height:120px; object-fit:contain;">
                    </div>
                </div>
                <button class="btn-primary" style="width:100%; justify-content:center;" onclick="window.location.href='./'">回到系統首頁</button>
            </div>
        </div>
    `;
    safeCreateIcons();
}

// 其餘功能模組不變 ...
function renderDashboard(main, title) {
    title.innerText = '儀表板';
    main.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div class="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/5 transition-transform hover:scale-[1.02]">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-3 bg-indigo-500 text-white rounded-2xl"><i data-lucide="database"></i></div>
                    <p class="text-sm font-bold text-indigo-400 uppercase tracking-widest">在用資產</p>
                </div>
                <p class="text-5xl font-black text-white">${assetsData.length}</p>
            </div>
            <div class="bg-orange-500/10 border border-orange-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-orange-500/5 transition-transform hover:scale-[1.02]">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-3 bg-orange-500 text-white rounded-2xl"><i data-lucide="trash-2"></i></div>
                    <p class="text-sm font-bold text-orange-400 uppercase tracking-widest">報廢總數</p>
                </div>
                <p class="text-5xl font-black text-white">${scrapData.length}</p>
            </div>
            <div class="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-500/5 transition-transform hover:scale-[1.02]">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-3 bg-emerald-500 text-white rounded-2xl"><i data-lucide="file-signature"></i></div>
                    <p class="text-sm font-bold text-emerald-400 uppercase tracking-widest">點收存單</p>
                </div>
                <p class="text-5xl font-black text-white">${signData.length}</p>
            </div>
            <div class="bg-purple-500/10 border border-purple-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-purple-500/5 transition-transform hover:scale-[1.02]">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-3 bg-purple-500 text-white rounded-2xl"><i data-lucide="history"></i></div>
                    <p class="text-sm font-bold text-purple-400 uppercase tracking-widest">異動紀錄</p>
                </div>
                <p class="text-5xl font-black text-white">${transfersData.length}</p>
            </div>
        </div>
    `;
}

function renderAddAsset(main, title) {
    title.innerText = '新增財產資產';
    main.innerHTML = `
        <div class="max-w-4xl bg-[#1e293b] border border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
            <h3 class="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <i data-lucide="plus-circle" class="text-indigo-400"></i> 資產建檔
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">類別 (PC, NB, N)</label>
                    <select id="nc" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        <option value="PC">PC (桌機)</option>
                        <option value="NB">NB (筆電)</option>
                        <option value="N">N (其他)</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">品名</label>
                    <input type="text" id="nn" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                </div>
            </div>
            
            <div class="space-y-2 mb-8">
                <label class="block text-xs font-black uppercase tracking-widest text-slate-500">規格精確描述</label>
                <input type="text" id="nsp" placeholder="例如: i7-13700 / 32G / 1TB" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">保管人</label>
                    <input type="text" id="nu" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                </div>
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">存放地點</label>
                    <input type="text" id="nl" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">採購日期</label>
                    <input type="date" id="npd" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                </div>
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-amber-500">一次新增數量 (1-20)</label>
                    <input type="number" id="nq" value="1" min="1" max="20" class="w-full bg-amber-500/5 border border-amber-500/20 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-amber-400 font-bold">
                </div>
            </div>

            <button id="sS" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                <i data-lucide="cloud-upload"></i> 確認儲存並建立資產
            </button>
        </div>`;
    document.getElementById('sS').onclick = async () => {
        const category = document.getElementById('nc').value;
        const count = parseInt(document.getElementById('nq').value) || 1;

        // 暫時載入一次最新數據以確保流水號準確
        await refreshData();

        const results = [];
        for (let i = 0; i < count; i++) {
            // 自動生成編號：類別(PC/NB/N) + 三位數流水號 (包含在用與報廢)
            const prefix = category;
            const allRelevant = [
                ...assetsData.filter(a => a.asset_no && a.asset_no.startsWith(prefix)),
                ...scrapData.filter(s => s.asset_no && s.asset_no.startsWith(prefix)),
                ...results // 包含在此次迴圈中剛生成的編號
            ];

            let nextNumber = 1;
            if (allRelevant.length > 0) {
                const numbers = allRelevant.map(item => {
                    const numStr = item.asset_no.replace(prefix, '').replace('-', '');
                    return parseInt(numStr);
                }).filter(n => !isNaN(n));
                if (numbers.length > 0) nextNumber = Math.max(...numbers) + 1;
            }
            const no = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

            const data = {
                asset_no: no,
                category: category,
                name: document.getElementById('nn').value,
                spec: document.getElementById('nsp').value,
                custodian: document.getElementById('nu').value,
                location: document.getElementById('nl').value,
                purchase_date: document.getElementById('npd').value
            };
            results.push(data);
        }

        const btn = document.getElementById('sS');
        btn.innerText = `正在批量產生中 (${count}筆)...`; btn.disabled = true;

        for (const item of results) {
            await FIREBASE_API.addAsset(item);
        }

        alert(`✅ 批量登記成功！累計新增 ${count} 筆資產。`);
        await refreshData();
        window.location.hash = '#assets';
    };
}

function renderEditPage(id) {
    const a = assetsData.find(x => x.id === id);
    if (!a) return;

    document.getElementById('pageTitle').innerText = `編輯資產：${a.asset_no}`;
    document.getElementById('mainSection').innerHTML = `
        <div class="max-w-4xl bg-[#1e293b] border border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
            <h3 class="text-2xl font-bold text-white mb-10 flex items-center gap-3">
                <i data-lucide="edit-3" class="text-indigo-400"></i> 資產內容修訂
            </h3>
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-2">
                        <label class="block text-xs font-black uppercase tracking-widest text-slate-500">品名</label>
                        <input type="text" id="en" value="${a.name}" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-black uppercase tracking-widest text-slate-500">規格</label>
                        <input type="text" id="esp" value="${a.spec || ''}" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-2">
                        <label class="block text-xs font-black uppercase tracking-widest text-indigo-400">保管人 (異動將紀錄至日誌)</label>
                        <input type="text" id="eu" value="${a.custodian}" class="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-200 font-bold">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-black uppercase tracking-widest text-slate-500">存放地點</label>
                        <input type="text" id="el" value="${a.location || ''}" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-xs font-black uppercase tracking-widest text-slate-500">採購日期</label>
                    <input type="date" id="ed" value="${a.purchase_date || ''}" class="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                </div>
                <div class="flex items-center gap-4 pt-6">
                    <button id="uB" class="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                        儲存變更
                    </button>
                    <button onclick="window.location.hash='#assets'" class="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-4 rounded-2xl transition-all">
                        取消
                    </button>
                </div>
            </div>
        </div>`;

    document.getElementById('uB').onclick = async () => {
        const newName = document.getElementById('en').value;
        const newSpec = document.getElementById('esp').value;
        const newCustodian = document.getElementById('eu').value;
        const newLocation = document.getElementById('el').value;
        const newDate = document.getElementById('ed').value;

        // 如果保管人有變更，紀錄異動
        if (newCustodian !== a.custodian) {
            await FIREBASE_API.addTransfer({
                asset_no: a.asset_no,
                name: a.name,
                from: a.custodian,
                to: newCustodian,
                reason: '手動修改'
            });
        }

        await FIREBASE_API.updateAsset(id, { name: newName, spec: newSpec, custodian: newCustodian, location: newLocation, purchase_date: newDate });
        alert("✅ 資料更新成功！");
        await refreshData();
        window.location.hash = '#assets';
    };
}

function renderScrapping(main, title) {
    title.innerText = '報廢資產清冊';
    main.innerHTML = `
        <div class="bg-[#1e293b] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-white/5 text-slate-500 text-[0.65rem] font-black uppercase tracking-[0.2em]">
                            <th class="px-8 py-5">編號/品名</th>
                            <th class="px-8 py-5">規格概略</th>
                            <th class="px-8 py-5">採購日期</th>
                            <th class="px-8 py-5">報廢時間點</th>
                            <th class="px-8 py-5">處理狀態</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        ${scrapData.map(s => `
                            <tr class="hover:bg-white/3 transition-colors">
                                <td class="px-8 py-6">
                                    <div class="font-mono text-indigo-400 font-bold mb-1">${s.asset_no}</div>
                                    <div class="text-sm font-semibold text-white">${s.name}</div>
                                </td>
                                <td class="px-8 py-6 text-sm text-slate-400">${s.spec || '-'}</td>
                                <td class="px-8 py-6 text-sm text-slate-400">${s.purchase_date || '-'}</td>
                                <td class="px-8 py-6 text-sm text-slate-500 font-mono italic">${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                                <td class="px-8 py-6">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[0.65rem] font-bold uppercase tracking-wider">
                                        <i data-lucide="x-circle" class="w-3 h-3"></i> 已報廢
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${scrapData.length === 0 ? `
                <div class="py-20 flex flex-col items-center justify-center italic text-slate-600">
                    <i data-lucide="package-x" class="w-12 h-12 mb-4 opacity-20"></i>
                    目前暫無資產報廢紀錄
                </div>
            ` : ''}
        </div>
    `;
}

function renderSignHistory(main, title) {
    title.innerText = '手寫點收紀錄';
    main.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            ${signData.map(s => `
                <div class="bg-[#1e293b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl hover:border-emerald-500/30 transition-all group">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[0.65rem] font-bold uppercase tracking-widest mb-3">
                                <i data-lucide="file-check" class="w-3 h-3"></i> 簽收單據
                            </span>
                            <div class="text-sm font-black text-white leading-tight uppercase tracking-tight">${s.item_ids}</div>
                            <div class="text-[0.65rem] text-slate-500 font-mono mt-2 italic">${s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl p-4 flex justify-center items-center shadow-inner h-40 group-hover:scale-[1.02] transition-transform">
                        <img src="${s.signature_img}" class="max-w-full max-h-full object-contain">
                    </div>
                    <div class="mt-6 flex justify-end">
                        <button onclick="window.previewSign('${s.signature_img}')" 
                            class="px-4 py-2 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all">
                            View Original
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        ${signData.length === 0 ? `
            <div class="py-20 flex flex-col items-center justify-center bg-white/3 rounded-[3rem] border-2 border-dashed border-white/5 italic text-slate-600">
                尚未有任何數位簽收紀錄
            </div>
        ` : ''}
    `;
}

function renderTransferHistory(main, title) {
    title.innerText = '保管人異動明細';
    main.innerHTML = `
        <div class="bg-[#1e293b] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-white/5 text-slate-500 text-[0.65rem] font-black uppercase tracking-[0.2em]">
                            <th class="px-8 py-5">異動時間</th>
                            <th class="px-8 py-5">資產編號 / 品名</th>
                            <th class="px-8 py-5">原保管人</th>
                            <th class="px-8 py-5">目標保管人</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        ${transfersData.map(t => `
                            <tr class="hover:bg-white/3 transition-colors">
                                <td class="px-8 py-6 text-[0.65rem] text-slate-500 font-mono italic">
                                    ${t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'N/A'}
                                </td>
                                <td class="px-8 py-6">
                                    <div class="font-mono text-indigo-400 font-bold mb-1 leading-none uppercase tracking-tighter">${t.asset_no}</div>
                                    <div class="text-sm font-semibold text-white">${t.name}</div>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-xs inline-block line-through opacity-60">
                                        ${t.from || '-'}
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-black inline-flex items-center gap-2">
                                        <i data-lucide="arrow-right" class="w-3 h-3"></i> ${t.to}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${transfersData.length === 0 ? `
                <div class="py-20 flex flex-col items-center justify-center italic text-slate-600">
                    目前尚未有資產轉移異動紀錄
                </div>
            ` : ''}
        </div>
    `;
}

function renderSignManager(main, title) {
    title.innerText = '產生點收連結';
    let smFilter = 'ALL';

    const redraw = () => {
        const list = smFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === smFilter);
        main.innerHTML = `
            <div class="max-w-4xl bg-[#1e293b] border border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
                <div class="mb-10">
                    <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">1. 篩選資產類別</h3>
                    <div class="flex flex-wrap gap-2">
                        ${['ALL', 'PC', 'NB', 'N'].map(c => `
                            <button id="smf-${c}" class="px-5 py-2 rounded-xl text-sm font-bold transition-all
                                ${smFilter === c ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'}">${c}</button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-10">
                    <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">2. 勾選資產編號</h3>
                    <div class="max-h-[350px] overflow-y-auto border border-white/10 rounded-2xl p-4 bg-[#0f172a] divide-y divide-white/5">
                        ${list.length === 0 ? '<p class="py-10 text-center text-slate-600 italic">該分類下目前無在用資產</p>' : list.map(a => `
                            <label class="flex items-center gap-4 p-4 hover:bg-white/3 cursor-pointer group transition-colors">
                                <input type="checkbox" class="sc w-5 h-5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500" value="${a.asset_no}">
                                <span class="font-mono font-black text-indigo-400 group-hover:text-indigo-300 transition-colors uppercase tracking-widest">${a.asset_no}</span>
                                <span class="text-sm text-slate-300 font-semibold">${a.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="space-y-6">
                    <button id="gB" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                        <i data-lucide="link"></i> 建立並複製點收網址
                    </button>
                    
                    <div id="uz" class="hidden animate-in zoom-in-95 duration-300 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                        <div class="flex items-center gap-3 mb-3 text-emerald-400">
                            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                            <p class="text-sm font-black uppercase tracking-widest">網址已複製到剪貼簿</p>
                        </div>
                        <code id="uv" class="block w-full p-4 bg-black/40 rounded-xl text-xs text-emerald-300 font-mono break-all leading-relaxed border border-white/5"></code>
                    </div>
                </div>
            </div>
        `;

        ['ALL', 'PC', 'NB', 'N'].forEach(c => {
            document.getElementById(`smf-${c}`).onclick = () => { smFilter = c; redraw(); };
        });

        document.getElementById('gB').onclick = () => {
            const ids = Array.from(document.querySelectorAll('.sc:checked')).map(i => i.value);
            if (ids.length === 0) return alert("請至少勾選一個資產");
            const url = `${window.location.origin}${window.location.pathname}#sign/${ids.join(',')}`;
            document.getElementById('uv').innerText = url;
            document.getElementById('uz').classList.remove('hidden');
            navigator.clipboard.writeText(url);
        };
    };

    redraw();
}

function checkAuth() {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    const overlay = document.getElementById('loginOverlay');
    if (!overlay) return;
    if (isAdmin) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    }
}

window.batchUpdateAssets = async () => {
    const newVal = document.getElementById('newCustodian').value;
    const newLoc = document.getElementById('newLocation').value;
    if (!newVal && !newLoc) return alert("請至少輸入一項（新保管人或新地點）");
    let confirmMsg = `確定要將這 ${selectedAssets.size} 項資產進行異動嗎？`;
    if (newVal) confirmMsg += `\n- 新保管人: ${newVal}`;
    if (newLoc) confirmMsg += `\n- 新地點: ${newLoc}`;
    if (!confirm(confirmMsg)) return;

    try {
        const list = Array.from(selectedAssets);
        for (const id of list) {
            const a = assetsData.find(x => x.id === id);
            const updateData = {};
            if (newVal && a.custodian !== newVal) {
                updateData.custodian = newVal;
                await FIREBASE_API.addTransfer({
                    asset_no: a.asset_no,
                    name: a.name,
                    from: a.custodian,
                    to: newVal,
                    reason: '批次異動'
                });
            }
            if (newLoc) updateData.location = newLoc;
            if (Object.keys(updateData).length > 0) await FIREBASE_API.updateAsset(id, updateData);
        }
        alert("✅ 批次變更成功");
        selectedAssets.clear();
        await refreshData();
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    } catch (e) { alert("變更失敗: " + e.message); }
};

window.deleteAsset = async (id) => {
    const a = assetsData.find(x => x.id === id);
    if (!confirm(`確定要「永久刪除」資產 ${a.asset_no} (${a.name}) 嗎？\n此動作不可復原！`)) return;
    try {
        await FIREBASE_API.deleteAsset(id);
        alert("已刪除");
        await refreshData();
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    } catch (e) { alert("刪除失敗"); }
};

window.batchScrap = async () => {
    if (!confirm(`確定要將這 ${selectedAssets.size} 項資產報廢嗎？注意：此操作無法復原。`)) return;
    try {
        const list = Array.from(selectedAssets);
        for (const id of list) {
            const a = assetsData.find(x => x.id === id);
            if (a) {
                await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, spec: a.spec || '', purchase_date: a.purchase_date || '' });
                await FIREBASE_API.deleteAsset(id);
            }
        }
        alert("✅ 批次報廢完成");
        selectedAssets.clear();
        await refreshData();
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    } catch (e) { alert("報廢過程出錯: " + e.message); }
};

window.scrapAsset = async (id) => {
    const a = assetsData.find(x => x.id === id);
    if (!confirm(`確定要將資產 ${a.asset_no} (${a.name}) 報廢嗎？`)) return;
    try {
        await FIREBASE_API.addScrap({ asset_no: a.asset_no, name: a.name, spec: a.spec || '', purchase_date: a.purchase_date || '' });
        await FIREBASE_API.deleteAsset(id);
        alert("報廢成功");
        await refreshData();
        renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
    } catch (e) { alert("報廢失敗"); }
};

window.clearAllDatabaseRecords = async () => {
    if (!confirm("🚨 警告：確定要清空資料庫中「所有」的資產、報廢、簽名、以及異動紀錄嗎？\n此動作發生後資料將永遠消失，無法復原！")) return;
    if (prompt("請輸入 'RESET' 以確認執行 (全大寫)：") !== 'RESET') return alert("取消操作");
    try {
        for (const a of assetsData) await FIREBASE_API.deleteAsset(a.id);
        for (const s of scrapData) await FIREBASE_API.deleteScrap(s.id);
        for (const si of signData) await FIREBASE_API.deleteSignature(si.id);
        for (const t of transfersData) await FIREBASE_API.deleteTransfer(t.id);
        alert("✅ 全系統資料已清空歸零。");
        selectedAssets.clear();
        await refreshData();
        handleRouting();
    } catch (e) { alert("清空失敗: " + e.message); }
};

// 全域輔助函數
window.setFilter = (c) => { currentFilter = c; handleRouting(); };

window.toggleSelect = (id) => {
    if (selectedAssets.has(id)) selectedAssets.delete(id);
    else selectedAssets.add(id);
    renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
};

window.toggleSelectAll = (checked) => {
    const list = currentFilter === 'ALL' ? assetsData : assetsData.filter(a => a.category === currentFilter);
    const q = searchQuery.toLowerCase();
    const filtered = searchQuery ? list.filter(a =>
        (a.custodian || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q) || (a.asset_no || '').toLowerCase().includes(q)
    ) : list;
    if (checked) filtered.forEach(a => selectedAssets.add(a.id));
    else filtered.forEach(a => selectedAssets.delete(a.id));
    renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle'));
};

window.clearSelection = () => { selectedAssets.clear(); renderAssetList(document.getElementById('mainSection'), document.getElementById('pageTitle')); };

function initNavigation() {
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');

    if (loginBtn && passwordInput) {
        loginBtn.onclick = (e) => {
            e.preventDefault();
            if (passwordInput.value.trim() === '671230') {
                sessionStorage.setItem('isAdmin', 'true');
                loginError.classList.add('hidden');
                checkAuth();
                handleRouting();
            } else {
                loginError.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }
        };
        passwordInput.onkeypress = (e) => { if (e.key === 'Enter') loginBtn.click(); };
    }
}

function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 200); }

// 初始化
initNavigation();
checkAuth();
