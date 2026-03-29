export interface ITunesPodcast {
  trackId: number
  trackName: string
  feedUrl: string
  artworkUrl600: string
  collectionName: string
  artistName: string
  primaryGenreName: string
  genres: string[]
}

interface ITunesSearchResponse {
  resultCount: number
  results: ITunesPodcast[]
}

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search'

export async function searchITunes(params: {
  term: string
  country?: string
  genre?: string
  limit?: number
}): Promise<ITunesPodcast[]> {
  const query = new URLSearchParams({
    term: params.term,
    media: 'podcast',
    country: params.country || 'CO',
    limit: String(params.limit || 25),
  })
  if (params.genre) {
    query.set('genreId', params.genre)
  }

  const res = await fetch(`${ITUNES_SEARCH_URL}?${query}`)
  if (!res.ok) {
    throw new Error(`iTunes API error: ${res.status} ${res.statusText}`)
  }

  const data: ITunesSearchResponse = await res.json()
  // Only return results that have a feed URL
  return data.results.filter((r) => r.feedUrl)
}
