// PostgreSQL üzerinde Mongoose uyumlu küçük veri katmanı.
//
// CRM, MongoDB Atlas'tan merkez PostgreSQL sunucusuna taşındı. Veri, Atlas aktarımının
// oluşturduğu tablolarda durur: her koleksiyon <şema>.<koleksiyon> tablosudur ve
//   _id (metin, birincil anahtar) | belge (JSONB, belgenin tamamı) | aktarildi (son yazma zamanı)
// sütunlarından oluşur. Bu modül, rotaların kullandığı Mongoose API alt kümesini
// (Schema, model, find/findOne/..., sort/limit/select/lean, save/deleteOne, $or/$in/$regex/...)
// aynı davranışla bu tablolara uygular; böylece rota kodu değişmeden kalır.
//
// Saklama biçimi Atlas aktarımıyla aynıdır: tarihler ISO metin, Buffer'lar base64 metin,
// ObjectId'ler 24 haneli onaltılık metin. Okurken şemaya göre Date/Buffer'a geri çevrilir.

import crypto from 'crypto';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

let pool = null;
let SCHEMA = 'mobile_asp';
const registry = new Map(); // modelAdı -> Model

// ---------------------------------------------------------------- ObjectId

const PROCESS_RAND = crypto.randomBytes(5);
let oidCounter = crypto.randomBytes(3).readUIntBE(0, 3);

export const newObjectId = () => {
    const b = Buffer.alloc(12);
    b.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    PROCESS_RAND.copy(b, 4);
    oidCounter = (oidCounter + 1) % 0xffffff;
    b.writeUIntBE(oidCounter, 9, 3);
    return b.toString('hex');
};

const isObjectIdString = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

// ---------------------------------------------------------------- Hatalar

class CastError extends Error {
    constructor(kind, value, path, modelName) {
        const shown = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
        super(`Cast to ${kind} failed for value ${shown} (type ${typeof value}) at path "${path}"` +
            (modelName ? ` for model "${modelName}"` : ''));
        this.name = 'CastError';
        this.kind = kind;
        this.path = path;
        this.value = value;
    }
}

