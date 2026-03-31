// 麥箖公司財產清單 - 手寫簽名模組
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
            penColor: '#6366f1'
        });

        const resizeCanvas = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            this.canvas.width = this.canvas.offsetWidth * ratio;
            this.canvas.height = this.canvas.offsetHeight * ratio;
            this.canvas.getContext("2d").scale(ratio, ratio);
            this.signaturePad.clear();
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
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
            .sign-viewport { display: flex; flex-direction: column; height: 100vh; padding: 2rem; background: var(--bg-dark); }
            .sign-header { margin-bottom: 2rem; text-align: center; }
            .sign-header h1 { font-size: 1.5rem; margin-bottom: 1rem; color: var(--primary); }
            .asset-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
            .chip { background: var(--bg-surface-elevated); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; border: 1px solid var(--border-color); }
            .canvas-container { flex: 1; position: relative; border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 20px; margin-bottom: 2rem; overflow: hidden; background: rgba(0,0,0,0.2); }
            #signatureCanvas { width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
            .canvas-hint { position: absolute; bottom: 1rem; left: 0; width: 100%; text-align: center; color: var(--text-secondary); pointer-events: none; font-size: 0.8rem; opacity: 0.5; }
            .sign-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-bottom: 2rem; }
            .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); padding: 1rem; border-radius: 12px; font-weight: 600; cursor: pointer; }
        `;
        document.head.appendChild(style);
    }
}
