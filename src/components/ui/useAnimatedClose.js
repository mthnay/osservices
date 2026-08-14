import { useCallback, useEffect, useRef, useState } from 'react';

const reduceMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Modal / panel gibi ekranların kapanırken de animasyon oynatabilmesi için.
 *
 * React'te bileşen DOM'dan kalkınca animasyon oynayamaz; bu hook kapanışı
 * `duration` kadar geciktirip bu sırada `closing` bayrağını true yapar.
 *
 *   const { closing, requestClose } = useAnimatedClose(onClose);
 *   <div className={closing ? 'animate-out fade-out' : 'animate-in fade-in'}>
 *       <button onClick={requestClose}>Kapat</button>
 *   </div>
 */
export default function useAnimatedClose(onClose, duration = 200) {
    const [closing, setClosing] = useState(false);
    const timerRef = useRef(0);
    const startedRef = useRef(false);

    const requestClose = useCallback(() => {
        if (typeof onClose !== 'function') return;

        if (reduceMotion()) {
            onClose();
            return;
        }

        // Çift tıklamada ikinci bir zamanlayıcı kurulmasın.
        if (startedRef.current) return;
        startedRef.current = true;

        setClosing(true);
        timerRef.current = setTimeout(onClose, duration);
    }, [onClose, duration]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return { closing, requestClose };
}
