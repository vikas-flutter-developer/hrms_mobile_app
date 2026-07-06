// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

// ignore: deprecated_member_use
void downloadPdfBytes(List<int> bytes, String filename) {
  final blob = html.Blob([bytes], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  // ignore: deprecated_member_use
  (html.AnchorElement(href: url)
    ..setAttribute('download', filename)
    ..click());
  html.Url.revokeObjectUrl(url);
}
