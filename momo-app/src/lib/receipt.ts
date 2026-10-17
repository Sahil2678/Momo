import PDFDocument from "pdfkit";
import { normalizeSpecialFont } from "@/lib/font-styles";

export interface ReceiptItem {
  name: string;
  variant?: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  orderId: string;
  date: string;
  customerName: string;
  phone: string;
  address?: string;
  items: ReceiptItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      // Header
      doc.fontSize(22).font("Helvetica-Bold").text("RK MOMO - WHOLESALE RECEIPT", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").text("Fresh Wholesale & Retail Momo", { align: "center" });
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#cccccc");
      doc.moveDown(1);

      // Order & Customer Details
      const startY = doc.y;
      doc.fontSize(10).font("Helvetica-Bold").text("Order Details:");
      doc.font("Helvetica");
      doc.text(`Order ID: ${data.orderId}`);
      doc.text(`Date: ${data.date}`);
      doc.text(`Payment Status: ${data.paymentStatus}`);

      doc.text("", 300, startY);
      doc.font("Helvetica-Bold").text("Customer Information:");
      doc.font("Helvetica");
      const cleanCustomerName = normalizeSpecialFont(data.customerName);
      const printableName = cleanCustomerName && cleanCustomerName !== data.customerName
        ? `${data.customerName} (${cleanCustomerName})`
        : data.customerName;
      doc.text(`Name: ${printableName}`);
      doc.text(`Phone: ${data.phone}`);
      if (data.address) {
        doc.text(`Address: ${data.address}`);
      }

      doc.moveDown(2);
      doc.x = 40;

      // Table Header
      const tableTop = doc.y + 10;
      doc.rect(40, tableTop, 515, 20).fill("#f3f4f6");
      doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10);
      doc.text("Item", 50, tableTop + 5, { width: 220 });
      doc.text("Quantity", 270, tableTop + 5, { width: 70, align: "right" });
      doc.text("Rate (Rs.)", 350, tableTop + 5, { width: 90, align: "right" });
      doc.text("Amount (Rs.)", 450, tableTop + 5, { width: 95, align: "right" });

      let currentY = tableTop + 25;
      doc.font("Helvetica").fontSize(9);

      data.items.forEach((item) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        const itemName = item.variant ? `${item.name} (${item.variant})` : item.name;

        doc.text(itemName, 50, currentY, { width: 220 });
        doc.text(String(item.quantity), 270, currentY, { width: 70, align: "right" });
        doc.text(Number(item.price).toFixed(2), 350, currentY, { width: 90, align: "right" });
        doc.text(itemTotal.toFixed(2), 450, currentY, { width: 95, align: "right" });

        currentY += 20;
      });

      doc.moveTo(40, currentY).lineTo(555, currentY).stroke("#e5e7eb");
      currentY += 10;

      // Totals
      doc.font("Helvetica").fontSize(10);
      if (data.deliveryFee && data.deliveryFee > 0) {
        doc.text("Subtotal:", 350, currentY, { width: 90, align: "right" });
        doc.text(`Rs. ${Number(data.subtotal).toFixed(2)}`, 450, currentY, { width: 95, align: "right" });
        currentY += 16;
        doc.text("Delivery Fee:", 350, currentY, { width: 90, align: "right" });
        doc.text(`Rs. ${Number(data.deliveryFee).toFixed(2)}`, 450, currentY, { width: 95, align: "right" });
        currentY += 16;
      }

      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("Total Amount:", 350, currentY, { width: 90, align: "right" });
      doc.text(`Rs. ${Number(data.total).toFixed(2)}`, 450, currentY, { width: 95, align: "right" });
      currentY += 25;

      // Status Badge area
      doc.rect(40, currentY, 515, 30).fill("#fff7ed");
      doc.fillColor("#9a3412").font("Helvetica-Bold").fontSize(10);
      doc.text(`Default Payment Status: ${data.paymentStatus.toUpperCase()}`, 50, currentY + 10);

      // Footer
      doc.fontSize(8).fillColor("#6b7280").font("Helvetica").text(
        "Thank you for ordering with RK MOMO! For wholesale enquiries & support contact us directly.",
        40,
        750,
        { align: "center", width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
