/**
 * Sheet.best API client helper
 * Sheet columns: Date, Order_ID, Name, Phone, Total, Paid_Amount, Baki_Amount, Payment_Status
 */

export interface SheetOrderRow {
  Date: string;
  Order_ID: string;
  Name: string;
  Phone: string;
  Total: number | string;
  Paid_Amount: number | string;
  Baki_Amount: number | string;
  Payment_Status: string;
}

export async function appendOrderToSheet(url: string, row: SheetOrderRow): Promise<any> {
  const cleanUrl = url.replace(/\/+$/, "");
  const res = await fetch(cleanUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([row]),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Sheet.best POST failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function getOrdersFromSheet(url: string): Promise<SheetOrderRow[]> {
  const cleanUrl = url.replace(/\/+$/, "");
  const res = await fetch(cleanUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Sheet.best GET failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function getOrderByIdFromSheet(url: string, orderId: string): Promise<SheetOrderRow | null> {
  const cleanUrl = url.replace(/\/+$/, "");
  // Sheet.best allows searching by column query: /Order_ID/{orderId}
  const searchUrl = `${cleanUrl}/Order_ID/${encodeURIComponent(orderId)}`;
  const res = await fetch(searchUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    if (data && typeof data === "object" && !Array.isArray(data) && data.Order_ID) {
      return data as SheetOrderRow;
    }
  }

  // Fallback: fetch all and find
  const all = await getOrdersFromSheet(url);
  const found = all.find((r) => String(r.Order_ID).trim() === String(orderId).trim());
  return found || null;
}

export async function patchOrderByOrderId(
  url: string,
  orderId: string,
  updates: Partial<SheetOrderRow>
): Promise<any> {
  const cleanUrl = url.replace(/\/+$/, "");
  const targetUrl = `${cleanUrl}/Order_ID/${encodeURIComponent(orderId)}`;

  const res = await fetch(targetUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Sheet.best PATCH failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}
