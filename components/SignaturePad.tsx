import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2Icon } from '../constants';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onClose: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number, y: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            setTimeout(setupCanvas, 200);
            return;
        }

        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(ratio, ratio);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setupCanvas();
        }, 300);

        window.addEventListener('resize', setupCanvas);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', setupCanvas);
        };
    }, []);

    const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { offsetX: 0, offsetY: 0 };
        const rect = canvas.getBoundingClientRect();

        if (e.nativeEvent instanceof MouseEvent) {
            return { offsetX: e.nativeEvent.clientX - rect.left, offsetY: e.nativeEvent.clientY - rect.top };
        }
        if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length > 0) {
            return { offsetX: e.nativeEvent.touches[0].clientX - rect.left, offsetY: e.nativeEvent.touches[0].clientY - rect.top };
        }
        return { offsetX: 0, offsetY: 0 };
    }, []);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { offsetX, offsetY } = getCoords(e);
        setIsDrawing(true);
        if (!isSigned) setIsSigned(true);

        lastPointRef.current = { x: offsetX, y: offsetY };
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    }, [getCoords, isSigned]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !lastPointRef.current) return;

        const { offsetX, offsetY } = getCoords(e);
        const midPointX = (lastPointRef.current.x + offsetX) / 2;
        const midPointY = (lastPointRef.current.y + offsetY) / 2;

        ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPointX, midPointY);
        ctx.stroke();

        lastPointRef.current = { x: offsetX, y: offsetY };
    }, [isDrawing, getCoords]);

    const stopDrawing = useCallback(() => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !lastPointRef.current) return;

        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.stroke();
        ctx.closePath();

        setIsDrawing(false);
        lastPointRef.current = null;
    }, [isDrawing]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
        setIsSigned(false);
    }, []);

    const saveSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas && isSigned) {
            const dataUrl = canvas.toDataURL('image/png');
            onSave(dataUrl);
        } else {
            alert("Mohon bubuhkan tanda tangan terlebih dahulu.");
        }
    }, [onSave, isSigned]);

    return (
        <div className="flex flex-col items-center w-full">
            <p className="text-sm text-brand-text-secondary mb-3 text-center">Gunakan mouse atau jari Anda untuk menandatangani di area di bawah ini.</p>
            <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg border-2 border-dashed border-brand-border overflow-hidden bg-white">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!isSigned && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-brand-text-secondary/60">
                        <p className="font-semibold text-lg">Tanda Tangan di Sini</p>
                        <div className="w-3/4 h-px bg-brand-border mt-10"></div>
                    </div>
                )}
            </div>
            <div className="flex flex-col sm:flex-row w-full justify-between items-center mt-4 gap-3">
                <button
                    onClick={clearCanvas}
                    disabled={!isSigned}
                    className="w-full sm:w-auto button-secondary text-sm inline-flex items-center justify-center gap-2"
                >
                    <Trash2Icon className="w-4 h-4" /> Ulangi
                </button>
                <div className="flex w-full sm:w-auto items-center gap-3">
                    <button onClick={onClose} className="w-full sm:w-auto button-secondary text-sm">Batal</button>
                    <button onClick={saveSignature} disabled={!isSigned} className="w-full sm:w-auto button-primary text-sm">Simpan Tanda Tangan</button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SignaturePad);
