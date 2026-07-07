// Cross-platform generic file download utility.
// On web: uses dart:html Blob + AnchorElement to trigger a browser download.
// On mobile/desktop: stub (caller handles via path_provider + share_plus).
export 'file_downloader_stub.dart'
    if (dart.library.html) 'file_downloader_web.dart';
