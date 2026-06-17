import { db } from './firebase.js';

export class FirestoreModel {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.collection = db.collection(collectionName);
    }

    _applyFilter(query, filter) {
        if (!filter) return query;
        let q = query;
        for (const [key, value] of Object.entries(filter)) {
            if (key === '$or' && Array.isArray(value)) {
                // Ignore complex here, handle in fallback
            } else if (key === '_id') {
                q = q.where('__name__', '==', String(value));
            } else if (typeof value === 'object' && value !== null) {
                if (value.$in) {
                     q = q.where(key, 'in', value.$in);
                }
            } else {
                q = q.where(key, '==', value);
            }
        }
        return q;
    }

    find(filter = {}) {
        return new FirestoreQuery(this.collection, filter);
    }

    async findOne(filter = {}) {
        return this._fallbackFindOne(filter);
    }

    async _fallbackFindOne(filter) {
        const snapshot = await this.collection.get();
        const allDocs = snapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
        return allDocs.find(doc => this._matchFilter(doc, filter)) || null;
    }

    _matchFilter(doc, filter) {
        if (typeof filter !== 'object' || filter === null) return true;
        for (const [key, value] of Object.entries(filter)) {
            if (key === '$or') {
                const matchOr = value.some(condition => this._matchFilter(doc, condition));
                if (!matchOr) return false;
            } else if (key === '_id') {
                if (String(doc._id) !== String(value)) return false;
            } else {
                if (doc[key] !== value) return false;
            }
        }
        return true;
    }

    async findById(id) {
        const docRef = this.collection.doc(String(id));
        const doc = await docRef.get();
        if (!doc.exists) return null;
        return { _id: doc.id, ...doc.data() };
    }

    async create(data) {
        const id = data._id ? String(data._id) : this.collection.doc().id;
        const docRef = this.collection.doc(id);
        const cleanData = JSON.parse(JSON.stringify({ ...data }));
        delete cleanData._id;
        await docRef.set(cleanData);
        
        // Mongoose simulates a save method on created instances
        const result = { _id: id, ...cleanData };
        result.save = async function() {
            const cleanUpdate = { ...this };
            delete cleanUpdate._id;
            delete cleanUpdate.save;
            delete cleanUpdate.deleteOne;
            await docRef.update(cleanUpdate);
            return this;
        };
        result.deleteOne = async function() {
            await docRef.delete();
            return this;
        };
        return result;
    }
    
    async insertMany(dataArray) {
        const batch = db.batch();
        const results = [];
        for(const data of dataArray) {
            const id = data._id ? String(data._id) : this.collection.doc().id;
            const docRef = this.collection.doc(id);
            const cleanData = JSON.parse(JSON.stringify({ ...data }));
            delete cleanData._id;
            batch.set(docRef, cleanData);
            results.push({ _id: id, ...cleanData });
        }
        await batch.commit();
        return results;
    }

    async findOneAndUpdate(filter, update, options = {}) {
        const doc = await this.findOne(filter);
        if (!doc) return null;
        const docRef = this.collection.doc(String(doc._id));
        
        let cleanUpdate = JSON.parse(JSON.stringify({ ...update }));
        if (cleanUpdate.$set) {
            cleanUpdate = cleanUpdate.$set;
        }
        delete cleanUpdate._id;

        await docRef.update(cleanUpdate);
        if (options.new) {
            return { ...doc, ...cleanUpdate };
        }
        return doc;
    }

    async findByIdAndUpdate(id, update, options = {}) {
        const docRef = this.collection.doc(String(id));
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) return null;
        
        let cleanUpdate = JSON.parse(JSON.stringify({ ...update }));
        if (cleanUpdate.$set) {
            cleanUpdate = cleanUpdate.$set;
        }
        delete cleanUpdate._id;

        await docRef.update(cleanUpdate);
        if (options.new) {
            return { _id: id, ...docSnapshot.data(), ...cleanUpdate };
        }
        return { _id: id, ...docSnapshot.data() };
    }

    async findOneAndDelete(filter) {
        const doc = await this.findOne(filter);
        if (!doc) return null;
        await this.collection.doc(String(doc._id)).delete();
        return doc;
    }

    async findByIdAndDelete(id) {
        const docRef = this.collection.doc(String(id));
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) return null;
        await docRef.delete();
        return { _id: id, ...docSnapshot.data() };
    }

    async updateMany(filter, update) {
        const docs = await this.find(filter).exec();
        const batch = db.batch();
        let cleanUpdate = JSON.parse(JSON.stringify({ ...update }));
        if (cleanUpdate.$set) cleanUpdate = cleanUpdate.$set;
        delete cleanUpdate._id;

        for (const doc of docs) {
            const docRef = this.collection.doc(String(doc._id));
            batch.update(docRef, cleanUpdate);
        }
        await batch.commit();
        return { modifiedCount: docs.length };
    }

    async deleteMany(filter) {
        const docs = await this.find(filter).exec();
        if (docs.length === 0) return { deletedCount: 0 };
        
        const batch = db.batch();
        for (const doc of docs) {
            const docRef = this.collection.doc(String(doc._id));
            batch.delete(docRef);
        }
        await batch.commit();
        return { deletedCount: docs.length };
    }

    async countDocuments(filter = {}) {
        const docs = await this.find(filter).exec();
        return docs.length;
    }
}

