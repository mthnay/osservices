/* ------------------------------------------------------------------
   Ambar türleri (sunucu tarafı)

   Bütün birim (BB) kayıtları bir mağaza ambarına ait değildir: sistem
   geneli bir kod kataloğudur. Bu yüzden `storeId` 0 ile saklanır ve
   mağaza kapsamı filtrelerinden muaf tutulur.

   NOT: Arayüz karşılığı src/utils/warehouse.js. Biri değişirse diğeri de
   güncellenmeli (src/ electron paketine dahil edilmediği için ortak
   import yapılamıyor).
------------------------------------------------------------------ */

export const WAREHOUSE_WHOLE_UNIT = 'BB';

/** Sistem geneli bütün birim kataloğu kaydı mı */
export const isWholeUnitItem = (item) => item?.warehouseType === WAREHOUSE_WHOLE_UNIT;

/** Bütün birim kayıtlarının mağaza kimliği (ambara bağlı değil) */
export const WHOLE_UNIT_STORE_ID = 0;
