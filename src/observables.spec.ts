import EventEmitter from 'events';
import { describe, expect, it } from 'vitest';

import { fromSharedEvent } from './observables';

describe('fromSharedEvent()', () => {
    it('returns same observable for event emitter/name pair', () => {
        const emitter = new EventEmitter();
        const obs1 = fromSharedEvent(emitter, 'foo');
        const obs2 = fromSharedEvent(emitter, 'foo');
        expect(obs1).toBe(obs2);
    });

    it('returns different observables for different event emitter/name pairs', () => {
        const emitter = new EventEmitter();
        const obs1 = fromSharedEvent(emitter, 'foo');
        const obs2 = fromSharedEvent(emitter, 'bar');
        expect(obs1).not.toBe(obs2);

        const emitter2 = new EventEmitter();
        const obs3 = fromSharedEvent(emitter2, 'foo');
        const obs4 = fromSharedEvent(emitter2, 'bar');
        expect(obs1).not.toBe(obs3);
        expect(obs2).not.toBe(obs4);
    });

    it('sets up listener only once per event emitter/name pair', () => {
        const emitter = new EventEmitter();
        const observable = fromSharedEvent(emitter, 'foo');
        observable.subscribe();
        observable.subscribe();

        expect(emitter.listenerCount('foo')).toBe(1);
    });
});
