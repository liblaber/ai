export interface NormalizedError {
  message: string;
  stack: string;
}

export function normalizeError(error: any): NormalizedError {
  const normalizedError: NormalizedError = {
    message: 'Unknown error',
    stack: '',
  };

  if (error instanceof Error) {
    normalizedError.message = error.message;
    normalizedError.stack = error.stack || '';
  } else if (typeof error === 'object' && error !== null) {
    // Handle execSync errors which have status, signal, output properties
    const execError = error as any;
    normalizedError.message = `Process failed with status ${execError.status}`;

    if (execError.signal) {
      normalizedError.message += ` (signal: ${execError.signal})`;
    }

    if (execError.stderr) {
      normalizedError.message += ` - ${execError.stderr}`;
    }

    if (execError.stdout) {
      normalizedError.message += ` - ${execError.stdout}`;
      console.log('THE stdout:', `${execError.stdout}`);
    }
  } else {
    normalizedError.message = String(error);
  }

  return normalizedError;
}
