/* ------------------------------------------------------------------
   Ambar türleri

     KGB    → takılacak yeni parça        (stoklu, seri takipli)
     KBB    → cihazdan sökülen arızalı parça (stoklu, seri takipli)
     BB     → bütün birim parçası         (STOKSUZ — yalnızca kod kataloğu)
     loaner → ödünç cihaz                 (category alanından ayrılır)

   Bütün birim kayıtları stok sayımına, kritik stok uyarılarına ve envanter
   değerine girmez; KGB/KBB ambarlarıyla karışmaması için ayrı tutulur.
   Bu kayıtlarda `partNumber` bütün birim kodunu, `name` ise açıklamasını taşır.
------------------------------------------------------------------ */

export const WAREHOUSE_WHOLE_UNIT = 'BB';

export const isLoanerItem = (item) => item?.category === 'loaner';

/** Bütün birim kataloğu kaydı mı */
export const isWholeUnitItem = (item) => item?.warehouseType === WAREHOUSE_WHOLE_UNIT;

/** Stok sayımına giren kayıtlar: bütün birim kodları ve ödünç cihazlar hariç */
export const isStockedItem = (item) => !isWholeUnitItem(item) && !isLoanerItem(item);

/** Girilen kodu bütün birim kataloğunda arar (kod ya da kayıt id'si ile) */
export const findWholeUnitByCode = (inventory, code) => {
    const needle = String(code || '').trim().toUpperCase();
    if (!needle) return null;
    return (inventory || []).find(item => isWholeUnitItem(item) && (
        String(item.partNumber || '').toUpperCase() === needle ||
        String(item.id || '').toUpperCase() === needle
    )) || null;
};
