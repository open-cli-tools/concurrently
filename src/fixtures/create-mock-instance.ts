import { MockedObject, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockInstance<T>(constructor: new (...args: any[]) => T): MockedObject<T> {
    return new (vi.mockObject(constructor))() as MockedObject<T>;
}
