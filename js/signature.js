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
            <div class="sign-viewport">
                <header class="sign-header">
                    <h1>數位簽名確認</h1>
                    <p>確認簽收下列資產：</p>
                    <div class="asset-chips">
                        ${assetsList.map(id => `<span class="chip">${id}</span>`).join('')}
                    </div>
                </header>

                <div class="canvas-wrapper">
                    <div class="canvas-container">
                        <canvas id="signatureCanvas"></canvas>
                        <div class="canvas-hint">請在上方空白區域手寫簽名</div>
                    </div>
                </div>

                <div class="sign-actions">
                    <button id="clearBtn" class="btn-outline">清除重新簽名</button>
                    <button id="confirmBtn" class="btn-primary">確認送出並關閉</button>
                </div>
            </div>
        `;

        this.appendStyles();
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

    appendStyles() {
        if (document.getElementById('signature-styles')) return;
        const style = document.createElement('style');
        style.id = 'signature-styles';
        style.textContent = `
            /* ── 直向（預設）── */
            .sign-viewport {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                padding: 1.5rem;
                box-sizing: border-box;
                background: var(--bg-dark);
                touch-action: none;
                overscroll-behavior: none;
                overflow: hidden;

                /* ✅ 修正 #3：用 inset: 0 取代 min-height: 100dvh，
                   在 iOS Safari 上 position:fixed + dvh 組合有已知渲染問題 */
                position: fixed;
                inset: 0;
            }

            .sign-header {
                text-align: center;
                flex-shrink: 0;
            }
            .sign-header h1 {
                font-size: 1.2rem;
                margin: 0 0 0.3rem;
                color: var(--primary);
            }
            .sign-header p {
                font-size: 0.85rem;
                margin: 0;
            }

            .asset-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                justify-content: center;
                margin: 0.5rem 0;
            }
            .chip {
                background: var(--bg-surface-elevated);
                padding: 0.2rem 0.6rem;
                border-radius: 20px;
                font-size: 0.75rem;
                border: 1px solid var(--border-color);
            }

            /* ✅ 新增 canvas-wrapper 撐滿剩餘空間，canvas-container 隨之拉伸 */
            .canvas-wrapper {
                flex: 1;
                min-height: 0; /* 關鍵：讓 flex child 可以縮小，不會撐破父容器 */
                display: flex;
                flex-direction: column;
                padding: 0 0.5rem;
            }

            .canvas-container {
                position: relative;
                border: 2px dashed rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                overflow: hidden;
                background: rgb(255, 255, 255);
                flex: 1;
                min-height: 160px;
            }

            #signatureCanvas {
                display: block;
                width: 100%;
                height: 100%;
                touch-action: none;
                cursor: crosshair;
            }

            .canvas-hint {
                position: absolute;
                bottom: 0.5rem;
                left: 0;
                width: 100%;
                text-align: center;
                color: #999;
                pointer-events: none;
                font-size: 0.75rem;
                user-select: none;
            }

            .sign-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                flex-shrink: 0;
                padding-bottom: env(safe-area-inset-bottom, 0); /* ✅ 支援 iPhone 底部安全區 */
            }

            .btn-outline {
                background: transparent;
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 0.8rem;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .btn-primary {
                padding: 0.8rem;
                font-size: 0.9rem;
            }

            /* ── 橫向模式 ── */
            @media (orientation: landscape) and (max-height: 600px) {
                .sign-viewport {
                    padding: 0.5rem 1rem;
                    gap: 0.5rem;
                    flex-direction: column;
                }

                .sign-header {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 1rem;
                    text-align: left;
                }
                .sign-header h1 { font-size: 1rem; }
                .sign-header p { display: none; }

                .canvas-wrapper {
                    padding: 0;
                }

                /* ✅ 修正 #4：覆蓋直向的 max-height，避免兩個規則同時作用壓縮高度 */
                .canvas-container {
                    flex: none;
                    height: 160px;
                    max-height: none;
                    border-radius: 12px;
                }

                .sign-actions {
                    padding-top: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}