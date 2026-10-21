/**
 * Universal PWA-safe PDF receipt downloader.
 * Fetches the PDF as a Blob and triggers an in-page download
 * without navigating away or causing a white screen in standalone PWA mode.
 */
export async function downloadReceipt(
  orderId: string,
  options: { dashboardPaidOnly?: boolean; receiptToken?: string } = {}
): Promise<boolean> {
  const query = options.dashboardPaidOnly ? "&dashboard=1" : "";

  try {
    const headers = options.receiptToken
      ? { "x-receipt-token": options.receiptToken }
      : undefined;
    const res = await fetch(`/api/orders/${orderId}/receipt?download=1${query}`, { headers });
    if (!res.ok) {
      const result = await res.json().catch(() => null);
      throw new Error(result?.error ?? `Receipt download failed with status ${res.status}`);
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
    return false;
  }
}
