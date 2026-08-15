# 結婚式ゲスト向けWebサイト

結婚式当日と式後に、招待客へ次の機能を提供する静的Webサイトです。

- ドレス色当てクイズへの投票
- お色直し入場時に使うサイリウム画面
- 自分が投票した色の確認
- Googleフォトでの写真閲覧・共有
- YouTube動画の公開
- 会場のGoogleマップ表示
- ドレス色当てクイズの集計・抽選を行う管理画面

Googleフォームの回答取得だけ、WebアプリとしてデプロイしたGoogle Apps Scriptを使用します。

## ファイル構成

- `index.html`: ゲスト向けトップページ
- `light.html` / `light.js`: サイリウム画面と投票結果の確認
- `admin.html` / `admin.js`: 回答集計と抽選を行う管理画面
- `config.js`: フォーム、Googleフォト、YouTube、Apps ScriptなどのURL設定
- `style.css`: ゲスト画面とサイリウム画面のスタイル
- `admin.css`: 管理画面のスタイル
- `apps_script/Code.gs`: Googleフォームの回答を返すApps Script
- `apps_script/appsscript.json`: Apps Scriptのマニフェスト
- `assets/`: 画像とアイコン

## ゲスト向けトップページ

`index.html`から次のページや外部サービスを開けます。

- Googleフォームの投票ページ
- サイリウム画面
- Googleフォトの共有アルバム
- YouTube動画
- Googleマップ

YouTube URLが未設定の場合は「Coming Soon」を表示します。`config.js`にYouTube URLを設定すると、動画とYouTubeへのリンクが自動的に公開されます。

## サイリウム画面

`light.html`では、`config.js`に設定した色から選択した色を画面全体に表示します。端末が対応している場合は全画面表示を試みます。

最後に選んだ色はブラウザに保存され、次回アクセス時に「前回の色」として再表示できます。

### 投票した色の確認

Apps Scriptから取得した回答を使い、招待側と名前を選択して自分の投票色を確認できます。

- 初回アクセスなど、保存済み回答がない場合は自動取得します。
- 一度取得した回答はブラウザに保存します。
- 保存済み回答がある場合、ページを開いただけではApps Scriptへ接続しません。
- 「更新」ボタンを押すと最新回答を取得して保存内容を更新します。
- 取得に失敗した場合は、画面に取得失敗とエラー内容を表示します。

## 管理画面

`admin.html`はトップページからリンクしていません。公開URLの末尾を`/admin.html`にして開きます。

管理画面では次の操作ができます。

- Googleフォームの最新回答を取得
- 同じ招待側・名前から複数回答がある場合、最後の回答だけを採用
- 色ごとの投票数を表示
- 正解色を選択
- 新郎側と新婦側から1名ずつ抽選
- 最新回答の一覧を表示
- 前回取得した回答を同じブラウザに保存

管理画面を開いただけではApps Scriptへ接続しません。「最新回答を取得」を押したときだけ通信します。

## GoogleフォームとApps Scriptの設定

### 1. Googleフォームを準備する

フォームには、少なくとも次の回答を含めます。

1. どちらの招待客か（`新郎`または`新婦`）
2. 招待客の名前
3. カラードレスの予想色

### 2. Apps Scriptを設定する

1. Google Apps Scriptで新しいプロジェクトを作成します。
2. `apps_script/Code.gs`の内容を貼り付けます。
3. `SETUP.formId`にGoogleフォームIDを設定します。
4. `SETUP`の設問タイトル、招待側の選択肢、色をGoogleフォームと一致させます。
5. `apps_script/appsscript.json`の内容をマニフェストへ反映します。

フォームIDは、フォーム編集URLの`/d/`と`/edit`の間にある文字列です。

### 3. Webアプリとしてデプロイする

Apps Scriptの「デプロイ」から、次の設定でWebアプリを作成します。

- 実行ユーザー: 自分
- アクセスできるユーザー: 全員

デプロイ後に発行される、`/exec`で終わるURLを`config.js`の`gasWebAppUrl`へ設定します。

Apps ScriptのAPIは、回答者の名前、招待側、回答色、回答時刻を返します。このサイトのURLとApps Script URLは招待客向けとして取り扱ってください。

Apps Scriptを変更した場合は、新しいバージョンとして再デプロイし、Webアプリへ変更を反映してください。

## Webサイトの設定

`config.js`で次の値を設定します。

```js
window.WEDDING_CONFIG = {
  formUrl: "Googleフォームの回答URL",
  photosUrl: "Googleフォト共有アルバムのURL",
  youtubeUrl: "公開するYouTube動画のURL",
  gasWebAppUrl: "Apps ScriptのWebアプリURL",
  mapUrl: "GoogleマップのURL",
  colors: [
    { name: "表示名", value: "背景色", text: "文字色" }
  ]
};
```

`youtubeUrl`には、通常の動画URL、`youtu.be`の共有URL、Shorts URL、ライブ配信URL、埋め込みURLを設定できます。未公開の間は`PASTE_YOUTUBE_URL_HERE`のままにします。

色の名前は、Googleフォーム、`config.js`、Apps Scriptの`SETUP.colors`で同じ表記にします。

## 公開

`WeddingWebPage`フォルダの内容を、GitHub Pages、Cloudflare Pages、Netlifyなどの静的サイトへ公開できます。

公開前に、次の項目を実機で確認してください。

1. Googleフォームを開いて回答できること
2. サイリウム画面で全色を表示できること
3. 回答確認で自分の名前と投票色を表示できること
4. 更新ボタンで回答を再取得できること
5. Googleフォトを開けること
6. YouTube URL設定後に動画とリンクが表示されること
7. 管理画面で新郎・新婦それぞれの正解者数と抽選ボタンが表示されること

## 写真プレビュー

`assets/photo1.svg`から`photo4.svg`は差し替え用の仮画像です。実際の写真を掲載する場合は、`index.html`の参照先を変更します。
