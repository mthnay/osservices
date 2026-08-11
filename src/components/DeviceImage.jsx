import React, { useMemo, useState } from 'react';
import { getDeviceImageSources } from '../utils/productImages';

/**
 * Servis kaydının cihaz görseli. Yüklenemeyen adreste sessizce sıradaki kaynağa
 * geçer (kaydın görseli -> ürün fotoğrafı -> gömülü SVG), böylece hiçbir koşulda
 * kırık görsel simgesi görünmez.
 */
const DeviceImage = ({ image, productGroup, device, apiUrl, alt, className = '', ...imgProps }) => {
    const sources = useMemo(
        () => getDeviceImageSources(image, productGroup, device, apiUrl),
        [image, productGroup, device, apiUrl]
    );

    // Kaynak listesi değişince (başka bir kayıt gösterilince) baştan başla
    const [failedSrc, setFailedSrc] = useState(null);
    const activeIndex = Math.max(0, sources.indexOf(failedSrc) + 1);
    const src = sources[Math.min(activeIndex, sources.length - 1)];

    return (
        <img
            src={src}
            alt={alt ?? `${device || 'Cihaz'} görseli`}
            loading="lazy"
            decoding="async"
            className={className}
            onError={() => {
                // Son kaynak veri URI; oraya gelindiyse daha fazla denemeye gerek yok
                if (src !== sources[sources.length - 1]) setFailedSrc(src);
            }}
            {...imgProps}
        />
    );
};

export default DeviceImage;
