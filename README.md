# HKDSE 溫習測驗（Aero 風格）

純靜態網站，無需伺服器，可直接託管於 GitHub Pages。

## 目錄結構
```
index.html          主頁面（桌面、開始選單、工作列）
css/aero.css        Aero 玻璃風格樣式
js/data.js          題庫（由 tools/build_bank.py 生成）
js/app.js           選單、測驗、錯題紀錄邏輯
icons/              自製 SVG 圖標
tools/build_bank.py 從 .docx 總整理重新生成題庫
```

## 部署到 GitHub Pages
1. 在 GitHub 建立倉庫（例如 `Dserevise`），把以上所有檔案上傳到根目錄。
2. 進入 Settings → Pages，Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`。
3. 數分鐘後即可以 `https://<你的帳號>.github.io/Dserevise/` 開啟。

## 新增其他範文
1. 準備新的總整理 .docx（兩個表格：實詞、虛詞，格式同《廉頗藺相如傳》）。
2. 執行 `python3 tools/build_bank.py 新檔案.docx`（需安裝 `python-docx`）。
   注意：腳本目前會覆寫 `js/data.js`。如要支援多篇範文，可把輸出改為 `js/data-<範文>.js`，並在 `app.js` 的 `CHILDREN` 內加入對應項目。
3. 題目編號及干擾項由固定種子生成，同一份文件重新生成結果完全一致。

## 錯題紀錄
- 答題紀錄儲存在使用者自己的瀏覽器（localStorage），不會上傳至任何伺服器。
- 換電腦或清除瀏覽器資料後紀錄會消失。
- 答對一次即自動移出錯題清單，使用者亦可手動移出。
