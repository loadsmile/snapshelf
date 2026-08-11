function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function searchOrganizations<T extends { name: string }>(organizations: T[], query: string) {
  const terms = normalizeSearchValue(query)
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return organizations;
  }

  return organizations.filter((organization) => {
    const searchableName = normalizeSearchValue(organization.name);
    return terms.every((term) => searchableName.includes(term));
  });
}
