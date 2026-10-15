export type SpiceLevel = "Mild" | "Medium" | "Hot" | "Extra Fiery";
export type MomoCategory =
  | "Steamed"
  | "Crispy Fried"
  | "Tandoori & Grill"
  | "Signature Specials";

export interface MomoItem {
  _id?: string;
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number; // Regular price per pack/portion
  wholesalePricePerPiece?: number; // Bulk price per piece for orders >= 500 pcs
  rating: number;
  reviewCount: number;
  pieces: number;
  spiceLevel: SpiceLevel;
  category: MomoCategory;
  badge?: string;
  isVeg: boolean;
  image: string;
  ingredients: string[];
}

export function getWholesalePriceForItem(item: MomoItem): number {
  if (typeof item.wholesalePricePerPiece === "number" && item.wholesalePricePerPiece > 0) {
    return item.wholesalePricePerPiece;
  }
  const normalized = item.name.toLowerCase();
  if (normalized.includes("paneer") || normalized.includes("cheese")) {
    return 3.75;
  }
  return 2.75;
}

export const MINIMUM_WHOLESALE_PIECES = 500;


