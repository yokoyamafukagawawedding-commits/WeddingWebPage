# 結婚式用Webサイト v2

ゲスト向けページは完全な静的サイトです。`admin.html`で「最新回答を取得」を押したときだけ、Google Apps Scriptへ接続します。

## 機能

### ゲスト向け
- Googleフォームへのリンク
- 投票色をスマホ全面に表示するサイリウム画面
- Google Driveへのリンク
- 固定写真プレビュー
- YouTube埋め込み
- Googleマップ

### 管理者向け
- Googleフォーム回答の取得
- 同じ「新郎側/新婦側＋名前」は最後の回答だけ採用
- 色ごとの集計
- 正解色の選択
- 正解者からの抽選（1〜5名・重複当選なし）
- 抽選対象者の手動除外
- 回答データの端末保存
- JSON/CSVバックアップ
- JSONからの復元
- 当選履歴

## 1. Apps ScriptとGoogleフォームの準備

1. Google Apps Scriptで新しいプロジェクトを作ります。
2. `apps_script/Code.gs`を貼り付けます。
3. `SETUP.groomGuests`と`SETUP.brideGuests`を実際の招待客名に置き換えます。
4. `SETUP.colors`を実際の候補色に合わせます。
5. `SETUP.adminKey`を12文字以上の推測されにくい文字列に変更します。
6. `setupWeddingForm()`を一度だけ実行し、権限を許可します。
7. 実行ログに表示された「フォーム回答URL」を控えます。

作られるフォームの順番は以下です。

1. 新郎側 / 新婦側
2. 選んだ側の招待客名
3. ドレス色の予想

新郎側を選ぶと新郎側の名前だけ、新婦側を選ぶと新婦側の名前だけが表示されます。

## 2. Apps ScriptをWebアプリとしてデプロイ

1. Apps Script右上の「デプロイ」→「新しいデプロイ」
2. 種類は「ウェブアプリ」
3. 実行ユーザーは「自分」
4. アクセスできるユーザーは「全員」
5. デプロイ後の `/exec` で終わるURLを控えます

回答データは管理者キーが一致したときだけ返します。管理者キーは公開ファイルの`config.js`には保存しません。

## 3. Webサイトの設定

`config.js`を開き、次を差し替えます。

```js
formUrl: "フォーム回答URL",
gasWebAppUrl: "Apps Scriptの/exec URL",
driveUrl: "Google Drive共有フォルダURL",
youtubeUrl: "YouTube URL",
youtubeVideoId: "YouTube動画ID"
```

候補色を変えた場合は、`config.js`の`colors`とApps Scriptの`SETUP.colors`を同じ名称にしてください。

## 4. 管理者画面

公開URLの末尾を`/admin.html`にして開きます。トップページから管理者画面へのリンクは置いていません。

管理画面を開いただけでは通信しません。パスコードを入力し「最新回答を取得」を押したときだけApps Scriptが動きます。

## 5. 当日の推奨手順

1. 投票締切後、`admin.html`で最新回答を取得
2. 回答人数と一覧を確認
3. JSONを保存
4. 正解色を選択
5. 正解者数を確認
6. 抽選を実行

通信できない場合でも、前回取得した端末保存データか、保存済みJSONを読み込んで抽選できます。

## 6. Apps Script設定前の動作確認

管理画面の「JSON読込」から`sample-responses.json`を読み込むと、集計・抽選を試せます。

## 7. 公開

フォルダ一式をGitHub Pages、Cloudflare Pages、Netlifyなどへアップロードできます。
