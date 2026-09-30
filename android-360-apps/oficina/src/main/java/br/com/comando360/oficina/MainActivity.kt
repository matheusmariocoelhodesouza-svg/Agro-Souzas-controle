package br.com.comando360.oficina

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#1A1D22")
        window.navigationBarColor = Color.parseColor("#111316")

        webView = WebView(this)
        setContentView(webView)
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString Oficina360Android/1.0.1"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                if ((uri.scheme == "http" || uri.scheme == "https") && uri.host == "app.comando360.com.br") return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Exception) { false }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                view?.evaluateJavascript(MOBILE_NAV_SCRIPT, null)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(webView: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    val intent = (params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    })
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                    true
                } catch (_: Exception) {
                    fileCallback = null
                    false
                }
            }
        }

        webView.setDownloadListener { url, _, _, _, _ ->
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        }

        if (savedInstanceState == null) webView.loadUrl(APP_URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return
        val result = if (resultCode == RESULT_OK) WebChromeClient.FileChooserParams.parseResult(resultCode, data) else null
        fileCallback?.onReceiveValue(result)
        fileCallback = null
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    companion object {
        private const val APP_URL = "https://app.comando360.com.br/oficina360.html?source=android"
        private const val FILE_CHOOSER_REQUEST = 3601
        private val MOBILE_NAV_SCRIPT = """
            (function(){
              if (window.__oficina360NativeNavV2) return;
              window.__oficina360NativeNavV2 = true;
              if (!window.matchMedia('(max-width: 760px)').matches) return;
              const nav = document.querySelector('.side-nav');
              if (!nav) return;

              const style = document.createElement('style');
              style.id = 'oficina360-native-nav-v2-style';
              style.textContent = `
                @media(max-width:760px){
                  .app-shell{padding-bottom:82px!important}
                  .sidebar{height:76px!important;padding:7px 10px calc(7px + env(safe-area-inset-bottom))!important;background:#111316!important;box-shadow:0 -10px 28px rgba(0,0,0,.28)!important}
                  .side-nav{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;margin:0!important;overflow:visible!important;align-items:stretch!important}
                  .side-nav button{min-width:0!important;height:58px!important;padding:7px 3px!important;border-radius:14px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:4px!important;color:#D6D8DC!important;font-size:0!important;line-height:1!important;font-weight:800!important}
                  .side-nav button span{width:auto!important;font-size:19px!important;line-height:1!important;color:inherit!important}
                  .side-nav button::after{font-size:10px!important;line-height:1.05!important;white-space:nowrap!important;letter-spacing:0!important}
                  .side-nav button[data-tab="overview"]::after{content:"Início"}
                  .side-nav button[data-tab="maintenance"]::after{content:"Manutenção"}
                  .side-nav button[data-tab="orders"]::after{content:"OS"}
                  .side-nav button[data-tab="diagnostics"]::after{content:"Scanner"}
                  .side-nav .native-more-btn::after{content:"Mais"}
                  .side-nav button.mobile-nav-hidden{display:none!important}
                  .side-nav button.active,.side-nav .native-more-btn.active{background:linear-gradient(135deg,#E53935,#B91C1C)!important;color:#fff!important;box-shadow:0 8px 18px rgba(185,28,28,.30)!important}
                  .side-nav button:not(.active):active{background:rgba(255,255,255,.07)!important}
                  .native-more-sheet{position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:90;background:#1A1D22;border:1px solid #353A42;border-radius:20px;padding:10px;box-shadow:0 20px 48px rgba(0,0,0,.36);display:none;gap:8px}
                  .native-more-sheet.open{display:grid!important}
                  .native-more-sheet .sheet-title{padding:5px 7px 3px;color:#FF8A80;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
                  .native-more-sheet button{width:100%;min-height:48px;border:1px solid #343941;background:#22262C;color:#F4F4F5;border-radius:13px;padding:0 13px;display:flex;align-items:center;gap:12px;font-size:13px;font-weight:800;text-align:left}
                  .native-more-sheet button .sheet-icon{width:28px;height:28px;border-radius:9px;background:#35191B;color:#FF6B6B;display:grid;place-items:center;font-size:15px;flex:none}
                  .content{padding-bottom:106px!important}
                }
              `;
              document.head.appendChild(style);

              ['catalog','exploded','quotes'].forEach(function(tab){
                const button = nav.querySelector('button[data-tab="' + tab + '"]');
                if (button) button.classList.add('mobile-nav-hidden');
              });

              const moreButton = document.createElement('button');
              moreButton.type = 'button';
              moreButton.className = 'native-more-btn';
              moreButton.setAttribute('aria-label','Mais opções');
              moreButton.setAttribute('aria-expanded','false');
              moreButton.innerHTML = '<span>⋯</span>';
              nav.appendChild(moreButton);

              const sheet = document.createElement('div');
              sheet.className = 'native-more-sheet';
              sheet.setAttribute('role','menu');
              sheet.innerHTML = '<div class="sheet-title">Mais opções</div>' +
                '<button type="button" data-target-tab="catalog"><span class="sheet-icon">⚙</span><span>Catálogo de peças</span></button>' +
                '<button type="button" data-target-tab="exploded"><span class="sheet-icon">◫</span><span>Vistas explodidas</span></button>' +
                '<button type="button" data-target-tab="quotes"><span class="sheet-icon">R$</span><span>Orçamentos</span></button>';
              document.body.appendChild(sheet);

              function closeSheet(){
                sheet.classList.remove('open');
                moreButton.setAttribute('aria-expanded','false');
              }
              function syncActive(){
                const hiddenActive = ['catalog','exploded','quotes'].some(function(tab){
                  const button = nav.querySelector('button[data-tab="' + tab + '"]');
                  return button && button.classList.contains('active');
                });
                moreButton.classList.toggle('active', hiddenActive);
              }

              moreButton.addEventListener('click', function(event){
                event.stopPropagation();
                const open = !sheet.classList.contains('open');
                sheet.classList.toggle('open', open);
                moreButton.setAttribute('aria-expanded', open ? 'true' : 'false');
              });

              sheet.addEventListener('click', function(event){
                const item = event.target.closest('button[data-target-tab]');
                if (!item) return;
                const target = nav.querySelector('button[data-tab="' + item.dataset.targetTab + '"]');
                if (target) target.click();
                closeSheet();
                setTimeout(syncActive,0);
              });

              nav.querySelectorAll('button[data-tab]').forEach(function(button){
                button.addEventListener('click', function(){
                  closeSheet();
                  setTimeout(syncActive,0);
                });
              });

              document.addEventListener('click', function(event){
                if (!sheet.contains(event.target) && !moreButton.contains(event.target)) closeSheet();
              });
              document.addEventListener('keydown', function(event){ if (event.key === 'Escape') closeSheet(); });

              const observer = new MutationObserver(syncActive);
              nav.querySelectorAll('button[data-tab]').forEach(function(button){ observer.observe(button,{attributes:true,attributeFilter:['class']}); });
              syncActive();
            })();
        """.trimIndent()
    }
}