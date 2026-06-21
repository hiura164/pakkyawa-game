# PAKKYAWA Adventure Ver1.8

PAKKYAWA の横スクロール王冠アクションゲームです。GitHub Pages でそのまま公開できる HTML5 Canvas / PWA 構成です。

## 実装済み

- ローディング画面
- PAKKYAWA ロゴ入りタイトル画面
- ステージ選択画面
- ステージ1〜6
  - 1. はじまりの草原
  - 2. ふわふわ雲の谷
  - 3. 王冠キャッスル
  - 4. キラキラ砂漠
  - 5. よふかしネオン街
  - 6. 虹の王冠ロード
- 背景バリエーション追加
  - 草原、雲、城、砂漠、ネオン街、虹ロード
- 敵キャラバリエーション追加
  - ランナー系
  - ジャンパー系
  - 雲系
  - ガード系
  - トゲ系
  - ゴースト系
- コイン取得
- 通常敵：踏むと撃破、横から触れるとダメージ
- ボス戦：ステージごとにHP増加、踏んで撃破
- 残機制
- ステージクリア / ゲームオーバー
- localStorage によるセーブ機能
  - 解放ステージ
  - ステージ別ベストスコア
  - 累計コイン
- スマホ完全対応
  - 画面下タッチボタン
  - iPhone / iPad 横向き想定
  - viewport-fit / safe-area 対応
- BGM / 効果音
  - Web Audio API による簡易生成音
  - 外部音声ファイル不要
- PWA 対応
  - manifest
  - service worker
  - ホーム画面追加対応
- iPhoneアプリ化用 WKWebView サンプル一式

## GitHub Pages 公開手順

1. GitHubでこのリポジトリを開く
2. `Settings` → `Pages`
3. `Build and deployment` を以下に設定
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. `Save`
5. 数分後、以下のURLで公開されます

```text
https://hiura164.github.io/pakkyawa-game/
```

注意：リポジトリが private の場合、GitHub Pages の利用可否は GitHub アカウント/プラン設定に依存します。公開できない場合はリポジトリを public にしてください。

## iPhone / iPad でアプリ風に起動する方法

1. Safariで GitHub Pages の公開URLを開く
2. 共有ボタンをタップ
3. `ホーム画面に追加`
4. ホーム画面の PAKKYAWA アイコンから起動

## ファイル構成

```text
index.html              起動HTML
app.js                  ゲーム本体
manifest.json           PWAマニフェスト
sw.js                   オフラインキャッシュ用Service Worker
icon.svg                PAKKYAWA簡易アイコン
ios/                   iPhoneアプリ化用WKWebViewサンプル
```

## iPhoneアプリ化（Xcode）

`ios/README.md` を参照してください。Xcodeで新規iOS Appを作成し、`index.html` / `app.js` / `manifest.json` / `sw.js` / `icon.svg` をBundle Resourcesに追加して、`ios/ContentView.swift` と `ios/PAKKYAWAAdventureApp.swift` を組み込む構成です。

## 操作方法

### PC

- ← / →：移動
- ↑ / Space：ジャンプ
- Enter / Space：タイトル・メニュー操作
- ステージ選択画面では 1 / 2 / 3 / 4 / 5 / 6 キーでも選択可能

### スマホ / タブレット

- 左下ボタン：左右移動
- 右下 JUMP ボタン：ジャンプ
- タイトル・メニューは画面タップ

## 今後の拡張候補

- 公式イラスト画像への差し替え
- ステージ背景差分の強化
- 本格的なBGM/SEファイル化
- アイテム追加
- ボス攻撃パターン追加
- ステージエディタ化
