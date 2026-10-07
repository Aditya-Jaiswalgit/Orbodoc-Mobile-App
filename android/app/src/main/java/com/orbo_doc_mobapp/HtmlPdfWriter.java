package com.orbo_doc_mobapp;

import android.app.Activity;
import android.content.ContentValues;
import android.graphics.Canvas;
import android.graphics.pdf.PdfDocument;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

final class HtmlPdfWriter {
  interface Callback {
    void onSuccess(String savedName);
    void onError(String code, String message);
  }

  private static final int HTML_WIDTH_CSS = 794;
  private static final int PDF_WIDTH = 595;
  private static final int PDF_HEIGHT = 842;

  private HtmlPdfWriter() {}

  static void write(Activity activity, String html, String requestedName, Callback callback) {
    String baseName = requestedName == null ? "medical-history" : requestedName;
    int extension = baseName.toLowerCase().lastIndexOf(".pdf");
    if (extension >= 0) baseName = baseName.substring(0, extension);
    final String fileName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_") + ".pdf";
    final File tempFile = new File(activity.getCacheDir(), System.nanoTime() + "-" + fileName);
    final ViewGroup root = (ViewGroup) activity.getWindow().getDecorView();
    final int htmlWidth = Math.round(HTML_WIDTH_CSS * activity.getResources().getDisplayMetrics().density);
    final WebView webView;
    try {
      WebView.enableSlowWholeDocumentDraw();
      webView = new WebView(activity);
      webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
      webView.getSettings().setJavaScriptEnabled(true);
      webView.getSettings().setDomStorageEnabled(true);
      webView.setBackgroundColor(android.graphics.Color.WHITE);
      webView.setLayoutParams(new FrameLayout.LayoutParams(htmlWidth, 1));
      webView.setTranslationX(-htmlWidth - 20f);
      root.addView(webView);
    } catch (Exception error) {
      callback.onError("PDF_RENDER_FAILED", message(error, "Could not prepare the PDF renderer."));
      return;
    }

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public void onPageFinished(WebView view, String url) {
        view.postDelayed(() -> view.evaluateJavascript(
            "JSON.stringify({height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), text: document.body.innerText.trim().length})",
            result -> {
              try {
                String json = result == null ? "" : result.replace("\\\"", "\"").replace("\\\\", "\\").replace("\"", "");
                String[] values = json.replace("{", "").replace("}", "").split(",");
                int cssHeight = 0;
                int textLength = 0;
                for (String value : values) {
                  String[] pair = value.split(":");
                  if (pair.length != 2) continue;
                  if (pair[0].contains("height")) cssHeight = Integer.parseInt(pair[1].trim());
                  if (pair[0].contains("text")) textLength = Integer.parseInt(pair[1].trim());
                }
                if (cssHeight <= 0 || textLength == 0) throw new IOException("There is no medical history content to export.");
                render(activity, root, view, cssHeight, htmlWidth, tempFile, fileName, callback);
              } catch (Exception error) {
                finish(root, view, tempFile);
                callback.onError("PDF_RENDER_FAILED", message(error, "Could not render the medical history PDF."));
              }
            }), 150);
      }
    });
    webView.loadDataWithBaseURL("https://medical-history.local/", html, "text/html", "UTF-8", null);
  }

  private static void render(Activity activity, ViewGroup root, WebView webView, int cssHeight, int htmlWidth,
      File tempFile, String fileName, Callback callback) {
    try {
      int contentPageHeight = (int) Math.ceil(PDF_HEIGHT / (double) PDF_WIDTH * htmlWidth);
      int contentHeight = Math.round(cssHeight * activity.getResources().getDisplayMetrics().density);
      int pageCount = Math.max(1, (contentHeight + contentPageHeight - 1) / contentPageHeight);
      ViewGroup.LayoutParams params = webView.getLayoutParams();
      params.width = htmlWidth;
      params.height = contentHeight;
      webView.setLayoutParams(params);
      webView.measure(View.MeasureSpec.makeMeasureSpec(htmlWidth, View.MeasureSpec.EXACTLY),
          View.MeasureSpec.makeMeasureSpec(contentHeight, View.MeasureSpec.EXACTLY));
      webView.layout(0, 0, htmlWidth, contentHeight);

      PdfDocument document = new PdfDocument();
      float scale = PDF_WIDTH / (float) htmlWidth;
      try {
        for (int pageNumber = 0; pageNumber < pageCount; pageNumber++) {
          PdfDocument.Page page = document.startPage(new PdfDocument.PageInfo.Builder(PDF_WIDTH, PDF_HEIGHT, pageNumber + 1).create());
          Canvas canvas = page.getCanvas();
          canvas.drawColor(android.graphics.Color.WHITE);
          canvas.save();
          canvas.scale(scale, scale);
          canvas.translate(0f, -(pageNumber * contentPageHeight));
          webView.draw(canvas);
          canvas.restore();
          document.finishPage(page);
        }
        try (FileOutputStream output = new FileOutputStream(tempFile)) {
          document.writeTo(output);
        }
      } finally {
        document.close();
      }
      if (tempFile.length() < 500L) throw new IOException("The PDF renderer produced an empty file.");
      saveToDownloads(activity, tempFile, fileName);
      finish(root, webView, tempFile);
      callback.onSuccess(fileName);
    } catch (Exception error) {
      finish(root, webView, tempFile);
      callback.onError("PDF_DOWNLOAD_FAILED", message(error, "Could not save the PDF in Downloads."));
    }
  }

  private static void saveToDownloads(Activity activity, File source, String fileName) throws IOException {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ContentValues values = new ContentValues();
      values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
      values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
      values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
      values.put(MediaStore.Downloads.IS_PENDING, 1);
      android.content.ContentResolver resolver = activity.getContentResolver();
      android.net.Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
      if (uri == null) throw new IOException("Could not create the PDF in Downloads.");
      try {
        java.io.OutputStream output = resolver.openOutputStream(uri);
        if (output == null) throw new IOException("Could not open the PDF output file.");
        try (FileInputStream input = new FileInputStream(source); java.io.OutputStream target = output) {
          byte[] buffer = new byte[8192];
          int count;
          while ((count = input.read(buffer)) != -1) target.write(buffer, 0, count);
        }
        ContentValues complete = new ContentValues();
        complete.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(uri, complete, null, null);
      } catch (Exception error) {
        resolver.delete(uri, null, null);
        if (error instanceof IOException) throw (IOException) error;
        throw new IOException(message(error, "Could not save the PDF."), error);
      }
    } else {
      @SuppressWarnings("deprecation")
      File directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
      if (!directory.exists() && !directory.mkdirs()) throw new IOException("Could not access the Downloads folder.");
      try (FileInputStream input = new FileInputStream(source); FileOutputStream output = new FileOutputStream(new File(directory, fileName))) {
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
      }
    }
  }

  private static void finish(ViewGroup root, WebView webView, File tempFile) {
    try { root.removeView(webView); } catch (Exception ignored) {}
    try { webView.destroy(); } catch (Exception ignored) {}
    tempFile.delete();
  }

  private static String message(Exception error, String fallback) {
    return error.getMessage() == null || error.getMessage().trim().isEmpty() ? fallback : error.getMessage();
  }
}
