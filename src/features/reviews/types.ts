export type ExistingReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  driverId?: string | null;
  deliveryBidId?: string | null;
};

export type ReviewEligibility = {
  canReviewRestaurant: boolean;
  canReviewDelivery: boolean;
  reasons: {
    restaurant: string[];
    delivery: string[];
  };
  existing: {
    restaurant: ExistingReview | null;
    delivery: ExistingReview | null;
  };
  targets: {
    branchId: string | null;
    driverId: string | null;
    acceptedBidId: string | null;
  };
};

export type ReviewSubmitPayload = {
  rating: number;
  comment?: string;
};