class ValidationError extends Error {
    constructor(modelName, errors) {
        super(`${modelName} validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
        this.name = 'ValidationError';
        this.errors = Object.fromEntries(errors.map(e => [e.path, e]));
    }
}

// PostgreSQL hatalarını rotaların beklediği Mongo biçimine çevirir (ör. benzersizlik ihlali = 11000).
const mapPgError = (e) => {
    if (e?.code === '23505') {
        const err = new Error(`E11000 duplicate key error collection: ${e.table || ''} index: ${e.constraint || ''} ${e.detail || ''}`.trim());
        err.code = 11000;
        err.cause = e;
        return err;
    }
    return e;
};

// ---------------------------------------------------------------- Şema

const MIXED = 'Mixed';
const SCALAR_KINDS = new Set(['String', 'Number', 'Boolean', 'Date', 'Buffer']);

const kindOfCtor = (t) => {
    if (t === String || t === 'String') return 'String';
    if (t === Number || t === 'Number') return 'Number';
    if (t === Boolean || t === 'Boolean') return 'Boolean';
    if (t === Date || t === 'Date') return 'Date';
    if (t === Buffer || t === 'Buffer') return 'Buffer';
    if (t === Object || t === MIXED || t === 'ObjectId') return t === 'ObjectId' ? 'String' : 'Mixed';
    return null;
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
    !(v instanceof Date) && !(v instanceof RegExp) && !Buffer.isBuffer(v);

// Mongoose tanımını { kind, of?, paths?, default?, required?, enum?, min?, max?, unique? } biçimine çevirir.
const compileSpec = (def, inArray = false) => {
    if (Array.isArray(def)) {
        return { kind: 'Array', of: def.length ? compileSpec(def[0], true) : { kind: 'Mixed' } };
    }
    if (def instanceof Schema) {
        return { kind: 'Nested', paths: def.paths, subdoc: inArray };
    }
    const ctorKind = kindOfCtor(def);
    if (ctorKind) return { kind: ctorKind };
    if (isPlainObject(def)) {
        if (def.type !== undefined && (kindOfCtor(def.type) || Array.isArray(def.type) || def.type instanceof Schema)) {
            const base = compileSpec(def.type, inArray);
            const spec = { ...base };
            for (const k of ['default', 'required', 'enum', 'min', 'max', 'unique']) {
                if (def[k] !== undefined) spec[k] = def[k];
            }
            return spec;
        }
        const paths = {};
        for (const [k, v] of Object.entries(def)) paths[k] = compileSpec(v);
        return { kind: 'Nested', paths, subdoc: inArray };
    }
    return { kind: 'Mixed' };
};

export class Schema {
    constructor(definition = {}, options = {}) {
        this.options = { strict: true, timestamps: false, ...options };
        this.paths = {};
        for (const [k, v] of Object.entries(definition)) this.paths[k] = compileSpec(v);
        if (this.options.timestamps) {
            this.paths.createdAt = this.paths.createdAt || { kind: 'Date' };
            this.paths.updatedAt = this.paths.updatedAt || { kind: 'Date' };
        }
        this.indexes = [];
        for (const [k, s] of Object.entries(this.paths)) {
            if (s.unique) this.indexes.push({ fields: { [k]: 1 }, unique: true });
        }
    }

    index(fields, opts = {}) {
        this.indexes.push({ fields, unique: !!opts.unique });
        return this;
    }
}

Schema.Types = { Mixed: MIXED, ObjectId: 'ObjectId', String, Number, Boolean, Date, Buffer };

// 'a.b.c' yolunun şemadaki tanımı (dizilerin içine de iner).
const specAt = (schema, path) => {
    let paths = schema.paths;
    let spec = null;
    for (const seg of path.split('.')) {
        if (!paths) return null;
        spec = paths[seg];
        if (!spec) return null;
        while (spec.kind === 'Array' && spec.of) spec = spec.of;
        paths = spec.kind === 'Nested' ? spec.paths : null;
    }
    return spec;
};

// ---------------------------------------------------------------- Tür dönüşümü

// Değeri şema türüne çevirir; JS karşılığını döndürür (Date nesnesi, Buffer...).
const castScalar = (kind, v, path, modelName) => {
    if (v === null || v === undefined) return v;
    switch (kind) {
        case 'String':
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
            if (v instanceof Date) return v.toString();
            throw new CastError('string', v, path, modelName);
        case 'Number': {
            if (typeof v === 'number') {
                if (Number.isNaN(v)) throw new CastError('Number', v, path, modelName);
                return v;
            }
            if (typeof v === 'string') {
                if (v.trim() === '') return null;
                const n = Number(v);
                if (Number.isNaN(n)) throw new CastError('Number', v, path, modelName);
                return n;
            }
            if (typeof v === 'boolean') return v ? 1 : 0;
            throw new CastError('Number', v, path, modelName);
        }
        case 'Boolean':
            if (typeof v === 'boolean') return v;
            if (v === 1 || v === '1' || v === 'true' || v === 'yes') return true;
            if (v === 0 || v === '0' || v === 'false' || v === 'no') return false;
            throw new CastError('Boolean', v, path, modelName);
        case 'Date': {
            if (v === '') return null;
            const d = v instanceof Date ? v : new Date(v);
            if (Number.isNaN(d.getTime())) throw new CastError('date', v, path, modelName);
            return d;
        }
        case 'Buffer':
            if (Buffer.isBuffer(v)) return v;
            if (v instanceof Uint8Array) return Buffer.from(v);
            if (v?.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data);
            if (typeof v === 'string') return Buffer.from(v, 'base64');
            throw new CastError('Buffer', v, path, modelName);
        default:
            return v;
    }
};

// Şemaya bağlı olmayan değerleri JSON'a uygun düz yapıya çevirir.
const toPlain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// Bellek değeri -> saklama değeri (JSON).
const castStore = (spec, v, path, ctx) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    switch (spec.kind) {
        case 'Date': {
            const d = castScalar('Date', v, path, ctx.modelName);
            return d === null ? null : d.toISOString();
        }
        case 'Buffer':
            return castScalar('Buffer', v, path, ctx.modelName).toString('base64');
        case 'String':
        case 'Number':
        case 'Boolean':
            return castScalar(spec.kind, v, path, ctx.modelName);
        case 'Array': {
            const arr = Array.isArray(v) ? v : [v];
            return arr.map((el, i) => {
                const out = castStore(spec.of, el, `${path}.${i}`, ctx);
                if (spec.of.kind === 'Nested' && spec.of.subdoc && isPlainObject(out) && out._id === undefined) {
                    out._id = newObjectId();
                }
                return out;
            });
        }
        case 'Nested': {
            if (!isPlainObject(v)) throw new CastError('Embedded', v, path, ctx.modelName);
            // Alt belgelerde (dizi elemanı) varsayılanlar her zaman uygulanır, Mongoose'taki gibi.
            return castPaths(spec.paths, v, { ...ctx, isNew: ctx.isNew || spec.subdoc, prefix: `${path}.` });
        }
        default:
            return toPlain(v);
    }
};

const defaultOf = (spec) => {
    if (spec.default !== undefined) return typeof spec.default === 'function' ? spec.default() : spec.default;
    if (spec.kind === 'Array') return [];
    return undefined;
};

// Bir nesnenin alanlarını şemaya göre saklama biçimine çevirir.
// strict şemada bilinmeyen alanlar atılır (keepUnknown: mevcut belgeyi kaydederken korunur).
const castPaths = (paths, input, ctx) => {
    const { strict = true, keepUnknown = false, isNew = false, prefix = '' } = ctx;
    const out = {};
    for (const [k, v] of Object.entries(input || {})) {
        if (v === undefined) continue;
        const spec = paths[k];
        if (spec) {
            out[k] = castStore(spec, v, prefix + k, ctx);
        } else if (k === '_id') {
            out._id = String(v);
        } else if (k === '__v' || !strict || keepUnknown) {
            out[k] = toPlain(v);
        }
    }
    if (isNew) {
        for (const [k, spec] of Object.entries(paths)) {
            if (out[k] !== undefined) continue;
            const d = defaultOf(spec);
            if (d !== undefined) {
                out[k] = castStore(spec, d, prefix + k, ctx);
            } else if (spec.kind === 'Nested' && !spec.subdoc) {
                const nested = castPaths(spec.paths, {}, { ...ctx, prefix: `${prefix}${k}.` });
                if (Object.keys(nested).length) out[k] = nested;
            }
        }
    }
    return out;
};

// Saklama değeri -> bellek değeri (Date, Buffer).
const hydrateValue = (spec, v) => {
    if (v === null || v === undefined) return v;
    switch (spec.kind) {
        case 'Date': {
            if (v instanceof Date) return v;
            const d = new Date(v);
            return Number.isNaN(d.getTime()) ? v : d;
        }
        case 'Buffer':
            try { return castScalar('Buffer', v); } catch { return v; }
        case 'Array':
            return Array.isArray(v) ? v.map(el => hydrateValue(spec.of, el)) : v;
        case 'Nested':
            return hydratePaths(spec.paths, v);
        default:
            return v;
    }
};

const hydratePaths = (paths, obj) => {
    if (!isPlainObject(obj)) return obj;
    const out = { ...obj };
    for (const [k, spec] of Object.entries(paths)) {
        if (out[k] !== undefined) out[k] = hydrateValue(spec, out[k]);
    }
    return out;
};

// ---------------------------------------------------------------- Doğrulama

const validatePaths = (paths, obj, errors, prefix = '', onlyKeys = null) => {
    for (const [k, spec] of Object.entries(paths)) {
        if (onlyKeys && !onlyKeys.has(k)) continue;
        const v = obj?.[k];
        const p = prefix + k;
        const required = typeof spec.required === 'function' ? false : Array.isArray(spec.required) ? spec.required[0] : spec.required;
        if (required && (v === undefined || v === null || (spec.kind === 'String' && v === ''))) {
            errors.push({ path: p, kind: 'required', message: `Path \`${p}\` is required.` });
            continue;
        }
        if (v === undefined || v === null) continue;
        const values = Array.isArray(spec.enum) ? spec.enum : spec.enum?.values;
        if (values && !values.includes(v)) {
            errors.push({ path: p, kind: 'enum', message: `\`${v}\` is not a valid enum value for path \`${p}\`.` });
        }
        if (spec.kind === 'Number') {
            if (spec.min !== undefined && v < spec.min) errors.push({ path: p, kind: 'min', message: `Path \`${p}\` (${v}) is less than minimum allowed value (${spec.min}).` });
            if (spec.max !== undefined && v > spec.max) errors.push({ path: p, kind: 'max', message: `Path \`${p}\` (${v}) is more than maximum allowed value (${spec.max}).` });
        }
        if (spec.kind === 'Nested') validatePaths(spec.paths, v, errors, `${p}.`);
        if (spec.kind === 'Array' && spec.of.kind === 'Nested' && Array.isArray(v)) {
            v.forEach((el, i) => validatePaths(spec.of.paths, el, errors, `${p}.${i}.`));
        }
    }
};

