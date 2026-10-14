package com.orbo_doc_mobapp

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BillPdfDownloadModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "BillPdfDownload"

  @ReactMethod
  fun downloadPdf(url: String, token: String, fileName: String, promise: Promise) {
    try {
      if (token.isBlank()) {
        promise.reject("AUTH_REQUIRED", "Please sign in again to download this invoice.")
        return
      }

      val request = DownloadManager.Request(Uri.parse(url))
        .setMimeType("application/pdf")
        .addRequestHeader("Authorization", "Bearer $token")
        .setTitle(fileName)
        .setDescription("Downloading treatment invoice")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)

      val manager = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      promise.resolve(manager.enqueue(request).toString())
    } catch (error: Exception) {
      promise.reject("PDF_DOWNLOAD_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun downloadHtmlAsPdf(html: String, fileName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("PDF_ACTIVITY_UNAVAILABLE", "The app must be open to create a PDF.")
      return
    }

    activity.runOnUiThread {
      try {
        HtmlPdfWriter.write(activity, html, fileName, object : HtmlPdfWriter.Callback {
          override fun onSuccess(savedName: String) = promise.resolve(savedName)
          override fun onError(code: String, message: String) = promise.reject(code, message)
        })
      } catch (error: Exception) {
        promise.reject("PDF_GENERATION_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun printHtml(html: String, jobName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("PRINT_ACTIVITY_UNAVAILABLE", "The app must be open to print this invoice.")
      return
    }

    activity.runOnUiThread {
      try {
        val webView = WebView(activity)
        webView.settings.javaScriptEnabled = false
        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String?) {
            try {
              val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
              val printJob = printManager.print(
                jobName,
                view.createPrintDocumentAdapter(jobName),
                PrintAttributes.Builder()
                  .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                  .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                  .build(),
              )
              promise.resolve(printJob.id.toString())
              val handler = Handler(Looper.getMainLooper())
              val cleanup = object : Runnable {
                override fun run() {
                  if (printJob.isCompleted || printJob.isCancelled || printJob.isFailed || activity.isFinishing) {
                    view.destroy()
                  } else {
                    handler.postDelayed(this, 1_000)
                  }
                }
              }
              handler.postDelayed(cleanup, 1_000)
            } catch (error: Exception) {
              view.destroy()
              promise.reject("PRINT_FAILED", error.message, error)
            }
          }
        }
        webView.loadDataWithBaseURL("https://medicine-invoice.local/", html, "text/html", "UTF-8", null)
      } catch (error: Exception) {
        promise.reject("PRINT_FAILED", error.message, error)
      }
    }
  }
}
