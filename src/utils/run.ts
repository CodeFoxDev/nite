const ran: Array<{ id: string; result: any }> = [];

export async function Once<R>(id: string, cb: () => R): Promise<R> {
  const f = ran.find((e) => e.id == id);
  if (f !== undefined) return f.result;

  const r = await cb();
  ran.push({ id, result: r });
  return r;
}
