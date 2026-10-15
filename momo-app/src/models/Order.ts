import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface IOrderCustomer {
  name: string;
  phone: string;
  address: string;
  businessName?: string;
  ownerName?: string;
}

export interface IOrder extends Document {
  customer: IOrderCustomer;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paidAmount?: number;
  bakiAmount?: number;
  paymentStatus?: "Pending" | "Paid" | "Scheduled" | "Partially Paid";
  totalPieces: number;
  orderType: "retail" | "bulk";
  status: "pending" | "confirmed" | "preparing" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    variant: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    customer: {
      name: { type: String, trim: true },
      ownerName: { type: String, trim: true },
      businessName: { type: String, trim: true },
      phone: { type: String, required: [true, "Phone number is required"], trim: true },
      address: { type: String, required: [true, "Delivery address is required"], trim: true },
    },
    items: {
      type: [OrderItemSchema],
      validate: {
        validator: function (items: IOrderItem[]) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    totalPieces: { type: Number, default: 0 },
    orderType: {
      type: String,
      enum: ["retail", "bulk"],
      default: "retail",
    },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    bakiAmount: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Scheduled", "Partially Paid"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "delivered", "cancelled"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose model overwrite error during Next.js Hot Module Replacement
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
