// Versioned internal HTTP review records. No game state or browser side effects.
export type ReviewSide = 'before' | 'after';
export type ReviewVerdict = 'accept' | 'changes' | 'cant';
export type ReviewPin = { image: ReviewSide; x: number; y: number; text: string };
export type ReviewInput = {
  question: string;
  change: string;
  topic: string;
  build: string;
  launcher: string;
  context?: Record<string, unknown>;
};
export type ReviewCard = ReviewInput & {
  version: 1;
  id: string;
  created: string;
  evidence: Record<ReviewSide, { url: string; sha256: string; mime: string; bytes: number }>;
};
export type ReviewSubmission = {
  kind: 'review-v1';
  reviewId: string;
  submissionId: string;
  verdict: ReviewVerdict;
  pin?: ReviewPin;
};
export type ReviewReceipt = { status: 'received'; at: string; submission: ReviewSubmission; card: ReviewCard };
export type ReviewAck = { status: 'received'; reviewId: string; submissionId: string; at: string; duplicate: boolean };
