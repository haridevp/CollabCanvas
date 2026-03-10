import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../../hooks/useUndoRedo';

describe('useUndoRedo', () => {
    it('should initialize with the provided state', () => {
        const { result } = renderHook(() => useUndoRedo(0));
        expect(result.current.present).toBe(0);
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([]);
    });

    it('should update state and record history when setState is called', () => {
        const { result } = renderHook(() => useUndoRedo(0));

        act(() => {
            result.current.setState(1);
        });

        expect(result.current.present).toBe(1);
        expect(result.current.past).toEqual([0]);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo the last state change', () => {
        const { result } = renderHook(() => useUndoRedo(0));

        act(() => {
            result.current.setState(1);
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.present).toBe(0);
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([1]);
        expect(result.current.canRedo).toBe(true);
    });

    it('should redo an undone state change', () => {
        const { result } = renderHook(() => useUndoRedo(0));

        act(() => {
            result.current.setState(1);
        });

        act(() => {
            result.current.undo();
        });

        act(() => {
            result.current.redo();
        });

        expect(result.current.present).toBe(1);
        expect(result.current.past).toEqual([0]);
        expect(result.current.future).toEqual([]);
    });

    it('should not add to history when replaceState is called', () => {
        const { result } = renderHook(() => useUndoRedo(0));

        act(() => {
            result.current.replaceState(1);
        });

        expect(result.current.present).toBe(1);
        expect(result.current.past).toEqual([]);
    });

    it('should clear future history when setState is called after undo', () => {
        const { result } = renderHook(() => useUndoRedo(0));

        act(() => {
            result.current.setState(1);
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.setState(2);
        });

        expect(result.current.present).toBe(2);
        expect(result.current.future).toEqual([]);
        expect(result.current.canRedo).toBe(false);
    });
});
