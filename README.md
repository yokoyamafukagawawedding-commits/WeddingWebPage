# 結婚式ゲスト向けWebサイト

結婚式当日と式後に、招待客へ次の機能を提供する静的Webサイトです。

- ドレス色当てクイズへの投票
- お色直し入場時に使うサイリウム画面
- 自分が投票した色の確認
- Googleフォトでの写真閲覧・共有
- 複数のYouTube動画の公開（タイトルを自動取得）
- 会場のGoogleマップ表示
- ドレス色当てクイズの集計・抽選を行う管理画面

Googleフォームの回答取得だけ、WebアプリとしてデプロイしたGoogle Apps Scriptを使用します。

## YouTube動画の追加

`config.js` の `youtubeUrls` に動画のURLを並べると、設定順に動画と「YouTubeで見る」ボタンを表示します。URLは何本でも追加できます。

```js
youtubeUrls: [
  "https://www.youtube.com/watch?v=動画ID1",
  "https://youtu.be/動画ID2"
],
```

動画タイトルはYouTubeのoEmbedから自動取得するため、手入力やAPIキーの設定は不要です。取得中・通信失敗・非公開動画などで取得できない場合は「動画 1」などの表示を使い、動画とリンクは残します。YouTube側でタイトルを変更すると、サイトを再読み込みした際に取得し直します。

通常の動画URL、短縮URL、Shorts・ライブ・埋め込み用のURLに対応します。埋め込み用のURLを設定した場合も、「YouTubeで見る」ボタンは通常の視聴ページを開きます。動画URL以外のYouTubeリンクはボタンのみ表示します。空欄・`PASTE_` で始まる値・不正なURLは表示せず、有効なリンクが1つもなければ「Coming Soon...」を表示します。古い単一URLの設定 `youtubeUrl` は、`youtubeUrls` が未設定または空配列のときに利用できます。

### YouTubeの共有コードを使う場合

YouTubeの「共有 → 埋め込む」でコピーした `<iframe ...></iframe>` 全体も、`youtubeUrls` に追加できます。コードをバッククォートで囲んでください。動画URLと混在できます。

```js
youtubeUrls: [
  `<iframe width="560" height="315" src="https://www.youtube.com/embed/動画ID?si=共有パラメーター" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`,
  "https://youtu.be/別の動画ID"
],
```

共有コードからYouTubeの埋め込みURLだけを取り出し、`si`・`start` などの指定を維持して再生枠を作ります。プライバシー強化モードの `youtube-nocookie.com` にも対応します。コードに含まれるスクリプト・イベント属性は取り込まず、再生枠の大きさとタイトルはサイト側で調整します。YouTubeが推奨する `referrerpolicy="strict-origin-when-cross-origin"` を設定します。

### ローカルで再生を確認する場合

`index.html` をダブルクリックして `file://` で開くと、埋め込み元のHTTPリファラーを送れず、共有コードを使ってもエラー153になる場合があります。HTTP経由で確認してください。

Node.jsがあればリポジトリ直下で `node preview.cjs` を実行し、表示されたURL（通常 `http://127.0.0.1:8000/index.html`）を開きます。ポートが使用中なら `node preview.cjs 8001` のように変更できます。このプレビューは自分のPC内だけで利用でき、公開サイトへのアップロードは不要です。停止するには起動したターミナルで Ctrl+C を押します。

HTTP経由でもエラー101・150が出る場合は、YouTube側の「埋め込みを許可する」設定を確認してください。年齢制限などによって外部サイトで再生できない動画もあります。参考：[YouTube公式の埋め込み手順とリファラーの説明](https://support.google.com/youtube/answer/171780?hl=ja)、[エラー番号の説明](https://developers.google.com/youtube/iframe_api_reference#onError)。

変更を公開サイトへ反映するには、更新したファイルを公開先へ反映してください。

## トップページの見た目と背景写真

トップページ専用のデザインは `home.css` で管理します。サイリウム・管理画面には読み込みません。
写真と文字・装飾は別レイヤーにしており、写真の内容に依存せず差し替えられます。

`home.css` 冒頭の `.home-page` 内だけを編集して背景を調整できます。

- `--hero-image`：画像のパス。例：`url("assets/new-background.jpg")`。写真を使わない場合は `none`。
- `--hero-position`：PCで見せたい位置。例：`50% 30%`。
- `--hero-position-mobile`：スマートフォンで見せたい位置。例：`65% 50%`。
- `--hero-shade`：写真に重ねる黒い幕の濃さ（0〜1）。白い文字が読みやすいよう調整します。
- `--hero-fallback`：写真なし・読込失敗時の背景色。

画像は画面を覆うように拡大するため、縦横比によって端が切れます。差し替え後はスマートフォンとPCで構図と文字の読みやすさを確認してください。
背景のズームと文字・セクションの登場演出は、端末の「視差効果を減らす」等の設定に従って停止します。JavaScriptが無効でも内容を閲覧できます。
