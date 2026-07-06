// Cross-platform PDF download utility.
// On web: uses dart:html Blob + AnchorElement to trigger a browser download.
// On mobile/desktop: stub (caller handles via path_provider + share_plus).
export 'pdf_downloader_stub.dart'
    if (dart.library.html) 'pdf_downloader_web.dart';
