// Canonical category definitions used across the UI + posting forms.
export type CategoryDef = { id: string; label: string; emoji: string };

export const marketCategories: CategoryDef[] = [
  { id: "featured", label: "Featured", emoji: "🔥" },
  { id: "food, snacks & bites", label: "Food, Snacks & Bites", emoji: "🍔" },
  { id: "thrift & fashion", label: "Thrift & Fashion", emoji: "👗" },
  { id: "tech & electronics", label: "Tech & Electronics", emoji: "📱" },
  { id: "fintech & internet services", label: "Fintech & Internet Services", emoji: "💳" },
  { id: "housing & rental services", label: "Housing & Rental Services", emoji: "🏠" },
  { id: "beauty & style", label: "Beauty & Style", emoji: "💅" },
  { id: "books & academia", label: "Books & Academia", emoji: "📚" },
  { id: "furnitures", label: "Furnitures", emoji: "🪑" },
  { id: "others", label: "Others", emoji: "🎁" },
  { id: "delivery", label: "Delivery", emoji: "🛵" },
];

export const gigCategories: CategoryDef[] = [
  { id: "paid", label: "Paid Gigs", emoji: "💼" },
  { id: "design", label: "Design & Media", emoji: "🎨" },
  { id: "tutoring", label: "Tutoring & Writing", emoji: "📚" },
  { id: "general", label: "General Help & others", emoji: "🛠️" },
  { id: "job", label: "Job Post", emoji: "💻" },
  { id: "urgent", label: "Urgent", emoji: "⚡" },
];

export const postableProductCategories = marketCategories.filter((c) => c.id !== "featured");

export const postableGigCategories = gigCategories.filter((c) => c.id !== "urgent");
