export const KNOWN_VAULT_KEYS = [
  'years_of_experience',
  'github_url',
  'linkedin_url',
  'portfolio_url',
  'notice_period',
  'expected_salary',
  'phone_number',
  'first_name',
  'last_name',
];

export function matchFieldToVaultKey(field: { label: string; name?: string; type?: string }): string | null {
  const textToMatch = `${field.label} ${field.name || ''}`.toLowerCase();
  
  if (textToMatch.includes('years of experience') || textToMatch.includes('how many years')) {
    return 'years_of_experience';
  }
  if (textToMatch.includes('github')) {
    return 'github_url';
  }
  if (textToMatch.includes('linkedin')) {
    return 'linkedin_url';
  }
  if (textToMatch.includes('portfolio') || textToMatch.includes('website')) {
    return 'portfolio_url';
  }
  if (textToMatch.includes('notice period') || textToMatch.includes('available to start')) {
    return 'notice_period';
  }
  if (textToMatch.includes('expected salary') || textToMatch.includes('compensation')) {
    return 'expected_salary';
  }
  if (textToMatch.includes('phone') || field.type === 'tel') {
    return 'phone_number';
  }
  if (textToMatch.includes('first name')) {
    return 'first_name';
  }
  if (textToMatch.includes('last name')) {
    return 'last_name';
  }

  return null;
}
