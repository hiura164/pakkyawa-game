import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = .black

        if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            let directory = url.deletingLastPathComponent()
            webView.loadFileURL(url, allowingReadAccessTo: directory)
        } else {
            webView.loadHTMLString("<h1>index.html が見つかりません</h1>", baseURL: nil)
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        GameWebView()
            .ignoresSafeArea()
            .statusBarHidden(true)
    }
}
