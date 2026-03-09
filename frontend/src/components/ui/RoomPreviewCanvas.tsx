import React, { useEffect, useRef } from 'react';

export interface RoomPreviewCanvasProps {
    drawingData?: any[];
    className?: string;
}

export const RoomPreviewCanvas: React.FC<RoomPreviewCanvasProps> = ({ drawingData, className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use a fixed resolution for rendering the preview
        canvas.width = 1200;
        canvas.height = 800;

        // Default white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!drawingData || drawingData.length === 0) return;

        // We scale down the preview slightly so that drawings aren't glued to the edges
        const scale = 0.8;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        const renderElement = (el: any) => {
            ctx.save();
            ctx.strokeStyle = el.color || '#000000';
            ctx.lineWidth = el.strokeWidth || 3;
            ctx.lineCap = el.strokeStyle?.lineCap || 'round';
            ctx.lineJoin = el.strokeStyle?.lineJoin || 'round';
            ctx.globalAlpha = el.opacity ?? 1;

            if (el.strokeStyle?.dashArray && el.strokeStyle.dashArray.length > 0) {
                ctx.setLineDash(el.strokeStyle.dashArray);
            } else if (el.strokeStyle?.type === 'dashed') {
                ctx.setLineDash([5, 5]);
            } else if (el.strokeStyle?.type === 'dotted') {
                ctx.setLineDash([1, 3]);
            }

            switch (el.type) {
                case 'pencil':
                case 'line':
                    if (el.points && el.points.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(el.points[0].x, el.points[0].y);
                        for (let i = 1; i < el.points.length; i++) {
                            ctx.lineTo(el.points[i].x, el.points[i].y);
                        }
                        ctx.stroke();
                    }
                    break;
                case 'eraser':
                    ctx.globalCompositeOperation = 'destination-out';
                    if (el.points && el.points.length > 0) {
                        let eraseWidth = el.strokeWidth || 20;
                        ctx.beginPath();
                        ctx.moveTo(el.points[0].x, el.points[0].y);
                        for (let i = 1; i < el.points.length; i++) {
                            ctx.lineTo(el.points[i].x, el.points[i].y);
                        }
                        ctx.lineWidth = eraseWidth;
                        ctx.stroke();
                    }
                    break;
                case 'rectangle':
                    ctx.strokeRect(el.x, el.y, el.width, el.height);
                    break;
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(el.width / 2, 2) + Math.pow(el.height / 2, 2)
                    );
                    ctx.beginPath();
                    ctx.arc(
                        el.x + el.width / 2,
                        el.y + el.height / 2,
                        radius,
                        0,
                        Math.PI * 2
                    );
                    ctx.stroke();
                    break;
                case 'text':
                    ctx.fillStyle = el.color || '#000000';
                    const fontSize = el.format?.fontSize || (el.strokeWidth * 4) || 24;
                    const fontFamily = el.format?.fontFamily || 'Arial';
                    const fontWeight = el.format?.fontWeight || 'normal';
                    const fontStyle = el.format?.fontStyle || 'normal';
                    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                    ctx.fillText(el.text || '', el.x, el.y);
                    break;
                case 'image':
                    // We'll skip image in the generic preview renderer since they might be async, 
                    // but we can draw a placeholder
                    ctx.strokeRect(el.x, el.y, el.width, el.height);
                    ctx.beginPath();
                    ctx.moveTo(el.x, el.y);
                    ctx.lineTo(el.x + el.width, el.y + el.height);
                    ctx.moveTo(el.x + el.width, el.y);
                    ctx.lineTo(el.x, el.y + el.height);
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        };

        try {
            drawingData.forEach(renderElement);
        } catch (e) {
            console.error("Preview render error", e);
        }
    }, [drawingData]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover ${className}`}
        />
    );
};
