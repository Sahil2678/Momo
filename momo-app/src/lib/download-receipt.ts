/**
 * Universal PWA-safe PDF receipt downloader.
 * Fetches the PDF as a Blob and triggers an in-page download
 * without navigating away or causing a white screen in standalone PWA mode.
 */
export async function downloadReceipt(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderId}/receipt?download=1`);
    if (!res.ok) {
      throw new Error(`Receipt download failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Receipt-${orderId}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);

    return true;
  } catch (err) {
    console.error("Receipt download failed, using fallback:", err);
    // Fallback: If blob download fails for any reason
    const fallbackLink = document.createElement("a");
    fallbackLink.href = `/api/orders/${orderId}/receipt?download=1`;
    fallbackLink.download = `Receipt-${orderId}.pdf`;
    fallbackLink.target = "_blank";
    fallbackLink.rel = "noopener noreferrer";
    fallbackLink.click();
    return false;
  }
}
