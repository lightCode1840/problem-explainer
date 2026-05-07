// Shared SSE stream helper — used by ProblemEditor and ProgrammingEditor.
// Eliminates ~30 lines of duplicated ReadableStream parsing per editor.

interface SSEMessage {
  chunk?: string;
  error?: string;
  final?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamSSE(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '请求失败');
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) throw new Error('无法读取数据流');

  let parsedData: any = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6).trim();
      if (!dataStr) continue;
      try {
        const msg = JSON.parse(dataStr) as SSEMessage;
        if (msg.error) throw new Error(msg.error);
        if (msg.final) parsedData = msg.final;
      } catch (e) {
        if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  if (!parsedData) throw new Error('未接收到完整的解析结果');
  return parsedData;
}
