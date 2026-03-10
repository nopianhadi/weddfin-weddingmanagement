import React, { useEffect, useRef, useState } from 'react';
import { formatIdFromRaw, parseIdNumber } from '../utils/currency';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
    value: string;
    onChange: (rawValue: string) => void;
    allowNegative?: boolean;
};

const RupiahInput: React.FC<Props> = ({ value, onChange, allowNegative = false, ...rest }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [display, setDisplay] = useState(() => formatIdFromRaw(value, { allowNegative }));

    useEffect(() => {
        const next = formatIdFromRaw(value, { allowNegative });
        setDisplay(next);
    }, [value, allowNegative]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const el = e.target;
        const prevDigitsBeforeCaret = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D+/g, '').length;

        const raw = parseIdNumber(el.value, { allowNegative });
        onChange(raw);

        const nextDisplay = formatIdFromRaw(raw, { allowNegative });
        setDisplay(nextDisplay);

        requestAnimationFrame(() => {
            const node = inputRef.current;
            if (!node) return;
            let digitsSeen = 0;
            let pos = 0;
            while (pos < node.value.length && digitsSeen < prevDigitsBeforeCaret) {
                if (/\d/.test(node.value[pos])) digitsSeen += 1;
                pos += 1;
            }
            node.setSelectionRange(pos, pos);
        });
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        rest.onBlur?.(e);
        const raw = parseIdNumber(display, { allowNegative });
        onChange(raw);
        setDisplay(formatIdFromRaw(raw, { allowNegative }));
    };

    return (
        <input
            {...rest}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};

export default RupiahInput;