const validateDoc = (Model, stored, onlyKeys = null) => {
    const errors = [];
    validatePaths(Model.schema.paths, stored, errors, '', onlyKeys);
    if (errors.length) throw new ValidationError(Model.modelName, errors);
};

// ---------------------------------------------------------------- Sorgu -> SQL

const SQL_OPS = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' };

// JSONB değeri metin tarih ise timestamptz'e çevirir; değilse NULL.
const tsExpr = (x) => `(CASE WHEN jsonb_typeof(${x}) = 'string' AND (${x} #>> '{}') ~ '^\\d{4}-\\d{2}-\\d{2}' THEN (${x} #>> '{}')::timestamptz END)`;

// Mongo'daki gibi: alan dizi ise elemanlarından biri koşulu sağlıyorsa da eşleşir.
const elementwise = (J, cond) =>
    `(${cond(J)} OR EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(${J}) = 'array' THEN ${J} ELSE '[]'::jsonb END) AS e(x) WHERE ${cond('e.x')}))`;

const toRegExp = (pattern, options = '') => (pattern instanceof RegExp ? pattern : new RegExp(pattern, options));

const isOperatorObject = (v) => isPlainObject(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k.startsWith('$'));

class SqlBuilder {
    constructor() { this.params = []; }
    p(v) { this.params.push(v); return `$${this.params.length}`; }
}

const castQueryValue = (spec, v, path, modelName) => {
    if (v === null || v === undefined || v instanceof RegExp) return v ?? null;
    const target = spec?.kind === 'Array' ? spec.of : spec;
    if (target && SCALAR_KINDS.has(target.kind) && !Array.isArray(v) && !isPlainObject(v)) {
        return castScalar(target.kind, v, path, modelName);
    }
    return v;
};

const eqClause = (b, J, v) => {
    if (v === null || v === undefined) return `(${J} IS NULL OR ${J} = 'null'::jsonb)`;
    if (v instanceof RegExp) {
        const ph = b.p(v.source);
        const op = v.flags.includes('i') ? '~*' : '~';
        return elementwise(J, x => `(jsonb_typeof(${x}) = 'string' AND (${x} #>> '{}') ${op} ${ph})`);
    }
    if (v instanceof Date) {
        const ph = b.p(v.toISOString());
        return elementwise(J, x => `${tsExpr(x)} = ${ph}::timestamptz`);
    }
    if (Array.isArray(v) || isPlainObject(v)) return `(${J} = ${b.p(JSON.stringify(v))}::jsonb)`;
    const ph = b.p(JSON.stringify(v));
    return elementwise(J, x => `${x} = ${ph}::jsonb`);
};

const cmpClause = (b, J, op, v) => {
    if (v instanceof Date) {
        const ph = b.p(v.toISOString());
        return elementwise(J, x => `${tsExpr(x)} ${op} ${ph}::timestamptz`);
    }
    if (typeof v === 'number') {
        const ph = b.p(JSON.stringify(v));
        return elementwise(J, x => `(jsonb_typeof(${x}) = 'number' AND ${x} ${op} ${ph}::jsonb)`);
    }
    if (typeof v === 'string') {
        const ph = b.p(v);
        return elementwise(J, x => `(jsonb_typeof(${x}) = 'string' AND (${x} #>> '{}') COLLATE "C" ${op} ${ph})`);
    }
    throw new Error(`Desteklenmeyen karşılaştırma değeri: ${JSON.stringify(v)}`);
};

