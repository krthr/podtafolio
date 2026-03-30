import { PodcastIndex } from "podcastindex";

let _client: PodcastIndex | undefined;

export function usePodcastIndex(): PodcastIndex {
  if (!_client) {
    const config = useRuntimeConfig();
    _client = new PodcastIndex({
      key: config.podcastIndexApiKey,
      secret: config.podcastIndexApiSecret,
    });
  }
  return _client;
}

export async function searchPodcastIndex(term: string, max = 25) {
  const client = usePodcastIndex();
  const results = await client.search.byTerm({ q: term, max });
  return results.feeds.map((feed) => ({
    podcastIndexId: String(feed.id),
    title: feed.title,
    feedUrl: feed.url,
    artworkUrl: feed.artwork || feed.image || null,
    description: feed.description || null,
    language: feed.language || "es",
  }));
}
