export interface Movie {
  id: string;
  imageUrl: string;
  mediaType?: string;
  badge?: string;
  genres?: string[];
}

export interface MovieRow {
  rowTitle: string;
  movies: Movie[];
  type?: "normal" | "top_10" | "games";
  showAll?: boolean;
  showAllRoute?: string;
}

export interface MoviesData {
  movies: MovieRow[];
}

export interface FeaturedMovie {
  id: string;
  title: string;
  thumbnail: string;
  categories: string[];
  logoUrl?: string;
}

export type DeviceMotionData = {
  rotation: {
    alpha: number;
    beta: number;
    gamma: number;
  };
};
