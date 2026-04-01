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

        const resizeCanvas = () => {
            // 備份現有內容
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const data = this.signaturePad.toData();

            // 重新設定寬高
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * ratio;
            this.canvas.height = rect.height * ratio;
            this.canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);

            // 重要：重新初始化內容
            this.signaturePad.clear();
            this.signaturePad.fromData(data);
        };

        // 使用 ResizeObserver 替代 window resize 以精確追蹤容器變化
        const ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(this.canvas.parentElement);

        // 初次觸發
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
            .sign-viewport { display: flex; flex-direction: column; min-height: 100dvh; padding: 1.5rem; background: var(--bg-dark); box-sizing: border-box; }
            .sign-header { margin-bottom: 1.5rem; text-align: center; }
            .sign-header h1 { font-size: 1.3rem; margin-bottom: 0.5rem; color: var(--primary); }
            .asset-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; margin-bottom: 0.5rem; }
            .chip { background: var(--bg-surface-elevated); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; border: 1px solid var(--border-color); }
            .canvas-container { flex: 1; position: relative; border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 16px; margin-bottom: 1rem; overflow: hidden; background: rgba(0,0,0,0.2); min-height: 140px; max-height: 35dvh; }
            #signatureCanvas { width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
            .canvas-hint { position: absolute; bottom: 0.5rem; left: 0; width: 100%; text-align: center; color: var(--text-secondary); pointer-events: none; font-size: 0.75rem; opacity: 0.5; }
            .sign-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-bottom: 1rem; }
            .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.8rem; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
            .btn-primary { padding: 0.8rem; font-size: 0.9rem; }

            /* 橫向模式專屬優化 */
            @media (orientation: landscape) and (max-height: 600px) {
                .sign-viewport { padding: 0.5rem 1rem; flex-direction: row; align-items: stretch; gap: 1rem; }
                .sign-header { width: 180px; margin-bottom: 0; text-align: left; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid var(--border-color); padding-right: 1rem; }
                .sign-header h1 { font-size: 1.1rem; margin-bottom: 0.3rem; }
                .sign-header p { font-size: 0.8rem; margin-bottom: 0.5rem; }
                .asset-chips { justify-content: flex-start; }
                .canvas-container { margin-bottom: 0; min-height: 80px; max-height: 60dvh; flex: 2; height: 100%; }
                .sign-actions { width: 150px; grid-template-columns: 1fr; flex-direction: column; padding-bottom: 0; align-self: center; }
                .btn-outline, .btn-primary { padding: 0.6rem; font-size: 0.85rem; }
                .canvas-hint { bottom: 0.3rem; }
            }
        `;
        document.head.appendChild(style);
    }
}
