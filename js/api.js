// 麥箖公司財產清單 - Supabase 串接介面 (預留)
// 提示：管理者需在環境變數中設定 SUPABASE_URL 與 SUPABASE_ANON_KEY

const SUPABASE_API = {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    key: 'YOUR_SUPABASE_ANON_KEY',

    async fetchAssets() {
        console.log("正在從 Supabase 取得資產資料...");
        // const { data, error } = await supabase.from('assets').select('*');
        // return data;
        return []; // 暫回空，待串接
    },

    async recordTransfer(assetId, from, to) {
        console.log(`資產 ${assetId} 異動：${from} -> ${to}`);
        // await supabase.from('transfer_logs').insert({ asset_id: assetId, prev_custodian: from, new_custodian: to });
    },

    async uploadSignature(dataURL, assetIds) {
        console.log("上傳簽名影像至 Supabase Storage...");
        // 1. 將 dataURL 轉為 Blob
        // 2. 上傳至 'signatures' bucket
        // 3. 更新 assets 及簽名關聯表
    }
};

export default SUPABASE_API;