class FirestoreQuery {
    constructor(collection, filter) {
        this.collection = collection;
        this.filter = filter;
        this._sort = null;
    }

    sort(sortObj) {
        this._sort = sortObj;
        return this;
    }

    lean() {
        return this;
    }
    
    select(fields) {
        return this; 
    }

    async exec() {
        // Fallback to memory for complex filters
        const snapshot = await this.collection.get();
        let allDocs = snapshot.docs.map(d => {
            const docData = { _id: d.id, ...d.data() };
            // Simulate save and deleteOne
            docData.save = async function() {
                const cleanUpdate = { ...this };
                delete cleanUpdate._id;
                delete cleanUpdate.save;
                delete cleanUpdate.deleteOne;
                await d.ref.update(cleanUpdate);
                return this;
            };
            docData.deleteOne = async function() {
                await d.ref.delete();
                return this;
            };
            return docData;
        });

        const matchFilter = (doc, flt) => {
            if (typeof flt !== 'object' || flt === null) return true;
            for (const [key, value] of Object.entries(flt)) {
                if (key === '$or') {
                    const matchOr = value.some(condition => matchFilter(doc, condition));
                    if (!matchOr) return false;
                } else if (key === '_id') {
                    if (String(doc._id) !== String(value)) return false;
                } else if (value instanceof RegExp) {
                    if (!value.test(doc[key])) return false;
                } else if (typeof value === 'object' && value !== null && value.$regex) {
                    const regex = new RegExp(value.$regex, value.$options || '');
                    if (!regex.test(doc[key])) return false;
                } else {
                    if (doc[key] !== value) return false;
                }
            }
            return true;
        };

        let results = allDocs.filter(doc => matchFilter(doc, this.filter));

        if (this._sort) {
            for (const [key, direction] of Object.entries(this._sort)) {
                const dir = direction === -1 || direction === 'desc' ? -1 : 1;
                results.sort((a, b) => {
                    if (a[key] < b[key]) return -1 * dir;
                    if (a[key] > b[key]) return 1 * dir;
                    return 0;
                });
            }
        }
        return results;
    }

    then(resolve, reject) {
        return this.exec().then(resolve).catch(reject);
    }
}

export function createModel(collectionName) {
    const dbInstance = new FirestoreModel(collectionName);
    
    function Model(data = {}) {
        Object.assign(this, data);
        
        this.save = async function() {
            if (this._id) {
                const docRef = dbInstance.collection.doc(String(this._id));
                const cleanData = JSON.parse(JSON.stringify({ ...this }));
                delete cleanData._id;
                delete cleanData.save;
                delete cleanData.deleteOne;
                await docRef.set(cleanData, { merge: true });
                return this;
            } else {
                const res = await dbInstance.create(this);
                this._id = res._id;
                return this;
            }
        };
        
        this.deleteOne = async function() {
            if (this._id) {
                await dbInstance.collection.doc(String(this._id)).delete();
            }
            return this;
        };
    }
    
    // Copy all methods from dbInstance to Model as static methods
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(dbInstance))) {
        if (key !== 'constructor') {
            Model[key] = dbInstance[key].bind(dbInstance);
        }
    }
    // Also copy properties
    Model.collection = dbInstance.collection;
    Model.collectionName = dbInstance.collectionName;
    
    return Model;
}
