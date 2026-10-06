# 開発エージェント向けガイド

## 目的と基本方針

- このガイドはリポジトリ全体に適用する。最初に `README.md` と変更対象の実装を読む。
- 結婚式当日・式後にゲストがスマートフォンで使うサイト。投票、サイリウム、投票内容の確認、写真共有、動画、会場案内と、管理者の集計・抽選を扱う。
- HTML / CSS / 素の JavaScript による静的サイト。回答取得のみ Google Apps Script（GAS）を使用する。現状、パッケージ管理・ビルド・自動テストの設定はない。
- 既存構成のまま必要な箇所を最小限修正する。小さな変更のためにフレームワークやビルド環境を導入しない。
- 作業前に `git status --short` で既存差分を確認し、ユーザーの変更を上書きしない。説明・作業報告は日本語で行う。

## 機能ごとの編集先

| 変更内容 | 主なファイル・注意点 |
| --- | --- |
| トップ画面、日時・名前・会場、各セクション | `index.html` |
| 共通デザイン、トップとサイリウムの表示 | `style.css`。管理画面でも読み込むため3ページへの影響を確認 |
| 外部リンクとYouTube表示制御 | `script.js` |
| フォーム・写真・動画・地図・GASのURL、色の名称と配色 | `config.js` の `window.WEDDING_CONFIG` |
| サイリウム、回答確認、回答キャッシュ | `light.html` / `light.js` |
| 集計、正解色の選択、新郎・新婦側の抽選 | `admin.html` / `admin.js` / `admin.css` |
| フォーム回答の読み出し・重複排除、JSON / JSONP API | `apps_script/Code.gs` |
| GASのランタイム・タイムゾーン | `apps_script/appsscript.json` |
| 写真・背景・アイコン | `assets/`。実際にHTML/CSSが参照している拡張子とパスを確認 |
| 回答データのサンプル | `sample-responses.json`。現状、画面から読み込むUIはない |

## 変更時に維持する契約

### 設定・表示

- 各ページは `config.js` をページ専用JSより先に読み込む。DOMのIDや `data-config-link` を変更したら参照するJSも合わせて修正する。
- 外部URLは原則 `config.js` に集約する。ただし地図のiframe URLと会場名は `index.html` にもあるため、会場変更時は両方を更新する。
- 未設定リンク（空値・`PASTE_`）の準備中表示、YouTubeの未設定・不正URL時の「Coming Soon」を維持する。
- YouTubeは `youtubeUrls` の配列を設定順に表示する。空配列・未設定時は旧 `youtubeUrl` にフォールバックする。タイトルはYouTubeのoEmbedから取得し、取得失敗時は「動画 N」を使って動画とリンクを残す。取得したタイトルは `textContent` で扱う。
- `youtubeUrls` は共有用iframeコードにも対応する。inertなtemplateからURLのみ取り出し、YouTube以外のURL・複数iframe・スクリプト・イベント属性を再生枠に取り込まない。埋め込みURLのクエリーとnocookieドメインを維持し、iframeには `strict-origin-when-cross-origin` を設定する。`file://` での再生確認は避ける。
- 色の名称は `config.js`、GASの `SETUP.colors`、Googleフォームの選択肢で一致させる。色は名前で照合しているため、配色変更と名称変更を区別する。
- 招待側の表記やフォーム設問名を変える場合、GASの `SETUP`、`light.html` の選択肢、`admin.js` の招待側ラベルも確認する。
- 既存の柔らかい配色、日本語フォント、スマートフォン向けレイアウトを基準にする。`hidden` の制御、ラベル、`aria-expanded`、`aria-live`、キーボード操作を壊さない。

### 回答取得・集計・抽選

- 投票は外部Googleフォームで行う。GASは回答取得用であり、サイトから回答を書き込む構成ではない。
- APIは `action=responses` を受け付け、`callback` があればJSONP、なければJSONを返す。両クライアントのJSONP処理と20秒のタイムアウト、後片付けを考慮して変更する。
- 成功データは `success`、`colors`、`responses` と集計メタデータを持つ。回答は `side`、`name`、`answer`、`timestamp`、GASでは `responseId` も返す。失敗データは `success: false` と `error`。
- GASは「招待側＋名前」が同じ回答のうち最新のみ採用する。同名でも招待側が異なれば別人。総回答数、有効提出数、重複除外数、無効数の意味を混同しない。
- 管理画面は初期表示でGASへ回答取得しない。保存データを復元し、「最新回答を取得」ボタンで通信する（Google Fonts等の読込とは別）。
- サイリウム画面は回答キャッシュがあれば利用し、なければ初回取得する。「更新」で再取得する。取得中・失敗・未設定の表示も扱う。
- 抽選は選択した正解色の回答者から、新郎側・新婦側ごとに1名。対象者なし・正解色未選択時の無効化を維持する。現状は再抽選時の当選者除外や履歴保存はない。
- GASの時刻はISO文字列、管理画面での表示は `Asia/Tokyo`。フォーム側の設問変更やGASの公開版更新が必要な場合は、コード変更だけで反映済みと報告しない。

