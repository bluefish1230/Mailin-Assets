# 麥箖公司財產清單 - 在線管理系統

本專案為麥箖公司開發的「回應式財產清單管理系統」，支援桌機、平板、手機跨平台檢視，具備自動資產編號、異動紀錄、報廢管理與手寫簽名功能。

## ✨ 核心特色
*   **現代化 RWD 介面**：採用 Dark Mode 與毛玻璃設計（Glassmorphism），體驗流暢且外觀高端。
*   **資產分類編碼**：
    *   `PC`：電腦 (PC001...)
    *   `NB`：筆電/平板 (NB001...)
    *   `N`：其它類別 (N001...)
*   **數位手寫簽名**：管理者可批次勾選資產，產生專屬簽名連結，使用者開案即可手寫確認簽收。
*   **資料版本管控**：定期將資產快照同步至 GitHub，保留完整異動歷史。

## 🚀 部署指引

### 1. 前端預覽
1. 本專案使用 Vanilla HTML/JS/CSS，無需額外編譯。
2. 將 `d:/ai/Assets` 所有內容上傳至 GitHub 儲存庫。
3. 至 `Settings > Pages` 開啟 GitHub Pages 即可上線。

### 2. 後端串接 (Supabase)
1. 至 [Supabase](https://supabase.com/) 註冊並建立專案。
2. 建立 `assets`, `transfer_logs`, `scrapping_logs`, `signature_sessions` 資料表。
3. 修改 `js/api.js` 並填入專案 URL 與 ANON_KEY。
4. 設定 GitHub Secrets 供 `sync_data.yml` 使用以達成自動同步。

## 📋 系統規格書
詳細的需求與技術規劃請參閱 [系統開發規格書](./system_specification.md)。

## 🛠️ 技術棧
*   **範拉 HTML/CSS/JS**
*   **Lucide Icons** (向量圖示)
*   **Signature Pad** (手寫簽名)
*   **Supabase** (後端 API 與存儲)
*   **GitHub Actions** (資料版本同步)
