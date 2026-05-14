"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewSummaryDto = exports.ReputationProfileDto = void 0;
class ReputationProfileDto {
    userId;
    averageRating;
    totalReviews;
    reputationScore;
    wilsonScore;
    completedJobsAsWorker;
    completedJobsAsCustomer;
    responseTimeMinutes;
    badges;
    recentReviews;
    trendScore;
}
exports.ReputationProfileDto = ReputationProfileDto;
class ReviewSummaryDto {
    id;
    rating;
    comment;
    reviewerName;
    reviewerImageUrl;
    createdAt;
    reply;
}
exports.ReviewSummaryDto = ReviewSummaryDto;
//# sourceMappingURL=reputation-profile.dto.js.map