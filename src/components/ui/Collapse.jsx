import { useEffect, useRef, useState } from 'react';

const reduceMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Açılır/kapanır alanlar için yükseklik animasyonlu sarmalayıcı.
 *
 * İçerik `open` false iken DOM'dan tamamen kaldırılır (kapanış animasyonu
 * bittikten sonra), böylece grid/flex düzenlerinde boş satır bırakmaz.
 *
 * Kullanım:
 *   <Collapse open={acik}>
 *       <Icerik />
 *   </Collapse>
 *
 * Ağır listelerde children fonksiyon olarak verilebilir; bu durumda içerik
 * yalnızca alan açıkken oluşturulur:
 *   <Collapse open={acik}>{() => <UzunListe />}</Collapse>
 */
const Collapse = ({
    open,
    children,
    className = '',
    duration = 320,
    ...rest
}) => {
    const innerRef = useRef(null);
    const rafRef = useRef(0);
    const timerRef = useRef(0);
    const firstRun = useRef(true);

    const [mounted, setMounted] = useState(open);
    const [state, setState] = useState(open ? 'open' : 'closed');
    const [height, setHeight] = useState(open ? 'auto' : '0px');

    useEffect(() => {
        // İlk render'da animasyon oynatma; sadece mevcut durumu koru.
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }

        cancelAnimationFrame(rafRef.current);
        clearTimeout(timerRef.current);

        if (open) {
            // 1. adım: içerik henüz DOM'da değilse önce onu ekle.
            //          `mounted` değişince bu effect yeniden çalışır.
            if (!mounted) {
                setMounted(true);
                return;
            }

            if (reduceMotion()) {
                setState('open');
                setHeight('auto');
                return;
            }

            // 2. adım: bir kare bekle ki tarayıcı 0px başlangıcını görsün,
            //          sonra gerçek yüksekliğe doğru animasyonu başlat.
            rafRef.current = requestAnimationFrame(() => {
                setHeight(`${innerRef.current?.scrollHeight ?? 0}px`);
                setState('open');
                // Animasyon bitince 'auto'ya geç ki içerik sonradan büyüyebilsin.
                timerRef.current = setTimeout(() => setHeight('auto'), duration);
            });
            return;
        }

        if (!mounted) return;

        if (reduceMotion()) {
            setState('closed');
            setHeight('0px');
            setMounted(false);
            return;
        }

        // Kapanış: 'auto' yüksekliği önce piksele sabitle, sonra 0'a indir.
        setHeight(`${innerRef.current?.scrollHeight ?? 0}px`);
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = requestAnimationFrame(() => {
                setHeight('0px');
                setState('closed');
            });
        });
        timerRef.current = setTimeout(() => setMounted(false), duration);
    }, [open, mounted, duration]);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(timerRef.current);
    }, []);

    if (!mounted) return null;

    return (
        <div
            className={`collapse-region ${className}`}
            data-state={state}
            // Animasyon bittiğinde (height 'auto') taşmayı serbest bırak ki
            // içerideki açılır menü/tooltip gibi öğeler kırpılmasın.
            style={{ height, overflow: height === 'auto' ? 'visible' : 'hidden' }}
            {...rest}
        >
            <div ref={innerRef}>
                {typeof children === 'function' ? children() : children}
            </div>
        </div>
    );
};

export default Collapse;
