import React from 'react';
import { WhatsappIcon } from '../constants';

interface HelpBoxProps {
  title?: string;
  description?: string;
  phone: string; // can be local like 08xxxx
  className?: string;
  variant?: 'public' | 'app';
}

const normalizePhoneForWa = (phone: string) => {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return digits; // fallback
};

const HelpBox: React.FC<HelpBoxProps> = ({
  title = 'Butuh Bantuan?',
  description = 'Jika ada pertanyaan atau butuh bantuan dalam pengisian formulir, jangan ragu untuk menghubungi admin kami melalui WhatsApp.',
  phone,
  className = '',
  variant = 'public',
}) => {
  const waPhone = normalizePhoneForWa(phone);
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent('Halo Admin, saya butuh bantuan.')}`;

  const isPublic = variant === 'public';

  return (
    <div
      className={
        (
          isPublic
            ? 'portal-surface border portal-border text-public-text-primary'
            : 'bg-brand-bg border border-brand-border text-brand-text-primary'
        ) +
        ' rounded-2xl p-4 shadow-sm ' +
        className
      }
    >
      <div className="flex items-start gap-3">
        <div className={(isPublic ? 'bg-public-accent/10 text-public-accent' : 'bg-brand-accent/10 text-brand-accent') + ' p-2 rounded-lg flex-shrink-0'}>
          <WhatsappIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className={(isPublic ? 'text-public-text-primary' : 'text-brand-text-light') + ' font-bold leading-snug'}>{title}</h4>
          <p className={(isPublic ? 'text-public-text-secondary' : 'text-brand-text-secondary') + ' text-sm mt-1 leading-relaxed'}>
            {description}
          </p>
          <div className="mt-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className={'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-soft ' + (isPublic ? 'focus:ring-public-accent' : 'focus:ring-brand-accent')}
              style={{
                backgroundColor: isPublic ? 'var(--public-accent)' as any : 'var(--color-accent)' as any,
                color: '#ffffff',
                opacity: 1,
              }}
            >
              <WhatsappIcon className="w-4 h-4" /> Hubungi Admin ({phone})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
;

export default HelpBox;
