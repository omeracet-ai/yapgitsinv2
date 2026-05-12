'use client';

import React, { useEffect, useState } from 'react';

/**
 * Phase 165 — Reputation Profile Component
 * Displays worker reputation, badges, and recent reviews.
 * Shows trust signals and achievement badges for marketplace transparency.
 */
interface Badge {
  id: string;
  badgeType: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  awardedAt: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  reviewerImageUrl: string | null;
  createdAt: string;
  reply: { text: string; repliedAt: string } | null;
}

interface ReputationProfile {
  userId: string;
  averageRating: number;
  totalReviews: number;
  reputationScore: number;
  wilsonScore: number;
  completedJobsAsWorker: number;
  completedJobsAsCustomer: number;
  responseTimeMinutes: number | null;
  badges: Badge[];
  recentReviews: Review[];
  trendScore: number;
  timeDecayScore: number;
}

export function ReputationProfile({ workerId }: { workerId: string }) {
  const [profile, setProfile] = useState<ReputationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `/api/workers/${workerId}/reputation`,
        );
        if (!response.ok) throw new Error('Failed to fetch reputation');
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [workerId]);

  if (loading) {
    return <div className="reputation-loading">Loading reputation...</div>;
  }

  if (error || !profile) {
    return <div className="reputation-error">Error: {error}</div>;
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#ff6b6b';
      case 'epic': return '#9c27b0';
      case 'rare': return '#2196f3';
      case 'common': return '#808080';
      default: return '#ccc';
    }
  };

  const starRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(rating) ? 'star-full' : 'star-empty'}>
          ★
        </span>,
      );
    }
    return stars;
  };

  return (
    <div className="reputation-profile">
      <style>{`
        .reputation-profile {
          max-width: 800px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .reputation-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .rating-display {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .rating-stars {
          font-size: 20px;
          margin-bottom: 12px;
          letter-spacing: 2px;
        }

        .star-full {
          color: #ffd700;
        }

        .star-empty {
          color: rgba(255, 255, 255, 0.3);
        }

        .rating-meta {
          font-size: 14px;
          opacity: 0.9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
          text-transform: uppercase;
        }

        .badges-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }

        .badges-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          background: white;
          border: 2px solid;
          text-align: center;
          min-width: 100px;
          transition: transform 0.2s;
        }

        .badge:hover {
          transform: translateY(-4px);
        }

        .badge-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .badge-name {
          font-size: 13px;
          font-weight: 600;
        }

        .badge-rarity {
          font-size: 11px;
          text-transform: uppercase;
          margin-top: 4px;
          opacity: 0.7;
        }

        .reviews-section {
          margin-bottom: 24px;
        }

        .review-item {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          border-left: 4px solid #667eea;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .review-author {
          font-weight: 600;
          color: #333;
        }

        .review-date {
          font-size: 12px;
          color: #999;
        }

        .review-rating {
          font-size: 14px;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .review-text {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .review-reply {
          background: white;
          padding: 12px;
          border-radius: 4px;
          margin-top: 12px;
          border-left: 2px solid #667eea;
        }

        .reply-label {
          font-size: 11px;
          font-weight: 600;
          color: #667eea;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .reply-text {
          font-size: 13px;
          color: #666;
        }

        .trend-indicator {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .trend-positive {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .trend-negative {
          background: #ffebee;
          color: #c62828;
        }

        .trend-neutral {
          background: #f5f5f5;
          color: #666;
        }
      `}</style>

      {/* Reputation Header */}
      <div className="reputation-header">
        <div className="rating-display">{profile.averageRating.toFixed(1)}</div>
        <div className="rating-stars">
          {starRating(profile.averageRating)}
        </div>
        <div className="rating-meta">
          Based on {profile.totalReviews} reviews
          {profile.trendScore !== 0 && (
            <>
              {' • '}
              <span className={`trend-indicator ${profile.trendScore > 0 ? 'trend-positive' : 'trend-negative'}`}>
                {profile.trendScore > 0 ? '+' : ''}{profile.trendScore} this month
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{profile.reputationScore}</div>
          <div className="stat-label">Reputation Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.completedJobsAsWorker}</div>
          <div className="stat-label">Jobs Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {profile.responseTimeMinutes ? `${profile.responseTimeMinutes}m` : 'N/A'}
          </div>
          <div className="stat-label">Avg Response</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.wilsonScore.toFixed(2)}</div>
          <div className="stat-label">Wilson Score</div>
        </div>
      </div>

      {/* Badges Section */}
      {profile.badges.length > 0 && (
        <div className="badges-section">
          <h3 className="section-title">Achievements</h3>
          <div className="badges-container">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="badge"
                style={{ borderColor: getRarityColor(badge.rarity) }}
                title={badge.description || ''}
              >
                <div className="badge-icon">{badge.iconUrl ? '🏆' : '⭐'}</div>
                <div className="badge-name">{badge.displayName}</div>
                <div className="badge-rarity">{badge.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {profile.recentReviews.length > 0 && (
        <div className="reviews-section">
          <h3 className="section-title">Recent Reviews</h3>
          {profile.recentReviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-author">{review.reviewerName}</span>
                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="review-rating">
                {starRating(review.rating)}
              </div>
              {review.comment && (
                <div className="review-text">{review.comment}</div>
              )}
              {review.reply && (
                <div className="review-reply">
                  <div className="reply-label">Worker Reply</div>
                  <div className="reply-text">{review.reply.text}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {profile.recentReviews.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '24px' }}>
          No reviews yet
        </div>
      )}
    </div>
  );
}
