// Stub implementation for non-web platforms.
// On mobile/desktop, we use path_provider + share_plus.
void downloadPdfBytes(List<int> bytes, String filename) {
  // No-op on non-web; handled separately via path_provider.
}
