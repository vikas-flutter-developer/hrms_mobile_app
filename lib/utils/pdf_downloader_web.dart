// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:typed_data';

// ignore: deprecated_member_use
void downloadPdfBytes(List<int> bytes, String filename) {
  // Must convert to Uint8List so dart2js produces a JS Uint8Array,
  // not a plain JS Array — plain arrays result in a corrupt/empty PDF.
  final uint8list = Uint8List.fromList(bytes);
  final blob = html.Blob([uint8list], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  // ignore: deprecated_member_use
  (html.AnchorElement(href: url)
    ..setAttribute('download', filename)
    ..click());
  html.Url.revokeObjectUrl(url);
}
