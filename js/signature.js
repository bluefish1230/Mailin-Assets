// 公司財產清單 - 手寫簽名模組
import SignaturePad from 'https://cdn.jsdelivr.net/npm/signature_pad@5.0.2/+esm';

export class SignatureApp {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.signaturePad = null;
        this.canvas = null;
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

                <div class="canvas-container">
                    <canvas id="signatureCanvas"></canvas>
                    <div class="canvas-hint">請在上方空白區域手寫簽名</div>
                </div>

                <div class="sign-actions">
                    <button id="clearBtn" class="btn-outline">清除重新簽名</button>
                    <button id="confirmBtn" class="btn-primary">確認送出並關閉</button>
                </div>
            </div>
        `;

        this.initCanvas();
        this.initButtons();
        this.appendStyles();
    }

    initCanvas() {
        this.canvas = document.getElementById('signatureCanvas');
        this.signaturePad = new SignaturePad(this.canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            penColor: '#6366f1',
            velocityFilterWeight: 0.7
        });

        let lastWidth = 0;
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            // 關鍵：如果寬度沒變（只是高度稍微跳動，例如網址列隱藏），就不重新初始化畫布
            if (Math.abs(rect.width - lastWidth) < 5) return;
            lastWidth = rect.width;

            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const data = this.signaturePad.toData();

            this.canvas.width = rect.width * ratio;
            this.canvas.height = rect.height * ratio;
            this.canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);

            this.signaturePad.clear();
            this.signaturePad.fromData(data);
        };

        const ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(this.canvas.parentElement);
        setTimeout(resizeCanvas, 100);
    }

    initButtons() {
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.signaturePad.clear();
        });

        document.getElementById('confirmBtn').addEventListener('click', async () => {
            if (this.signaturePad.isEmpty()) {
                alert("請先完成簽名！");
                return;
            }

            const dataURL = this.signaturePad.toDataURL();
            console.log("簽名影像已產出:", dataURL);

            // 此處未來將介接 Supabase Upload
            alert("簽名已完成！資料正在同步中...");
            window.location.hash = "dashboard";
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
                min-height: 100dvh;
                padding: 1.5rem;
                background: var(--bg-dark);
                box-sizing: border-box;
                gap: 1rem;
                /* 關鍵：鎖定整個視窗不允許縮放與橡皮筋捲動 */
                touch-action: none;
                overscroll-behavior: none;
                overflow: hidden;
                position: fixed;
                width: 100%;
                top: 0;
            }

            .sign-header {
                text-align: center;
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

            .canvas-container {
                flex: 1;
                position: relative;
                border: 2px dashed rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                overflow: hidden;
                background: rgba(255, 255, 255, 1);
                min-height: 180px;
                max-height: 40dvh;
                margin: 0 0.5rem;
            }
            #signatureCanvas {
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
                color: #AAA;
                pointer-events: none;
                font-size: 0.75rem;
                opacity: 0.8;
            }

            .sign-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                padding-top: 0.5rem;
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
                }

                .sign-header {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 1rem;
                    text-align: left;
                }
                .sign-header h1 { font-size: 1rem; }
                .sign-header p { display: none; } /* 隱藏贅字以留空間 */

                /* 簽名框：橫向時固定高度，不再隨 dvh 飄移 */
                .canvas-container {
                    flex: none;
                    height: 180px; 
                    margin: 0;
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
