// 公司財產清單 - 手寫簽名模組（手機修正版）
import SignaturePad from 'https://cdn.jsdelivr.net/npm/signature_pad@5.0.2/+esm';

export class SignatureApp {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.signaturePad = null;
        this.canvas = null;
        this._ro = null;
    }

    renderUI(assetsList = []) {
        this.container.innerHTML = `
            <div class="fixed inset-0 bg-[#0f172a] text-slate-200 flex flex-col p-6 gap-4 touch-none overscroll-none overflow-hidden
                landscape:flex-row landscape:items-center landscape:p-4 landscape:gap-0">
                
                <!-- Header Component -->
                <header class="text-center shrink-0 landscape:text-left landscape:flex landscape:flex-col landscape:gap-1 landscape:pr-4 landscape:w-auto">
                    <h1 class="text-xl font-bold text-indigo-400 mb-1 lg:text-2xl tracking-tight uppercase">數位簽名確認</h1>
                    <p class="text-xs text-slate-500 mb-2 landscape:hidden">請確認簽收下列資產：</p>
                    <div class="flex flex-wrap gap-1.5 justify-center landscape:flex-col landscape:items-start landscape:m-0">
                        ${assetsList.map(id => `<span class="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold text-indigo-300 uppercase tracking-widest">${id}</span>`).join('')}
                    </div>
                </header>

                <!-- Canvas Sub-system -->
                <div class="flex-1 min-h-0 flex flex-col px-2 landscape:p-2 landscape:justify-center">
                    <div class="relative flex-1 min-h-[160px] border-2 border-dashed border-white/10 rounded-3xl bg-white overflow-hidden shadow-2xl
                        landscape:flex-none landscape:h-[120px] landscape:max-w-[280px]">
                        <canvas id="signatureCanvas" class="block w-full h-full cursor-crosshair touch-none"></canvas>
                        <div class="absolute bottom-3 inset-x-0 text-center text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-300 pointer-events-none select-none">
                            Please sign here
                        </div>
                    </div>
                </div>

                <!-- Action System -->
                <div class="grid grid-cols-2 gap-4 shrink-0 pb-[env(safe-area-inset-bottom,0)] 
                    landscape:flex landscape:flex-col landscape:gap-2 landscape:p-0 landscape:w-[120px]">
                    <button id="clearBtn" class="bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm
                        landscape:py-2.5 landscape:text-xs">
                        清除重簽
                    </button>
                    <button id="confirmBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-indigo-500/10 transition-all active:scale-95 text-sm
                        landscape:py-2.5 landscape:text-xs">
                        確認送出
                    </button>
                </div>
            </div>
        `;

        this.initCanvas();
        this.initButtons();
    }

    initCanvas() {
        this.canvas = document.getElementById('signatureCanvas');

        // ✅ 修正 #5：backgroundColor 改為不透明白，toDataURL 匯出背景一致
        this.signaturePad = new SignaturePad(this.canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: '#1e1b4b',
            velocityFilterWeight: 0.7,
            minWidth: 1.5,
            maxWidth: 3,
        });

        let lastWidth = 0;

        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();

            // ✅ 修正 #1：只在寬度有實質變化時才 resize，避免 iOS 網址列收起觸發
            if (Math.abs(rect.width - lastWidth) < 5) return;
            lastWidth = rect.width;

            const ratio = Math.max(window.devicePixelRatio || 1, 1);

            // ✅ 修正 #2：resize 後不嘗試還原舊座標（座標系已變，還原會偏移），直接清除
            this.canvas.width = rect.width * ratio;
            this.canvas.height = rect.height * ratio;
            this.canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
            this.signaturePad.clear();
        };

        // ✅ 修正 #1：用雙層 rAF 確保 DOM layout 完全穩定後再初始化，比 setTimeout(100) 可靠
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resizeCanvas();
            });
        });

        // ✅ 改為觀察 canvas-container（有明確尺寸的父容器），避免觀察 canvas 本身觸發循環
        this._ro = new ResizeObserver(() => resizeCanvas());
        this._ro.observe(this.canvas.parentElement);
    }

    initButtons() {
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.signaturePad.clear();
        });

        document.getElementById('confirmBtn').addEventListener('click', async () => {
            if (this.signaturePad.isEmpty()) {
                alert('請先完成簽名！');
                return;
            }

            // ✅ 使用 image/png 明確指定格式，避免瀏覽器預設不同
            const dataURL = this.signaturePad.toDataURL('image/png');
            console.log('簽名影像已產出:', dataURL);

            // 此處未來將介接 Supabase Upload
            alert('簽名已完成！資料正在同步中...');

            // ✅ 離開前釋放 ResizeObserver，避免記憶體洩漏
            if (this._ro) {
                this._ro.disconnect();
                this._ro = null;
            }

            window.location.hash = 'dashboard';
        });
    }
}