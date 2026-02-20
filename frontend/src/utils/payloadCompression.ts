import type { DrawingElement, Point } from '../types/canvas';

/**
 * Compress drawing data for network transmission
 * Reduces payload size by:
 * - Removing unnecessary fields
 * - Quantizing coordinates
 * - Using shorter property names
 */
export function compressDrawingData(elements: DrawingElement[]): any[] {
    return elements.map(el => {
        const base: any = {
            i: el.id,           // id
            t: el.type,         // type
            c: el.color,        // color
            w: el.strokeWidth,  // strokeWidth
            o: el.opacity,      // opacity
            l: el.layerId,      // layerId
        };

        // Add type-specific fields with quantization
        switch (el.type) {
            case 'rectangle':
            case 'circle':
            case 'image':
            case 'text':
                base.x = Math.round(el.x!);
                base.y = Math.round(el.y!);
                base.wd = Math.round(el.width!);   // width
                base.h = Math.round(el.height!);    // height
                break;

            case 'line':
            case 'arrow':
            case 'pencil':
            case 'eraser':
                if (el.points) {
                    // Quantize points to reduce precision
                    base.p = el.points.map(p => ({
                        x: Math.round(p.x),
                        y: Math.round(p.y)
                    }));
                }
                break;
        }

        // Add text-specific fields
        if (el.type === 'text') {
            const textEl = el as any;
            base.f = {
                ff: textEl.format.fontFamily,
                fs: textEl.format.fontSize,
                fw: textEl.format.fontWeight,
                fst: textEl.format.fontStyle,
                td: textEl.format.textDecoration,
                ta: textEl.format.textAlign,
                col: textEl.format.color
            };
            base.txt = textEl.text;
        }

        // Add image-specific fields
        if (el.type === 'image') {
            const imgEl = el as any;
            base.src = imgEl.src;
            base.ow = imgEl.originalWidth;
            base.oh = imgEl.originalHeight;
        }

        // Add stroke style if not default
        if (el.strokeStyle && (el.strokeStyle.type !== 'solid' || el.strokeStyle.dashArray)) {
            base.ss = {
                ty: el.strokeStyle.type,
                da: el.strokeStyle.dashArray,
                lc: el.strokeStyle.lineCap,
                lj: el.strokeStyle.lineJoin
            };
        }

        return base;
    });
}

/**
 * Decompress drawing data received from network
 */
export function decompressDrawingData(compressed: any[]): DrawingElement[] {
    return compressed.map((c: any) => {
        const base: any = {
            id: c.i,
            type: c.t,
            color: c.c,
            strokeWidth: c.w,
            opacity: c.o,
            layerId: c.l,
        };

        // Restore type-specific fields
        switch (c.t) {
            case 'rectangle':
            case 'circle':
            case 'image':
            case 'text':
                base.x = c.x;
                base.y = c.y;
                base.width = c.wd;
                base.height = c.h;
                break;

            case 'line':
            case 'arrow':
            case 'pencil':
            case 'eraser':
                if (c.p) {
                    base.points = c.p.map((p: any) => ({ x: p.x, y: p.y }));
                }
                break;
        }

        // Restore text-specific fields
        if (c.t === 'text' && c.f) {
            base.format = {
                fontFamily: c.f.ff,
                fontSize: c.f.fs,
                fontWeight: c.f.fw,
                fontStyle: c.f.fst,
                textDecoration: c.f.td,
                textAlign: c.f.ta,
                color: c.f.col
            };
            base.text = c.txt;
        }

        // Restore image-specific fields
        if (c.t === 'image') {
            base.src = c.src;
            base.originalWidth = c.ow;
            base.originalHeight = c.oh;
        }

        // Restore stroke style
        if (c.ss) {
            base.strokeStyle = {
                type: c.ss.ty,
                dashArray: c.ss.da,
                lineCap: c.ss.lc,
                lineJoin: c.ss.lj
            };
        }

        return base as DrawingElement;
    });
}

/**
 * Estimate payload size in bytes
 */
export function estimatePayloadSize(data: any): number {
    const json = JSON.stringify(data);
    return new Blob([json]).size;
}

/**
 * Should we compress this payload?
 * Returns true if payload exceeds threshold
 */
export function shouldCompress(elements: DrawingElement[], threshold: number = 10240): boolean {
    const estimatedSize = estimatePayloadSize(elements);
    return estimatedSize > threshold;
}