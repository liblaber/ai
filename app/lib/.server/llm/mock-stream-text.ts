import { simulateReadableStream, streamText as _streamText } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';

export const BUILD_HELLO_WORLD_APPLICATION_RESPONSE =
  "Sure. I'll start by:\n" +
  '1.  Updating the types for the SQL query result.\n' +
  '2.  Creating a new component to display the organization count.\n' +
  '3.  Implementing the homepage to display "Hello World!" and the organization count.\n' +
  '\n' +
  '<liblabArtifact id="hello-world-application" title="Create Hello World Application">\n' +
  '  <liblabAction type="commit-message">Implement Hello World application with organization count display</liblabAction>\n' +
  '  <liblabAction type="file" filePath="app/lib/types.ts">\n' +
  'export type QueryData<T> = { isError: false; data: T } | { isError: true; errorMessage: string; };\n' +
  '\n' +
  'export type OrganizationCount = {\n' +
  "  'COUNT(*)': number;\n" +
  '};\n' +
  '</liblabAction>\n' +
  '  <liblabAction type="file" filePath="app/components/OrganizationCountDisplay.tsx">\n' +
  "'use client';\n" +
  '\n' +
  "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\n" +
  "import { OrganizationCount } from '@/lib/types';\n" +
  '\n' +
  'export function OrganizationCountDisplay({ data }: { data: OrganizationCount[] }) {\n' +
  "  const count = data.length > 0 ? data[0]['COUNT(*)'] : 0;\n" +
  '\n' +
  '  return (\n' +
  '    <Card className="w-full max-w-md mx-auto">\n' +
  '      <CardHeader>\n' +
  '        <CardTitle className="text-xl font-semibold">Total Organizations</CardTitle>\n' +
  '      </CardHeader>\n' +
  '      <CardContent>\n' +
  '        <p className="text-4xl font-bold text-primary">{count}</p>\n' +
  '        <p className="text-sm text-muted-foreground mt-2">\n' +
  '          This count is fetched from the database.\n' +
  '        </p>\n' +
  '      </CardContent>;\n' +
  '    </Card>\n' +
  '  );\n' +
  '}\n' +
  '</liblabAction>\n' +
  '  <liblabAction type="file" filePath="app/page.tsx">\n' +
  "import { executeQuery } from '@/db/execute-query';\n" +
  "import { WithErrorHandling } from '@/components/hoc/WithErrorHandling';\n" +
  "import { OrganizationCountDisplay } from '@/components/OrganizationCountDisplay';\n" +
  "import { OrganizationCount } from '@/lib/types';\n" +
  '\n' +
  'export default async function Home() {\n' +
  '  const organizationCountResult = await executeQuery<OrganizationCount>(\n' +
  "    'SELECT COUNT(*) FROM organizations'\n" +
  '  );\n' +
  '\n' +
  '  return (\n' +
  '    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 space-y-8">\n' +
  '      <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl text-center">\n' +
  '        Hello World!\n' +
  '      </h1>\n' +
  '      <p className="text-lg text-muted-foreground text-center max-w-prose">\n' +
  "        This is a simple demonstration page. Below, you'll find a count of organizations\n" +
  '        fetched directly from the database.\n' +
  '      </p>\n' +
  '      <WithErrorHandling\n' +
  '        queryData={organizationCountResult}\n' +
  '        component={OrganizationCountDisplay}\n' +
  '      />;\n' +
  '    </main>\n' +
  '  );\n' +
  '}\n' +
  '</liblabAction>\n' +
  '</liblabArtifact>';

export function mockStreamText(userMessage: string) {
  const chunks = BUILD_HELLO_WORLD_APPLICATION_RESPONSE.match(/\S+\s+\S+\s+\S+/g)!
    .slice(0, 180)
    .map((token) => ({
      type: 'text-delta' as const,
      textDelta: `${token} `,
    }));

  return _streamText({
    maxRetries: 3,
    model: new MockLanguageModelV1({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunkDelayInMs: 20,
          initialDelayInMs: 1000,
          chunks: [
            ...chunks,
            {
              type: 'finish',
              finishReason: 'stop',
              logprobs: undefined,
              usage: { completionTokens: 10, promptTokens: 3 },
            },
          ],
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      }),
    }),
    prompt: userMessage,
  });
}
