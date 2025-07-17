export interface NormalizedError {
  message: string;
  stack: string;
}

interface ExecError {
  status: number;
  signal?: string;
  stderr?: string;
  stdout?: string;
}

function isError(error: any): error is Error {
  return error instanceof Error;
}

function isExecError(error: any): error is ExecError {
  return typeof error === 'object' && error !== null && typeof error.status === 'number';
}

function isObjectError(error: any): error is Record<string, any> {
  return typeof error === 'object' && error !== null;
}

export function normalizeError(error: any): NormalizedError {
  const normalizedError: NormalizedError = {
    message: 'Unknown error',
    stack: '',
  };

  if (isError(error)) {
    normalizedError.message = error.message;
    normalizedError.stack = error.stack || '';
  } else if (isExecError(error)) {
    normalizedError.message = `Process failed with status ${error.status}`;

    if (error.signal) {
      normalizedError.message += ` (signal: ${error.signal})`;
    }

    if (error.stderr) {
      normalizedError.message += ` - ${error.stderr}`;
    }

    if (error.stdout) {
      normalizedError.message += ` - ${error.stdout}`;
    }
  } else if (isObjectError(error)) {
    // Handle other object errors
    normalizedError.message = JSON.stringify(error);
  } else {
    normalizedError.message = String(error);
  }

  return normalizedError;
}
