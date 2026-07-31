export async function readBodyStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (bytes: number) => void,
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onChunk(value.length);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
