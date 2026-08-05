/**
 * Cheap pre-check: is targetRole a real job title and jobDescription a real JD?
 * Runs before full resume analysis so we never invent a misleading ATS score.
 */

export const INVALID_TARGET_MESSAGE =
  'Oops! You added a wrong Target Role and Job Description. Please check them and try again.';

export function buildTargetRoleJdValidationPrompt(
  targetRole: string,
  jobDescription: string,
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You validate hiring inputs for an ATS resume tool.
Return ONLY compact JSON: {"valid":boolean,"reason":string}

Mark valid=false when ANY of these apply:
- targetRole is not a plausible job title / profession (gibberish, random words, essay, unrelated sentence, keyboard mash, fake nonsense even if long English)
- jobDescription is not a real job description (random paragraph, story, lorem-like filler, unrelated text, no hiring intent, nonsense even if 1000+ words)
- role and JD clearly do not describe any real hiring need

Mark valid=true when:
- targetRole looks like a real role (e.g. "Software Engineer", "Nurse", "Sales Manager")
- jobDescription looks like a real JD or hiring brief (responsibilities, requirements, skills, team/company context — any language OK)

Be strict on nonsense. Be lenient on short but real JDs and non-English real roles/JDs.
reason: one short sentence for the user when valid=false; empty string when valid=true.`;

  const userMessage = `Validate these inputs.

targetRole:
"""
${targetRole.slice(0, 500)}
"""

jobDescription:
"""
${jobDescription.slice(0, 4000)}
"""`;

  return { systemPrompt, userMessage };
}
