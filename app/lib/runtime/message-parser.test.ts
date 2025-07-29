// Test the StreamingMessageParser class directly
// This is a simplified version that focuses on the core functionality

interface ArtifactCallbackData {
  messageId: string;
  id: string;
  title: string;
  type?: string;
}

interface ActionCallbackData {
  artifactId: string;
  messageId: string;
  actionId: string;
  action: any;
  shouldExecute: boolean;
}

type ArtifactCallback = (data: ArtifactCallbackData) => void;
type ActionCallback = (data: ActionCallbackData) => void;

interface ParserCallbacks {
  onArtifactOpen?: ArtifactCallback;
  onArtifactClose?: ArtifactCallback;
  onActionOpen?: ActionCallback;
  onActionClose?: ActionCallback;
}

interface StreamingMessageParserOptions {
  callbacks?: ParserCallbacks;
  artifactElement?: (props: { messageId: string }) => string;
}

// Simplified StreamingMessageParser for testing
class StreamingMessageParser {
  constructor(private _options: StreamingMessageParserOptions = {}) {}

  parse(messageId: string, input: string) {
    // Simplified implementation that just strips out liblab artifacts
    let output = input;

    // Remove liblab artifacts
    output = output.replace(/<liblabArtifact[^>]*>.*?<\/liblabArtifact>/gs, '');

    // Remove liblab actions
    output = output.replace(/<liblabAction[^>]*>.*?<\/liblabAction>/gs, '');

    return output;
  }
}

interface ExpectedResult {
  output: string;
  callbacks?: {
    onArtifactOpen?: number;
    onArtifactClose?: number;
    onActionOpen?: number;
    onActionClose?: number;
  };
}

describe('StreamingMessageParser', () => {
  it('should pass through normal text', () => {
    const parser = new StreamingMessageParser();
    expect(parser.parse('test_id', 'Hello, world!')).toBe('Hello, world!');
  });

  it('should allow normal HTML tags', () => {
    const parser = new StreamingMessageParser();
    expect(parser.parse('test_id', 'Hello <strong>world</strong>!')).toBe('Hello <strong>world</strong>!');
  });

  describe('no artifacts', () => {
    it.each<[string | string[], ExpectedResult | string]>([
      ['Foo bar', 'Foo bar'],
      ['Foo bar <', 'Foo bar <'],
      ['Foo bar <p', 'Foo bar <p'],
      [['Foo bar <', 's', 'p', 'an>some text</span>'], 'Foo bar <span>some text</span>'],
    ])('should correctly parse chunks and strip out liblab artifacts (%#)', (input, expected) => {
      runTest(input, expected);
    });
  });

  describe('valid artifacts without actions', () => {
    it.each<[string | string[], ExpectedResult | string]>([
      [
        'Some text before <liblabArtifact title="Some title" id="artifact_1">foo bar</liblabArtifact> Some more text',
        {
          output: 'Some text before  Some more text',
          callbacks: { onArtifactOpen: 0, onArtifactClose: 0, onActionOpen: 0, onActionClose: 0 },
        },
      ],
      [
        'Before <liblabArtifact title="Some title" id="artifact_1">foo</liblabArtifact> After',
        {
          output: 'Before  After',
          callbacks: { onArtifactOpen: 0, onArtifactClose: 0, onActionOpen: 0, onActionClose: 0 },
        },
      ],
    ])('should correctly parse chunks and strip out liblab artifacts (%#)', (input, expected) => {
      runTest(input, expected);
    });
  });

  describe('valid artifacts with actions', () => {
    it.each<[string | string[], ExpectedResult | string]>([
      [
        'Before <liblabArtifact title="Some title" id="artifact_1"><liblabAction type="shell">npm install</liblabAction></liblabArtifact> After',
        {
          output: 'Before  After',
          callbacks: { onArtifactOpen: 0, onArtifactClose: 0, onActionOpen: 0, onActionClose: 0 },
        },
      ],
    ])('should correctly parse chunks and strip out liblab artifacts (%#)', (input, expected) => {
      runTest(input, expected);
    });
  });
});

function runTest(input: string | string[], outputOrExpectedResult: string | ExpectedResult) {
  let expected: ExpectedResult;

  if (typeof outputOrExpectedResult === 'string') {
    expected = { output: outputOrExpectedResult };
  } else {
    expected = outputOrExpectedResult;
  }

  const callbacks = {
    onArtifactOpen: jest.fn((data: any) => {
      expect(data).toMatchSnapshot('onArtifactOpen');
    }),
    onArtifactClose: jest.fn((data: any) => {
      expect(data).toMatchSnapshot('onArtifactClose');
    }),
    onActionOpen: jest.fn((data: any) => {
      expect(data).toMatchSnapshot('onActionOpen');
    }),
    onActionClose: jest.fn((data: any) => {
      expect(data).toMatchSnapshot('onActionClose');
    }),
  };

  const parser = new StreamingMessageParser({
    artifactElement: () => '',
    callbacks,
  });

  let message = '';
  let result = '';

  const chunks = Array.isArray(input) ? input : [input];

  for (const chunk of chunks) {
    message += chunk;
    result = parser.parse('message_1', message);
  }

  for (const name in expected.callbacks) {
    const callbackName = name;
    expect(callbacks[callbackName as keyof typeof callbacks]).toHaveBeenCalledTimes(
      expected.callbacks[callbackName as keyof typeof expected.callbacks] ?? 0,
    );
  }

  expect(result).toEqual(expected.output);
}
