# 麥箖公司財產清單 - 雲端管理系統 (Mailin Assets)

本專案為麥箖公司開發的「回應式財產清單管理系統」，支援桌機、平板、手機跨平台檢視。系統整合了 Firebase 雲端資料庫，具備資產編號自動跳號、雲端報廢管理、管理員權限登入、以及手機手寫確認簽收功能。

## ✨ 核心特色
*   **雲端動態同步**：採用 Firebase Firestore，資產的新增、編輯與報廢皆即時寫入雲端。
*   **管理員權限保護**：進入系統須通過身分驗證，預設密碼為 `671230`。
*   **資產分類編碼 (自動跳號)**：
    *   `PC`：電腦 (PC001...)
    *   `NB`：筆電/平板 (NB001...)
    *   `N`：其它類別 (N001...)
*   **手寫簽名連結**：管理員可批次勾選資產，產生專屬手機簽名連結，使用者開案即可手寫確認簽收。
*   **報廢清冊管理**：獨立的報廢流程，詳細紀錄原因、處置方式與日期。

## 🚀 部署指引

### 1. 前端預覽與發佈
1. 本專案使用 Vanilla HTML/JS/CSS，無需額外編譯。
2. 將所有檔案上傳至 GitHub 儲存庫 `Mailin-Assets`。
3. 在 GitHub 儲存庫設定中前往 `Settings > Pages`。
4. 將 `Build and deployment > Branch` 設為 `main` 分支後儲存。
5. 稍等片刻，即可透過生成的 GitHub Pages 網址進行操作。

### 2. 資料庫設定 (Firebase)
1. 專案已預先設定好由 `js/api.js` 連線至 Firebase。
2. 資料儲存在 **Cloud Firestore** 的兩個 Collection：
    *   `assets`：存放所有在使用中的資產。
    *   `scrapping`：存放所有已報廢的紀錄。
3. **Firestore 規則設定建議** (開發測試期)：
    ```javascript
    allow read, write: if request.time < timestamp.date(2026, 4, 30);
    ```

## 🛠️ 技術棧
*   **前端介面**：HTML5, CSS3 (Vanilla), JavaScript (ES Modules)
*   **UI/UX 設計**：深色模式 (Dark Mode), 毛玻璃 (Glassmorphism), RWD 響應式佈局
*   **圖示庫**：Lucide Icons
*   **後端雲端**：Firebase Firestore
*   **版本控制**：GitHub (Version Control)

## 📋 系統規格
*   **管理員帳號**：`admin`
*   **管理員密碼**：`671230`
*   **資產字段**：品名、保管人、存放地點、購買日期、規格說明、資產編號。
