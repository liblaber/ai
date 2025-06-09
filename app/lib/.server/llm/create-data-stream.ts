import { type DataStreamWriter, formatDataStreamPart } from 'ai';

export function createDataStream({
  execute,
  onError = () => 'An error occurred.', // mask error messages for safety by default
}: {
  execute: (dataStream: DataStreamWriter) => Promise<void> | void;
  onError?: (error: unknown) => string;
}): ReadableStream<any> {
  let controller!: ReadableStreamDefaultController<string>;

  const ongoingStreamPromises: Promise<void>[] = [];

  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg;
    },
  });

  function safeEnqueue(data: any) {
    try {
      controller.enqueue(data);
    } catch (error) {
      console.error(error);
    }
  }

  try {
    const result = execute({
      write(data: any) {
        safeEnqueue(data);
      },
      writeData(data) {
        safeEnqueue(formatDataStreamPart('data', [data]));
      },
      writeMessageAnnotation(annotation) {
        safeEnqueue(formatDataStreamPart('message_annotations', [annotation]));
      },
      writeSource(source) {
        safeEnqueue(formatDataStreamPart('source', source));
      },
      merge(streamArg) {
        ongoingStreamPromises.push(
          (async () => {
            const reader = streamArg.getReader();

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              safeEnqueue(value);
            }
          })().catch((error) => {
            safeEnqueue(formatDataStreamPart('error', onError(error)));
          }),
        );
      },
      onError,
    });

    if (result) {
      ongoingStreamPromises.push(
        result.catch((error) => {
          safeEnqueue(formatDataStreamPart('error', onError(error)));
        }),
      );
    }
  } catch (error) {
    safeEnqueue(formatDataStreamPart('error', onError(error)));
  }

  /*
   * Wait until all ongoing streams are done. This approach enables merging
   * streams even after execute has returned, as long as there is still an
   * open merged stream. This is important to e.g. forward new streams and
   * from callbacks.
   */
  // eslint-disable-next-line no-async-promise-executor
  const waitForStreams: Promise<void> = new Promise(async (resolve) => {
    while (ongoingStreamPromises.length > 0) {
      await ongoingStreamPromises.shift();
    }
    resolve();
  });

  waitForStreams.finally(() => {
    try {
      controller.close();
    } catch (error) {
      console.error('Error closing stream:', error);
    }
  });

  return stream;
}
