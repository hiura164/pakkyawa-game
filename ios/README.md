# PAKKYAWA Adventure iOS App Wrapper

このフォルダは、GitHub Pages版のゲームを iPhone アプリ化するための WKWebView サンプル一式です。

## 使い方

1. Macで Xcode を起動
2. `File` → `New` → `Project...`
3. `iOS` → `App` を選択
4. 設定例
   - Product Name: `PAKKYAWAAdventure`
   - Interface: `SwiftUI`
   - Language: `Swift`
5. 作成したプロジェクトに以下のWebファイルを追加
   - `index.html`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - `icon.svg`
6. 追加時は `Copy items if needed` と `Add to targets` をON
7. このフォルダ内のSwiftファイルをプロジェクトへ追加
   - `PAKKYAWAAdventureApp.swift`
   - `ContentView.swift`
8. 既存の同名ファイルがある場合は置き換え
9. 実機またはシミュレータでRun

## 画面向き

横向きゲームにする場合は、XcodeのTarget設定で以下を推奨します。

- Portrait: OFF
- Landscape Left: ON
- Landscape Right: ON

## 仕組み

アプリ内の `WKWebView` がBundle内の `index.html` を読み込みます。ゲーム本体はHTML5 Canvasで動作するため、GitHub Pages版と同じコードを再利用できます。

## App Store提出時の注意

このサンプルはプロトタイプ向けです。App Store公開を狙う場合は、以下の調整を推奨します。

- 正式なアプリアイコン画像を `Assets.xcassets` に登録
- Launch Screen の設定
- サウンドのミュート設定
- プライバシーポリシー準備
- オフライン挙動確認
