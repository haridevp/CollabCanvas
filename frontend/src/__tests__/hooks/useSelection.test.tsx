import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../../hooks/useSelection';
import type { DrawingElement, Point } from '../../types/canvas';

describe('useSelection', () => {
    const mockElements: DrawingElement[] = [];
    const setElements = jest.fn();
    const zoomLevel = 1;
    const panOffset = { x: 0, y: 0 };

    it('initializes correctly', () => {
        const { result } = renderHook(() =>
            useSelection(mockElements, setElements, zoomLevel, panOffset)
        );

        expect(result.current.selection.selectedIds).toEqual([]);
        expect(result.current.dragBox).toBeNull();
    });

    it('updates dragBox state on drag', () => {
        const { result } = renderHook(() =>
            useSelection(mockElements, setElements, zoomLevel, panOffset)
        );

        const startPoint: Point = { x: 10, y: 10 };
        const endPoint: Point = { x: 50, y: 50 };

        act(() => {
            // Simulate mouse down to start drag
            const mockEvent = { shiftKey: false } as React.MouseEvent;
            result.current.handleSelectionStart(mockEvent, startPoint);
        });

        expect(result.current.dragBox).toEqual({ start: startPoint, end: startPoint });

        act(() => {
            // Simulate drag move
            result.current.handleDragBox(endPoint);
        });

        expect(result.current.dragBox).toEqual({ start: startPoint, end: endPoint });

        act(() => {
            // Simulate mouse up to end drag
            result.current.handleSelectionEnd(endPoint);
        });

        expect(result.current.dragBox).toBeNull();
    });
});
