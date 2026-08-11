export const ORGANIZATION_NAME_MAX_LENGTH = 80;

export type OrganizationType = 'Shelf' | 'Stack';

export function normalizeOrganizationName(value: string) {
  return value.trim();
}

export function getOrganizationNameError(value: string, type: OrganizationType): string | null {
  const normalizedName = normalizeOrganizationName(value);

  if (!normalizedName) {
    return `${type} name is required.`;
  }

  if (Array.from(normalizedName).length > ORGANIZATION_NAME_MAX_LENGTH) {
    return `${type} name must be ${ORGANIZATION_NAME_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function validateOrganizationName(value: string, type: OrganizationType) {
  const error = getOrganizationNameError(value, type);

  if (error) {
    throw new Error(error);
  }

  return normalizeOrganizationName(value);
}
