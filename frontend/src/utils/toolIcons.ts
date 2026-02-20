import {
    MousePointer,
    Pencil,
    Square,
    Circle,
    Minus,
    ArrowRight,
    Type,
    Eraser,
    Image as ImageIcon,
    Move
} from 'lucide-react';

export const toolConfig: Record<string, { icon: any; label: string; color: string }> = {
    select: { icon: MousePointer, label: 'Selecting', color: '#6b7280' },
    pencil: { icon: Pencil, label: 'Drawing', color: '#3b82f6' },
    rectangle: { icon: Square, label: 'Rectangle', color: '#10b981' },
    circle: { icon: Circle, label: 'Circle', color: '#8b5cf6' },
    line: { icon: Minus, label: 'Line', color: '#f59e0b' },
    arrow: { icon: ArrowRight, label: 'Arrow', color: '#ec4899' },
    text: { icon: Type, label: 'Text', color: '#06b6d4' },
    eraser: { icon: Eraser, label: 'Erasing', color: '#ef4444' },
    image: { icon: ImageIcon, label: 'Placing image', color: '#84cc16' },
    move: { icon: Move, label: 'Moving', color: '#6366f1' }
};

export const getToolIcon = (tool: string) => {
    return toolConfig[tool]?.icon || MousePointer;
};

export const getToolLabel = (tool: string) => {
    return toolConfig[tool]?.label || 'Interacting';
};

export const getToolColor = (tool: string) => {
    return toolConfig[tool]?.color || '#6b7280';
};