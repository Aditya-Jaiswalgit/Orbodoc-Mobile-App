package com.orbo_doc_mobapp

import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.graphics.pdf.PdfDocument
import android.provider.MediaStore
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.View
import java.io.File
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
        val webView = WebView(activity)
        webView.settings.javaScriptEnabled = false
        webView.setBackgroundColor(android.graphics.Color.WHITE)
        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String?) {
            view.evaluateJavascript("document.documentElement.scrollHeight.toString()") { result ->
              try {
                val cssHeight = result.trim('"').toIntOrNull()?.coerceAtLeast(900) ?: 1123
                val contentWidth = 794
                view.measure(
                  View.MeasureSpec.makeMeasureSpec(contentWidth, View.MeasureSpec.EXACTLY),
                  View.MeasureSpec.makeMeasureSpec(cssHeight, View.MeasureSpec.EXACTLY),
                )
                view.layout(0, 0, contentWidth, cssHeight)

                val pageWidth = 595
                val pageHeight = 842
                val scale = pageWidth.toFloat() / contentWidth
                val contentPageHeight = (pageHeight / scale).toInt()
                val pageCount = ((cssHeight + contentPageHeight - 1) / contentPageHeight).coerceAtLeast(1)
                val document = PdfDocument()
                for (pageNumber in 0 until pageCount) {
                  val page = document.startPage(PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber + 1).create())
                  page.canvas.save()
                  page.canvas.scale(scale, scale)
                  page.canvas.translate(0f, -(pageNumber * contentPageHeight).toFloat())
                  view.draw(page.canvas)
                  page.canvas.restore()
                  document.finishPage(page)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                  val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                  }
                  val outputUri = reactApplicationContext.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("Could not create the PDF in Downloads.")
                  reactApplicationContext.contentResolver.openOutputStream(outputUri)?.use { document.writeTo(it) }
                    ?: throw IllegalStateException("Could not open the PDF output file.")
                } else {
                  @Suppress("DEPRECATION")
                  val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                  if (!directory.exists()) directory.mkdirs()
                  File(directory, fileName).outputStream().use { document.writeTo(it) }
                }
                document.close()
                view.destroy()
                promise.resolve(fileName)
              } catch (error: Exception) {
                view.destroy()
                promise.reject("PDF_GENERATION_FAILED", error.message, error)
              }
            }
          }
        }
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
      } catch (error: Exception) {
        promise.reject("PDF_GENERATION_FAILED", error.message, error)
      }
    }
  }
}
