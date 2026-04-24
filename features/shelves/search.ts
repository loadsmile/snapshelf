function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function searchShelves<T extends { name: string }>(shelves: T[], query: string) {
  const terms = normalizeSearchValue(query)
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return shelves;
  }

  return shelves.filter((shelf) => {
    const searchableName = normalizeSearchValue(shelf.name);
    return terms.every((term) => searchableName.includes(term));
  });
}
