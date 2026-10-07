package com.orbo_doc_mobapp

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Xml
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipInputStream
import org.xmlpull.v1.XmlPullParser

class MedicineFilePickerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingPromise: Promise? = null

  private val activityListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_CODE) return
      val promise = pendingPromise ?: return
      pendingPromise = null
      if (resultCode != Activity.RESULT_OK || data?.data == null) {
        promise.resolve(null)
        return
      }
      val uri = data.data!!
      val result: WritableMap = Arguments.createMap()
      result.putString("uri", uri.toString())
      result.putString("name", getDisplayName(uri) ?: "medicines.xlsx")
      result.putString("type", context.contentResolver.getType(uri) ?: "application/octet-stream")
      promise.resolve(result)
    }
  }

  init { context.addActivityEventListener(activityListener) }

  override fun getName() = "MedicineFilePicker"

  @ReactMethod
  fun pickExcel(promise: Promise) {
    val activity = context.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "The file picker is unavailable right now.")
      return
    }
    if (pendingPromise != null) {
      promise.reject("PICKER_BUSY", "A file selection is already in progress.")
      return
    }
    try {
      pendingPromise = promise
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "*/*"
        putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ))
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      activity.startActivityForResult(intent, REQUEST_CODE)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("PICKER_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun readSpreadsheet(uriValue: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriValue)
      val bytes = context.contentResolver.openInputStream(uri)?.use { input ->
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        var count: Int
        while (input.read(buffer).also { count = it } > 0) output.write(buffer, 0, count)
        output.toByteArray()
      } ?: throw IllegalArgumentException("Could not read the selected file")
      if (bytes.size > 5 * 1024 * 1024) throw IllegalArgumentException("Choose a file smaller than 5 MB")
      val displayName = getDisplayName(uri).orEmpty().lowercase()
      val rows = if (displayName.endsWith(".csv")) parseCsv(String(bytes, Charsets.UTF_8)) else parseXlsx(bytes)
      val result = Arguments.createArray()
      rows.forEach { row ->
        val rowArray = Arguments.createArray()
        row.forEach { cell -> rowArray.pushString(cell) }
        result.pushArray(rowArray)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("SPREADSHEET_READ_FAILED", error.message ?: "Could not read this spreadsheet", error)
    }
  }

  private fun parseCsv(source: String): List<List<String>> {
    val rows = mutableListOf<MutableList<String>>()
    var row = mutableListOf<String>()
    val cell = StringBuilder()
    var quoted = false
    var index = 0
    while (index < source.length) {
      val char = source[index]
      when {
        char == '"' && quoted && index + 1 < source.length && source[index + 1] == '"' -> { cell.append('"'); index++ }
        char == '"' -> quoted = !quoted
        (char == ',' || char == '\n' || char == '\r') && !quoted -> {
          row.add(cell.toString().trim()); cell.setLength(0)
          if (char != ',') {
            if (row.any { it.isNotEmpty() }) rows.add(row)
            row = mutableListOf()
            if (char == '\r' && index + 1 < source.length && source[index + 1] == '\n') index++
          }
        }
        else -> cell.append(char)
      }
      index++
    }
    row.add(cell.toString().trim())
    if (row.any { it.isNotEmpty() }) rows.add(row)
    return rows
  }

  private fun parseXlsx(bytes: ByteArray): List<List<String>> {
    val entries = mutableMapOf<String, ByteArray>()
    ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
      var entry = zip.nextEntry
      while (entry != null) {
        if (!entry.isDirectory && (entry.name == "xl/sharedStrings.xml" || entry.name.startsWith("xl/worksheets/sheet"))) {
          val output = ByteArrayOutputStream()
          zip.copyTo(output)
          entries[entry.name] = output.toByteArray()
        }
        entry = zip.nextEntry
      }
    }
    val sheetBytes = entries.keys.filter { it.startsWith("xl/worksheets/sheet") && it.endsWith(".xml") }.sorted().firstOrNull()?.let { entries[it] }
      ?: throw IllegalArgumentException("The Excel file does not contain a worksheet")
    val sharedStrings = entries["xl/sharedStrings.xml"]?.let(::parseSharedStrings).orEmpty()
    val parser = Xml.newPullParser()
    parser.setInput(ByteArrayInputStream(sheetBytes), "UTF-8")
    val rows = mutableListOf<List<String>>()
    var currentRow: MutableList<String>? = null
    var currentCell = ""
    var cellType = ""
    var cellRef = ""
    var cellValue = ""
    var column = 0
    var event = parser.eventType
    while (event != XmlPullParser.END_DOCUMENT) {
      when (event) {
        XmlPullParser.START_TAG -> when (parser.name) {
          "row" -> currentRow = mutableListOf()
          "c" -> { cellRef = parser.getAttributeValue(null, "r") ?: "A1"; cellType = parser.getAttributeValue(null, "t") ?: ""; cellValue = ""; column = columnIndex(cellRef) }
          "v", "t" -> if (currentRow != null) currentCell = parser.nextText()
        }
        XmlPullParser.END_TAG -> when (parser.name) {
          "c" -> {
            val resolved = if (cellType == "s") sharedStrings.getOrNull(cellValue.toIntOrNull() ?: -1).orEmpty() else cellValue
            val target = currentRow
            if (target != null) {
              while (target.size <= column) target.add("")
              target[column] = resolved
            }
            currentCell = ""
          }
          "row" -> currentRow?.let { rows.add(it); currentRow = null }
        }
      }
      if (currentRow != null && currentCell.isNotEmpty()) cellValue = currentCell
      event = parser.next()
    }
    return rows
  }

  private fun parseSharedStrings(bytes: ByteArray): List<String> {
    val parser = Xml.newPullParser()
    parser.setInput(ByteArrayInputStream(bytes), "UTF-8")
    val values = mutableListOf<String>()
    var value = StringBuilder()
    var inItem = false
    var event = parser.eventType
    while (event != XmlPullParser.END_DOCUMENT) {
      when (event) {
        XmlPullParser.START_TAG -> if (parser.name == "si") { inItem = true; value = StringBuilder() } else if (parser.name == "t" && inItem) value.append(parser.nextText())
        XmlPullParser.END_TAG -> if (parser.name == "si") { values.add(value.toString()); inItem = false }
      }
      event = parser.next()
    }
    return values
  }

  private fun columnIndex(reference: String): Int {
    var result = 0
    for (char in reference.takeWhile { it.isLetter() }.uppercase()) result = result * 26 + (char - 'A' + 1)
    return (result - 1).coerceAtLeast(0)
  }

  private fun getDisplayName(uri: Uri): String? {
    var cursor: Cursor? = null
    return try {
      cursor = context.contentResolver.query(uri, null, null, null, null)
      if (cursor != null && cursor.moveToFirst()) {
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0) cursor.getString(index) else null
      } else null
    } finally { cursor?.close() }
  }

  companion object { private const val REQUEST_CODE = 4721 }
}
