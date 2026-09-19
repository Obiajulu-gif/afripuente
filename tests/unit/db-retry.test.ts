import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
vi.mock('server-only', () => ({}));
import { withDbRetry } from '@/lib/db';

afterEach(() => vi.useRealTimers());
describe('database cold-start retry', () => {
  it('recovers from a Prisma initialization error without an error code', async () => {
    vi.useFakeTimers();
    const error = new Prisma.PrismaClientInitializationError("Can't reach database server at example:5432", '6.19.3');
    const query = vi.fn().mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValue('ready');
    const result = withDbRetry(query);
    await vi.runAllTimersAsync();
    expect(await result).toBe('ready');
    expect(query).toHaveBeenCalledTimes(3);
  });
  it('does not retry constraint or authentication failures', async () => {
    for (const error of [
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.19.3' }),
      new Prisma.PrismaClientInitializationError('Authentication failed', '6.19.3', 'P1000'),
    ]) {
      const query = vi.fn().mockRejectedValue(error);
      await expect(withDbRetry(query)).rejects.toBe(error);
      expect(query).toHaveBeenCalledTimes(1);
    }
  });
  it('stops after the configured number of connection attempts', async () => {
    vi.useFakeTimers();
    const error = new Prisma.PrismaClientInitializationError("Can't reach database server", '6.19.3');
    const query = vi.fn().mockRejectedValue(error);
    const result = expect(withDbRetry(query)).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await result;
    expect(query).toHaveBeenCalledTimes(3);
  });
});
