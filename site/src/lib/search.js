import { normalizeText } from "./format.js";

export function filterArtworks(artworks, { query, category, sort }) {
  const needle = normalizeText(query || "");
  const filtered = artworks.filter((artwork) => {
    const matchesCategory =
      category === "all" ||
      (category === "available" && artwork.status === "available") ||
      (category === "sold" && artwork.status === "sold") ||
      artwork.categories.includes(category);
    const haystack = normalizeText(
      [artwork.title, artwork.year, artwork.technique, artwork.shortDescription, ...artwork.tags, ...artwork.categories].join(" ")
    );
    return matchesCategory && (!needle || haystack.includes(needle));
  });

  return filtered.sort((a, b) => {
    if (sort === "old") return a.year - b.year || a.order - b.order;
    if (sort === "title") return a.title.localeCompare(b.title, "ru");
    return b.year - a.year || a.order - b.order;
  });
}
