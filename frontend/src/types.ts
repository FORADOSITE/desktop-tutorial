export interface CatalogPlan {
  id: string;
  title: string;
  price: string;
  period: string;
  badge?: string;
  savings?: string;
  features: string[];
}

export interface SubscriptionLocation {
  cep: string;
  cidade: string;
  estado: string;
}

export interface SubscriptionCreate {
  planId: string;
  period: string;
  paymentMethod: "pix" | "debit";
  location: SubscriptionLocation;
}

export interface OwnerEntitlementCreate {
  location: SubscriptionLocation;
}

export interface Subscription {
  id: string;
  planId: string;
  planTitle: string;
  period: string;
  status: "confirmed_mock" | "active_owner";
  paymentMocked: boolean;
  paymentMethod: "pix" | "debit" | "owner";
  location: SubscriptionLocation;
  createdAt: string;
}

export interface PublicAuthConfig {
  clerkPublishableKey: string | null;
}

export interface OwnerStatus {
  isOwner: boolean;
}