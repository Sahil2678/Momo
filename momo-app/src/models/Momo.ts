import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMomo extends Document {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  wholesalePricePerPiece: number;
  rating: number;
  reviewCount: number;
  pieces: number;
  spiceLevel?: string;
  category: "Steamed" | "Crispy Fried" | "Tandoori & Grill" | "Signature Specials";
  badge?: string;
  isVeg: boolean;
  image: string;
  ingredients: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MomoSchema = new Schema<IMomo>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    wholesalePricePerPiece: { type: Number, default: 3, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    pieces: { type: Number, required: true, min: 1 },
    spiceLevel: { type: String, default: "Medium" },
    category: {
      type: String,
      enum: ["Steamed", "Crispy Fried", "Tandoori & Grill", "Signature Specials"],
      required: true,
    },
    badge: { type: String },
    isVeg: { type: Boolean, default: true },
    image: { type: String, required: true },
    ingredients: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Momo: Model<IMomo> =
  mongoose.models.Momo || mongoose.model<IMomo>("Momo", MomoSchema);

export default Momo;
