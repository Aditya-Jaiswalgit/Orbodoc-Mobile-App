package com.orbo_doc_mobapp

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
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
}
