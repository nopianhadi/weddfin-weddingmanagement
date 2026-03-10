import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export interface QrCodeDisplayProps {
  /** Data to encode (e.g. URL) */
  value: string;
  /** Size in pixels (width and height) */
  size?: number;
  /** Foreground color (default #020617) */
  fgColor?: string;
  /** Background color (default #ffffff) */
  bgColor?: string;
  /** Error correction: L, M, Q, H (default M) */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** Optional wrapper id for download/querySelector (e.g. contract-portal-qrcode) */
  wrapperId?: string;
  /** Optional className for the wrapper div */
  className?: string;
}

/**
 * Single place for QR code rendering. Uses qrcode.react (canvas) for compatibility with download-as-PNG.
 * Replaces legacy window.QRCode usage in Contracts, Clients, Freelancers.
 */
export function QrCodeDisplay({
  value,
  size = 200,
  fgColor = '#020617',
  bgColor = '#ffffff',
  level = 'H',
  wrapperId,
  className = 'p-4 bg-white rounded-lg inline-block mx-auto',
}: QrCodeDisplayProps) {
  const content = (
    <QRCodeCanvas
      value={value}
      size={size}
      fgColor={fgColor}
      bgColor={bgColor}
      level={level}
      includeMargin={false}
    />
  );
  if (wrapperId) {
    return (
      <div id={wrapperId} className={className}>
        {content}
      </div>
    );
  }
  return <div className={className}>{content}</div>;
}

export default QrCodeDisplay;
