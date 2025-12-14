// Staff ratings storage utility
// Ratings are stored in localStorage as anonymous ratings

export interface StaffRating {
  staffId: string;
  rating: number; // 1-4 stars
  timestamp: string;
}

const RATINGS_STORAGE_KEY = "staff_ratings";

export function getStaffRatings(): StaffRating[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(RATINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addStaffRating(staffId: string, rating: number): void {
  if (typeof window === "undefined") return;
  
  try {
    const ratings = getStaffRatings();
    const newRating: StaffRating = {
      staffId,
      rating,
      timestamp: new Date().toISOString(),
    };
    ratings.push(newRating);
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  } catch (error) {
    // Error is handled silently
  }
}

export function getStaffAverageRating(staffId: string): number | null {
  const ratings = getStaffRatings();
  const staffRatings = ratings.filter((r) => r.staffId === staffId);
  
  if (staffRatings.length === 0) return null;
  
  const sum = staffRatings.reduce((acc, r) => acc + r.rating, 0);
  return sum / staffRatings.length;
}

export function getStaffRatingCount(staffId: string): number {
  const ratings = getStaffRatings();
  return ratings.filter((r) => r.staffId === staffId).length;
}

