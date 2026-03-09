/**
 * @fileoverview Decompression utility for incoming DrawingElement payloads.
 * This mirrors the frontend's decompressDrawingData to ensure the backend 
 * stores actual uncompressed state for seamless transmission to late joiners.
 */

/**
 * Decompress drawing data received from network
 * @param {Array<Object>} compressed 
 * @returns {Array<Object>}
 */
function decompressDrawingData(compressed) {
    if (!Array.isArray(compressed)) return [];

    return compressed.map((c) => {
        const base = {
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
                    base.points = c.p.map((p) => ({ x: p.x, y: p.y }));
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

        // Restore brush properties
        if (c.bp) {
            base.brushProperties = {
                color: c.bp.c,
                width: c.bp.w,
                opacity: c.bp.o,
                type: c.bp.t,
            };
        }

        return base;
    });
}

module.exports = {
    decompressDrawingData
};
