import { stripCodeFenceFromArtifact } from '~/utils/markdown-utils';

describe('stripCodeFenceFromArtifact', () => {
  it('should remove code fences around artifact element', () => {
    const input = "```xml\n<div class='__liblabArtifact__'></div>\n```";
    const expected = "\n<div class='__liblabArtifact__'></div>\n";
    expect(stripCodeFenceFromArtifact(input)).toBe(expected);
  });

  it('should handle code fence with language specification', () => {
    const input = "```typescript\n<div class='__liblabArtifact__'></div>\n```";
    const expected = "\n<div class='__liblabArtifact__'></div>\n";
    expect(stripCodeFenceFromArtifact(input)).toBe(expected);
  });

  it('should not modify content without artifacts', () => {
    const input = '```\nregular code block\n```';
    expect(stripCodeFenceFromArtifact(input)).toBe(input);
  });

  it('should handle empty input', () => {
    expect(stripCodeFenceFromArtifact('')).toBe('');
  });

  it('should handle artifact without code fences', () => {
    const input = "<div class='__liblabArtifact__'></div>";
    expect(stripCodeFenceFromArtifact(input)).toBe(input);
  });

  it('should handle multiple artifacts but only remove fences around them', () => {
    const input = [
      'Some text',
      '```typescript',
      "<div class='__liblabArtifact__'></div>",
      '```',
      '```',
      'regular code',
      '```',
    ].join('\n');

    const expected = ['Some text', '', "<div class='__liblabArtifact__'></div>", '', '```', 'regular code', '```'].join(
      '\n',
    );

    expect(stripCodeFenceFromArtifact(input)).toBe(expected);
  });
});
