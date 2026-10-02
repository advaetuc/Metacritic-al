export interface TmdbMovieSummary {
  id: number;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  overview: string;
  genreIds: number[];
  voteAverage: number | null;
  voteCount: number | null;
}

export interface TmdbSearchResponse {
  results: TmdbMovieSummary[];
  totalResults: number;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  tagline: string;
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
}

export interface TmdbApiError {
  error: {
    code: string;
    message: string;
  };
}