const compileField = (Model, b, path, cond) => {
    const spec = path === '_id' ? { kind: 'String' } : specAt(Model.schema, path);
    const cast = (v) => castQueryValue(spec, v, path, Model.modelName);

    if (path === '_id') {
        // Birincil anahtar dizini kullanılsın diye basit eşitlik doğrudan sütuna gider.
        if (cond !== null && cond !== undefined && !isPlainObject(cond) && !(cond instanceof RegExp) && !Array.isArray(cond)) {
            return `t._id = ${b.p(String(cond))}`;
        }
        if (isOperatorObject(cond) && Object.keys(cond).length === 1 && Array.isArray(cond.$in)) {
            return `t._id = ANY(${b.p(cond.$in.filter(v => v != null).map(String))}::text[])`;
        }
    }

    const J = path === '_id' ? 'to_jsonb(t._id)' : `(t.belge #> ${b.p(path.split('.'))}::text[])`;

    if (!isOperatorObject(cond)) return eqClause(b, J, cast(cond));

    const clauses = [];
    for (const [op, raw] of Object.entries(cond)) {
        switch (op) {
            case '$eq':
                clauses.push(eqClause(b, J, cast(raw)));
                break;
            case '$ne':
                clauses.push(`NOT COALESCE(${eqClause(b, J, cast(raw))}, FALSE)`);
                break;
            case '$in':
            case '$nin': {
                const list = (Array.isArray(raw) ? raw : [raw]).map(cast);
                const any = list.length ? `(${list.map(v => eqClause(b, J, v)).join(' OR ')})` : 'FALSE';
                clauses.push(op === '$in' ? any : `NOT COALESCE(${any}, FALSE)`);
                break;
            }
            case '$gt':
            case '$gte':
            case '$lt':
            case '$lte':
                clauses.push(cmpClause(b, J, SQL_OPS[op], cast(raw)));
                break;
            case '$exists':
                clauses.push(raw ? `${J} IS NOT NULL` : `${J} IS NULL`);
                break;
            case '$regex':
                clauses.push(eqClause(b, J, toRegExp(raw, cond.$options)));
                break;
            case '$options':
                break;
            default:
                throw new Error(`Desteklenmeyen sorgu operatörü: ${op}`);
        }
    }
    return `(${clauses.join(' AND ')})`;
};

const compileFilter = (Model, b, filter) => {
    if (!filter || typeof filter !== 'object') return 'TRUE';
    const parts = [];
    for (const [key, cond] of Object.entries(filter)) {
        if (key === '$or' || key === '$and' || key === '$nor') {
            if (!Array.isArray(cond) || cond.length === 0) throw new Error(`${key} boş olmayan bir dizi olmalı`);
            const subs = cond.map(f => `(${compileFilter(Model, b, f)})`);
            if (key === '$and') parts.push(`(${subs.join(' AND ')})`);
            else if (key === '$or') parts.push(`(${subs.join(' OR ')})`);
            else parts.push(`NOT (${subs.join(' OR ')})`);
            continue;
        }
        if (key.startsWith('$')) throw new Error(`Desteklenmeyen sorgu operatörü: ${key}`);
        parts.push(compileField(Model, b, key, cond));
    }
    return parts.length ? parts.join(' AND ') : 'TRUE';
};

const parseSort = (sort) => {
    if (!sort) return [];
    if (typeof sort === 'string') {
        return sort.split(/\s+/).filter(Boolean).map(s => (s.startsWith('-') ? [s.slice(1), -1] : [s, 1]));
    }
    return Object.entries(sort).map(([k, d]) => [k, (d === -1 || d === 'desc' || d === 'descending') ? -1 : 1]);
};

const compileOrder = (Model, b, sort) => {
    const terms = parseSort(sort).map(([path, dir]) => {
        let expr;
        if (path === '_id') expr = 't._id';
        else {
            const J = `(t.belge #> ${b.p(path.split('.'))}::text[])`;
            expr = specAt(Model.schema, path)?.kind === 'Date' ? tsExpr(J) : J;
        }
        return `${expr} ${dir === -1 ? 'DESC NULLS LAST' : 'ASC NULLS FIRST'}`;
    });
    // Sıralama belirtilmezse ya da eşitlikte ekleme sırası (ObjectId zamana göre artar).
    terms.push('t._id ASC');
    return terms.join(', ');
};

// ---------------------------------------------------------------- Yardımcılar

const getPool = () => {
    if (!pool) throw new Error('Veritabanı bağlantısı kurulmadı (DATABASE_URL).');
    return pool;
};

const run = async (sql, params, client) => {
    try {
        return await (client || getPool()).query(sql, params);
    } catch (e) {
        throw mapPgError(e);
    }
};

const tx = async (fn) => {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw mapPgError(e);
    } finally {
        client.release();
    }
};

const rowToStored = (row) => ({ ...row.belge, _id: row._id });

const parseProjection = (sel) => {
    if (!sel) return null;
    let entries;
    if (typeof sel === 'string') {
        entries = sel.split(/\s+/).filter(Boolean).map(s => (s.startsWith('-') ? [s.slice(1), 0] : [s.replace(/^\+/, ''), 1]));
    } else {
        entries = Object.entries(sel).map(([k, v]) => [k, v ? 1 : 0]);
    }
    if (!entries.length) return null;
    const include = entries.filter(([k, v]) => v === 1 && k !== '_id').map(([k]) => k);
    const exclude = entries.filter(([, v]) => v === 0).map(([k]) => k);
    return include.length
        ? { mode: 'include', keys: new Set(include), dropId: exclude.includes('_id') }
        : { mode: 'exclude', keys: new Set(exclude) };
};