### ブラウザー保存・データの扱い

| localStorageキー | 内容 |
| --- | --- |
| `weddingSelectedColor` | 最後に表示した色 |
| `weddingAnswerSelection` | 回答確認で選んだ招待側・名前 |
| `weddingGuestResponsesV1` | ゲスト画面の回答キャッシュと保存日時 |
| `weddingAdminDataV2` | 管理画面の回答データ |

- 保存形式を変える場合は既存キャッシュの復元も確認し、必要なら移行またはキーの更新を行う。
- 回答データにはゲスト名が含まれる。テストは架空データを使い、実回答をリポジトリや作業報告へ転載しない。外部由来の文字列は `textContent` 等で表示する。
- `admin.html` の `noindex` は認証ではなく、現在コード上に管理画面や回答APIの認証機構はない。管理画面という名称だけでアクセス制限済みと判断しない。

## ローカル確認

- リポジトリ直下をHTTPで配信して確認する。Pythonが利用可能なら `python -m http.server 8000 --bind 127.0.0.1` を実行し、`http://127.0.0.1:8000/index.html` を開く。Windows環境によっては `py` を使用する。
- Node.jsの場合は `node preview.cjs`（必要ならポート番号を引数で指定）も利用できる。プレビューはループバックに限定し、隠しファイルとリポジトリ外のファイルを配信しない。
- 文書のみの変更では内容・参照先・差分の確認でよい。実装変更は影響する項目を以下から選んで確認する。未実施の確認は報告で明記する。
- Node.jsが利用可能なら、変更したブラウザーJSを `node --check script.js` 等で構文確認する。これはDOM操作やGASサービスの動作確認を代替しない。存在しない `npm test` やビルドコマンドを前提にしない。

| 対象 | 確認内容 |
| --- | --- |
| 共通表示 | スマートフォン幅（例：375px）とPC幅で、文字・画像・ボタンの崩れ、横はみ出し、コンソールエラー、画像404がない |
| トップ | 投票・写真・地図のリンク、ページ内移動、YouTubeの複数URL・共有iframeコード・クエリー維持・旧単一URL・未設定・不正URLの表示、タイトル自動取得と失敗時の代替表示、HTTP経由の埋め込み再生 |
| サイリウム | 各色の表示、タップ・Enter・Spaceで戻る、前回色の復元、Fullscreen API非対応でも色画面を使える |
| 回答確認 | 開閉、招待側と名前の絞り込み、投票色表示、保存した選択の復元、更新、キャッシュあり／なし、空回答、通信失敗 |
| 管理画面 | 初期表示で回答取得しない、キャッシュ復元、取得ボタン、集計・一覧、正解色選択、両側の抽選、候補0名、取得失敗後のボタン復帰 |
| GAS | 同一人物の複数回答、両側の同名、必須回答欠落、JSONとJSONP、不正callback、未対応action。Googleサービスとの連携はGAS環境で確認 |

### 本番回答を取得せずに画面を確認する例

ローカルサイトのブラウザーコンソールで次を実行し、その後 `admin.html` または `light.html` を開く。サイリウム画面の初回自動取得を避ける場合は先に `index.html` 上で実行する。両画面の取得・更新ボタンは設定済みGASへ通信するため、この例では押さない。

```js
const sample = await fetch('./sample-responses.json').then(r => r.json());
localStorage.setItem('weddingAdminDataV2', JSON.stringify(sample));
localStorage.setItem('weddingGuestResponsesV1', JSON.stringify({
  responses: sample.responses,
  savedAt: new Date().toISOString()
}));
```

サンプルでは有効回答6名、重複除外2件、ピンク3票、その他各1票。ピンクの抽選候補は新郎側2名・新婦側1名となる。確認後は投入した2キーだけを削除し、関係のないlocalStorageを消去しない。

## 完了時

- `git diff --check` と差分を確認し、意図しないファイル変更や本番設定の書き換えがないことを確認する。新規ファイルは `git status --short` とファイル内容も確認する。
- 機能・構成が変わったら `README.md`、開発手順・契約が変わったらこのガイドも更新する。
- 変更点、確認結果、未確認事項、必要な外部設定や公開作業を簡潔に報告する。