const applyProjection = (obj, proj) => {
    if (!proj) return obj;
    if (proj.mode === 'include') {
        const out = {};
        if (!proj.dropId && obj._id !== undefined) out._id = obj._id;
        for (const k of proj.keys) if (obj[k] !== undefined) out[k] = obj[k];
        return out;
    }
    const out = { ...obj };
    for (const k of proj.keys) delete out[k];
    return out;
};

const deepClone = (v) => {
    if (v instanceof Date) return new Date(v.getTime());
    if (Buffer.isBuffer(v)) return Buffer.from(v);
    if (Array.isArray(v)) return v.map(deepClone);
    if (isPlainObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClone(x)]));
    return v;
};

const setPath = (obj, segs, value) => {
    let cur = obj;
    for (let i = 0; i < segs.length - 1; i++) {
        if (!isPlainObject(cur[segs[i]]) && !Array.isArray(cur[segs[i]])) cur[segs[i]] = {};
        cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = value;
};

const getPath = (obj, segs) => segs.reduce((cur, s) => (cur == null ? undefined : cur[s]), obj);

const unsetPath = (obj, segs) => {
    const parent = getPath(obj, segs.slice(0, -1));
    if (parent && typeof parent === 'object') delete parent[segs[segs.length - 1]];
};

// Güncelleme nesnesini { $set, $unset, ... } biçimine getirir (düz alanlar $set'e gider).
const normalizeUpdate = (update) => {
    const ops = {};
    for (const [k, v] of Object.entries(update || {})) {
        if (k.startsWith('$')) ops[k] = { ...(ops[k] || {}), ...v };
        else ops.$set = { ...(ops.$set || {}), [k]: v };
    }
    return ops;
};

// Filtredeki düz eşitlikleri upsert ile oluşacak belgeye taşır.
const equalityFields = (filter) => {
    const out = {};
    for (const [k, v] of Object.entries(filter || {})) {
        if (k.startsWith('$') || v instanceof RegExp || isOperatorObject(v)) continue;
        setPath(out, k.split('.'), v);
    }
    return out;
};

// ---------------------------------------------------------------- Belge

const DOC_META = Symbol('meta');

class Document {
    get _doc() { return this.toObject(); }

    get isNew() { return this[DOC_META].isNew; }

    // Şemada `id` alanı yoksa Mongoose'taki gibi _id'nin metin hâli.
    get id() { return this.constructor.schema.paths.id ? undefined : this._id; }

    set id(v) { Object.defineProperty(this, 'id', { value: v, writable: true, enumerable: true, configurable: true }); }

    toObject() {
        const out = {};
        for (const [k, v] of Object.entries(this)) if (v !== undefined) out[k] = deepClone(v);
        return out;
    }

    toJSON() { return this.toObject(); }

    async save() {
        const Model = this.constructor;
        const meta = this[DOC_META];
        const ctx = Model.$ctx;
        const now = new Date().toISOString();

        if (meta.isNew) {
            const stored = castPaths(Model.schema.paths, this.toObject(), { ...ctx, isNew: true });
            const saved = await Model.$insert([stored]);
            initDoc(this, saved[0], false);
            return this;
        }

        const stored = castPaths(Model.schema.paths, this.toObject(), { ...ctx, keepUnknown: true });
        stored._id = this._id;
        const changed = new Set(Object.keys(stored).filter(k => JSON.stringify(stored[k]) !== JSON.stringify(meta.orig[k])));
        validateDoc(Model, stored, changed);
        if (Model.schema.options.timestamps) stored.updatedAt = now;
        const removed = Object.keys(meta.orig).filter(k => !(k in stored));
        const res = await run(
            `UPDATE ${Model.$table} SET belge = (belge - $2::text[]) || $3::jsonb, aktarildi = now() WHERE _id = $1 RETURNING _id, belge`,
            [this._id, removed, JSON.stringify(stored)]
        );
        if (!res.rowCount) {
            const err = new Error(`No document found for query "{ _id: '${this._id}' }" on model "${Model.modelName}"`);
            err.name = 'DocumentNotFoundError';
            throw err;
        }
        initDoc(this, rowToStored(res.rows[0]), false);
        return this;
    }

    async deleteOne() {
        const Model = this.constructor;
        const res = await run(`DELETE FROM ${Model.$table} WHERE _id = $1`, [this._id]);
        return { acknowledged: true, deletedCount: res.rowCount };
    }
}

// Belgenin alanlarını (saklama biçiminden) nesneye yükler.
const initDoc = (doc, stored, isNew) => {
    const Model = doc.constructor;
    for (const k of Object.keys(doc)) delete doc[k];
    const mem = hydratePaths(Model.schema.paths, stored);
    for (const [k, v] of Object.entries(mem)) {
        Object.defineProperty(doc, k, { value: v, writable: true, enumerable: true, configurable: true });
    }
    Object.defineProperty(doc, DOC_META, {
        value: { isNew, orig: isNew ? {} : deepClone(stored) },
        writable: true, enumerable: false, configurable: true,
    });
    return doc;
};

const makeDoc = (Model, stored) => initDoc(Object.create(Model.prototype), stored, false);

// ---------------------------------------------------------------- Sorgu nesnesi

class Query {
    constructor(Model, filter, projection, single) {
        this.Model = Model;
        this.filter = filter || {};
        this.projection = projection;
        this.single = single;
        this._sort = null;
        this._limit = null;
        this._skip = null;
        this._lean = false;
    }

    sort(s) { this._sort = s; return this; }
    limit(n) { this._limit = n; return this; }
    skip(n) { this._skip = n; return this; }
    select(p) { this.projection = p; return this; }
    lean(v = true) { this._lean = v; return this; }

    async exec() {
        const { Model } = this;
        const b = new SqlBuilder();
        const where = compileFilter(Model, b, this.filter);
        const order = compileOrder(Model, b, this._sort);
        let sql = `SELECT t._id, t.belge FROM ${Model.$table} t WHERE ${where} ORDER BY ${order}`;
        const limit = this.single ? 1 : Number(this._limit);
        if (Number.isInteger(limit) && limit > 0) sql += ` LIMIT ${limit}`;
        const skip = Number(this._skip);
        if (Number.isInteger(skip) && skip > 0) sql += ` OFFSET ${skip}`;

        const res = await run(sql, b.params);
        const proj = parseProjection(this.projection);
        const docs = res.rows.map((row) => {
            const stored = applyProjection(rowToStored(row), proj);
            return this._lean ? hydratePaths(Model.schema.paths, stored) : makeDoc(Model, stored);
        });
        return this.single ? (docs[0] || null) : docs;
    }

    then(resolve, reject) { return this.exec().then(resolve, reject); }
    catch(reject) { return this.exec().catch(reject); }
    finally(fn) { return this.exec().finally(fn); }
}

// ---------------------------------------------------------------- Model

const collectionName = (modelName) => {
    const lower = modelName.toLowerCase();
    if (['media', 'data', 'information', 'news'].includes(lower)) return lower;
    if (/[^aeiou]y$/.test(lower)) return `${lower.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/.test(lower)) return `${lower}es`;
    return `${lower}s`;
};

const finalize = (Model, stored, opts = {}) => {
    if (!stored) return null;
    const proj = parseProjection(opts.projection || opts.select || opts.fields);
    const s = applyProjection(stored, proj);
    return opts.lean ? hydratePaths(Model.schema.paths, s) : makeDoc(Model, s);
};

export const model = (name, schema, collection) => {
    if (registry.has(name)) return registry.get(name);
    const table = schema.options.collection || collection || collectionName(name);

    class Model extends Document {
        constructor(data = {}) {
            super();
            const stored = castPaths(schema.paths, data, { ...Model.$ctx, isNew: true });
            stored._id = stored._id || newObjectId();
            initDoc(this, stored, true);
        }

        static get $table() { return `"${SCHEMA}"."${table}"`; }

        static async $insert(storedDocs, client) {
            const now = new Date().toISOString();
            const prepared = storedDocs.map((d) => {
                const doc = { ...d, _id: d._id || newObjectId() };
                if (doc.__v === undefined) doc.__v = 0;
                if (schema.options.timestamps) {
                    doc.createdAt = doc.createdAt || now;
                    doc.updatedAt = now;
                }
                validateDoc(Model, doc);
                return doc;
            });
            const insertAll = async (c) => {
                const out = [];
                for (const doc of prepared) {
                    const res = await c.query(
                        `INSERT INTO ${Model.$table} (_id, belge, aktarildi) VALUES ($1, $2::jsonb, now()) RETURNING _id, belge`,
                        [doc._id, JSON.stringify(doc)]
                    );
                    out.push(rowToStored(res.rows[0]));
                }
                return out;
            };
            if (client) return insertAll(client);
            return prepared.length === 1
                ? run(`INSERT INTO ${Model.$table} (_id, belge, aktarildi) VALUES ($1, $2::jsonb, now()) RETURNING _id, belge`,
                    [prepared[0]._id, JSON.stringify(prepared[0])]).then(r => [rowToStored(r.rows[0])])
                : tx(insertAll);
        }

        // Saklama biçimindeki belgeye güncelleme operatörlerini uygular.
        static $applyUpdate(current, update, isInsert) {
            const ctx = Model.$ctx;
            const doc = deepClone(current);
            const ops = normalizeUpdate(update);
            // strict şemada bilinmeyen alanlar güncellemeden atılır (Mongoose davranışı).
            const castFor = (path, value) => {
                const spec = path.includes('.') ? specAt(schema, path) : schema.paths[path];
                if (!spec) return schema.options.strict === false ? toPlain(value) : undefined;
                return castStore(spec, value, path, ctx);
            };
            const skip = (path) => path === '_id' || path === '__v' || (!isInsert && path === 'createdAt' && schema.options.timestamps);
            const sets = { ...(ops.$set || {}), ...(isInsert ? ops.$setOnInsert || {} : {}) };

            for (const [path, value] of Object.entries(sets)) {
                if (skip(path) || value === undefined) continue;
                const casted = castFor(path, value);
                if (casted !== undefined) setPath(doc, path.split('.'), casted);
            }
            for (const path of Object.keys(ops.$unset || {})) {
                if (!skip(path)) unsetPath(doc, path.split('.'));
            }
            for (const [path, n] of Object.entries(ops.$inc || {})) {
                const segs = path.split('.');
                setPath(doc, segs, (Number(getPath(doc, segs)) || 0) + Number(n));
            }
            for (const op of ['$push', '$addToSet']) {
                for (const [path, raw] of Object.entries(ops[op] || {})) {
                    const segs = path.split('.');
                    const items = isPlainObject(raw) && Array.isArray(raw.$each) ? raw.$each : [raw];
                    const arr = Array.isArray(getPath(doc, segs)) ? getPath(doc, segs) : [];
                    const spec = specAt(schema, path);
                    for (const item of items) {
                        let casted = spec ? castStore(spec, item, path, ctx) : toPlain(item);
                        if (spec?.kind === 'Nested' && spec.subdoc && isPlainObject(casted) && !casted._id) casted = { ...casted, _id: newObjectId() };
                        if (op === '$addToSet' && arr.some(x => JSON.stringify(x) === JSON.stringify(casted))) continue;
                        arr.push(casted);
                    }
                    setPath(doc, segs, arr);
                }
            }
            for (const [path, cond] of Object.entries(ops.$pull || {})) {
                const segs = path.split('.');
                const arr = getPath(doc, segs);
                if (Array.isArray(arr)) setPath(doc, segs, arr.filter(x => JSON.stringify(x) !== JSON.stringify(toPlain(cond))));
            }

            const result = isInsert ? castPaths(schema.paths, doc, { ...ctx, isNew: true, keepUnknown: true }) : doc;
            if (schema.options.timestamps) result.updatedAt = new Date().toISOString();
            return result;
        }

        static find(filter, projection) { return new Query(Model, filter, projection, false); }

        static findOne(filter, projection) { return new Query(Model, filter, projection, true); }

        static findById(id, projection) {
            return new Query(Model, id === undefined || id === null ? { _id: { $in: [] } } : { _id: String(id) }, projection, true);
        }

        static async exists(filter) {
            const doc = await Model.findOne(filter).select('_id').lean();
            return doc ? { _id: doc._id } : null;
        }

        static async countDocuments(filter = {}) {
            const b = new SqlBuilder();
            const res = await run(`SELECT count(*)::int AS n FROM ${Model.$table} t WHERE ${compileFilter(Model, b, filter)}`, b.params);
            return res.rows[0].n;
        }

        static estimatedDocumentCount() { return Model.countDocuments({}); }

        static async create(input) {
            if (Array.isArray(input)) return Promise.all(input.map(d => new Model(d).save()));
            return new Model(input).save();
        }

        static async insertMany(docs, opts = {}) {
            const list = (Array.isArray(docs) ? docs : [docs]).map(d => castPaths(schema.paths, d, { ...Model.$ctx, isNew: true }));
            const saved = await tx(c => Model.$insert(list, c));
            return opts.lean ? saved.map(s => hydratePaths(schema.paths, s)) : saved.map(s => makeDoc(Model, s));
        }

        static async findOneAndUpdate(filter, update, opts = {}) {
            const returnNew = opts.new === true || opts.returnDocument === 'after';
            const result = await tx(async (c) => {
                const b = new SqlBuilder();
                const res = await c.query(
                    `SELECT t._id, t.belge FROM ${Model.$table} t WHERE ${compileFilter(Model, b, filter)} ORDER BY ${compileOrder(Model, b, opts.sort)} LIMIT 1 FOR UPDATE`,
                    b.params
                );
                if (res.rowCount) {
                    const before = rowToStored(res.rows[0]);
                    const after = Model.$applyUpdate(before, update, false);
                    after._id = before._id;
                    await c.query(`UPDATE ${Model.$table} SET belge = $2::jsonb, aktarildi = now() WHERE _id = $1`, [before._id, JSON.stringify(after)]);
                    return returnNew ? after : before;
                }
                if (!opts.upsert) return null;
                const base = castPaths(schema.paths, equalityFields(filter), { ...Model.$ctx, keepUnknown: true });
                const doc = Model.$applyUpdate(base, update, true);
                const [inserted] = await Model.$insert([doc], c);
                return returnNew ? inserted : null;
            });
            return finalize(Model, result, opts);
        }

        static findByIdAndUpdate(id, update, opts) { return Model.findOneAndUpdate({ _id: String(id) }, update, opts); }

        static async findOneAndDelete(filter, opts = {}) {
            const b = new SqlBuilder();
            const where = compileFilter(Model, b, filter);
            const order = compileOrder(Model, b, opts.sort);
            const res = await run(
                `DELETE FROM ${Model.$table} WHERE _id = (SELECT t._id FROM ${Model.$table} t WHERE ${where} ORDER BY ${order} LIMIT 1) RETURNING _id, belge`,
                b.params
            );
            return finalize(Model, res.rows[0] ? rowToStored(res.rows[0]) : null, opts);
        }

        static findByIdAndDelete(id, opts) { return Model.findOneAndDelete({ _id: String(id) }, opts); }

        static async $updateWhere(filter, update, opts, single) {
            return tx(async (c) => {
                const b = new SqlBuilder();
                const res = await c.query(
                    `SELECT t._id, t.belge FROM ${Model.$table} t WHERE ${compileFilter(Model, b, filter)} ORDER BY t._id${single ? ' LIMIT 1' : ''} FOR UPDATE`,
                    b.params
                );
                let modified = 0;
                for (const row of res.rows) {
                    const before = rowToStored(row);
                    const after = Model.$applyUpdate(before, update, false);
                    after._id = before._id;
                    const { updatedAt: _a, ...beforeRest } = before;
                    const { updatedAt: _b, ...afterRest } = after;
                    if (JSON.stringify(beforeRest) === JSON.stringify(afterRest)) continue;
                    await c.query(`UPDATE ${Model.$table} SET belge = $2::jsonb, aktarildi = now() WHERE _id = $1`, [before._id, JSON.stringify(after)]);
                    modified++;
                }
                let upsertedId = null;
                if (!res.rowCount && opts?.upsert) {
                    const base = castPaths(schema.paths, equalityFields(filter), { ...Model.$ctx, keepUnknown: true });
                    const [inserted] = await Model.$insert([Model.$applyUpdate(base, update, true)], c);
                    upsertedId = inserted._id;
                }
                return { acknowledged: true, matchedCount: res.rowCount, modifiedCount: modified, upsertedCount: upsertedId ? 1 : 0, upsertedId };
            });
        }

        static updateOne(filter, update, opts) { return Model.$updateWhere(filter, update, opts, true); }

        static updateMany(filter, update, opts) { return Model.$updateWhere(filter, update, opts, false); }

        static async deleteOne(filter = {}) {
            const b = new SqlBuilder();
            const where = compileFilter(Model, b, filter);
            const res = await run(
                `DELETE FROM ${Model.$table} WHERE _id = (SELECT t._id FROM ${Model.$table} t WHERE ${where} ORDER BY t._id LIMIT 1)`,
                b.params
            );
            return { acknowledged: true, deletedCount: res.rowCount };
        }

        static async deleteMany(filter = {}) {
            const b = new SqlBuilder();
            const res = await run(`DELETE FROM ${Model.$table} t WHERE ${compileFilter(Model, b, filter)}`, b.params);
            return { acknowledged: true, deletedCount: res.rowCount };
        }
    }

    Object.defineProperty(Model, 'name', { value: name });
    Model.modelName = name;
    Model.schema = schema;
    Model.collectionName = table;
    Model.$ctx = { strict: schema.options.strict !== false, modelName: name };
    registry.set(name, Model);
    return Model;
};

export const models = new Proxy({}, { get: (_, name) => registry.get(name) });

// ---------------------------------------------------------------- Bağlantı

// Tablo ve benzersiz dizinler yoksa oluşturulur; dizin mevcut veriyle çakışırsa yalnızca uyarılır.
const ensureCollection = async (Model) => {
    const table = Model.collectionName;
    await run(`CREATE TABLE IF NOT EXISTS ${Model.$table} (
        _id TEXT PRIMARY KEY, belge JSONB NOT NULL, aktarildi TIMESTAMPTZ NOT NULL DEFAULT now())`);
    for (const idx of Model.schema.indexes.filter(i => i.unique)) {
        const fields = Object.keys(idx.fields);
        const name = `${table}_${fields.join('_').toLowerCase()}_uniq`.replace(/[^a-z0-9_]/g, '_');
        const exprs = fields.map(f => `(belge #>> '{${f.split('.').join(',')}}')`).join(', ');
        try {
            await run(`CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON ${Model.$table} (${exprs})`);
        } catch (e) {
            console.warn(`[DB] ${table} için benzersiz dizin (${fields.join(', ')}) oluşturulamadı: ${e.message}`);
        }
    }
};

// Merkez sunucusunun kendi sertifika otoritesi (gizli değil); sunucu sertifikası bununla doğrulanır.
const BUNDLED_CA = new URL('./merkez-pg-ca.crt', import.meta.url);

// DATABASE_URL içindeki sslmode/ssl parametreleri pg'de `ssl` ayarını ezdiği için ayıklanır;
// TLS ayarı burada açıkça kurulur. Uzak sunucuda sertifika DATABASE_CA (PEM) ya da yanımızdaki
// merkez-pg-ca.crt ile doğrulanır.
const buildPoolConfig = (url) => {
    const u = new URL(url);
    const sslmode = u.searchParams.get('sslmode');
    for (const k of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey']) u.searchParams.delete(k);
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
    let ca = process.env.DATABASE_CA ? process.env.DATABASE_CA.replace(/\\n/g, '\n') : null;
    if (!ca && !local && fs.existsSync(BUNDLED_CA)) ca = fs.readFileSync(BUNDLED_CA, 'utf8');
    let ssl;
    if (sslmode === 'disable' || (local && !ca && !sslmode)) ssl = false;
    else ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
    return {
        connectionString: u.toString(),
        ssl,
        max: Number(process.env.DATABASE_POOL_MAX) || 10,
        // Saat dilimi verilmemiş tarih metinleri ('2026-10-31') UTC kabul edilsin
        options: '-c TimeZone=UTC',
    };
};

export const connect = async (url, { schema } = {}) => {
    if (!url) throw new Error('DATABASE_URL tanımlı değil.');
    const name = schema || process.env.DATABASE_SCHEMA || 'mobile_asp';
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Geçersiz şema adı: ${name}`);
    SCHEMA = name;
    if (pool) await pool.end().catch(() => {});
    pool = new Pool(buildPoolConfig(url));
    pool.on('error', (e) => console.error('[DB] Bağlantı havuzu hatası:', e.message));
    await run('SELECT 1');
    for (const Model of registry.values()) await ensureCollection(Model);
    return pool;
};

export const disconnect = async () => {
    if (pool) await pool.end();
    pool = null;
};

export const connection = {
    get readyState() { return pool ? 1 : 0; },
    get pool() { return pool; },
};

export const Types = {
    ObjectId: {
        isValid: (v) => isObjectIdString(typeof v === 'string' ? v : v?.toString?.()),
    },
};

export default { Schema, model, models, connect, disconnect, connection, Types, newObjectId };
