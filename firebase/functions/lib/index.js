"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchJobs = exports.setAdminRole = exports.onOfferAccepted = exports.onJobStatusChange = exports.onUserDeleted = exports.onUserCreated = void 0;
const admin = require("firebase-admin");
const identity_1 = require("firebase-functions/v2/identity");
const functionsV1 = require("firebase-functions/v1");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
// ─── Auth trigger: yeni kullanıcı kaydında Firestore profili oluştur ───
exports.onUserCreated = (0, identity_1.beforeUserCreated)(async (event) => {
    var _a, _b, _c, _d;
    const user = event.data;
    if (!user)
        return;
    await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: (_a = user.email) !== null && _a !== void 0 ? _a : null,
        displayName: (_b = user.displayName) !== null && _b !== void 0 ? _b : null,
        photoURL: (_c = user.photoURL) !== null && _c !== void 0 ? _c : null,
        phone: (_d = user.phoneNumber) !== null && _d !== void 0 ? _d : null,
        role: 'client',
        isVerified: false,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
});
// ─── Auth trigger: kullanıcı silinince Firestore kaydını temizle ───
exports.onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
    const batch = db.batch();
    batch.delete(db.collection('users').doc(user.uid));
    batch.delete(db.collection('providers').doc(user.uid));
    await batch.commit();
});
// ─── Firestore trigger: iş tamamlanınca bildirim gönder ───
exports.onJobStatusChange = (0, firestore_1.onDocumentUpdated)('jobs/{jobId}', async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before['status'] === after['status'])
        return;
    if (after['status'] === 'completed') {
        await db.collection('notifications').add({
            userId: after['userId'],
            type: 'job_completed',
            title: 'İş tamamlandı',
            body: `"${after['title']}" ilanınız tamamlandı.`,
            jobId: event.params.jobId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
// ─── Firestore trigger: teklif kabul edilince booking oluştur ───
exports.onOfferAccepted = (0, firestore_1.onDocumentUpdated)('offers/{offerId}', async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before['status'] !== 'pending' || after['status'] !== 'accepted')
        return;
    await db.collection('bookings').add({
        jobId: after['jobId'],
        offerId: event.params.offerId,
        clientId: after['clientId'],
        workerId: after['workerId'],
        price: after['price'],
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Diğer bekleyen teklifleri reddet
    const otherOffers = await db.collection('offers')
        .where('jobId', '==', after['jobId'])
        .where('status', '==', 'pending')
        .get();
    const batch = db.batch();
    otherOffers.docs
        .filter(doc => doc.id !== event.params.offerId)
        .forEach(doc => batch.update(doc.ref, { status: 'rejected' }));
    await batch.commit();
});
// ─── Callable: kullanıcıya admin rolü ver ───
exports.setAdminRole = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token['role'] !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin yetkisi gerekli.');
    }
    const { uid } = request.data;
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    await db.collection('users').doc(uid).update({ role: 'admin' });
    return { success: true };
});
// ─── Callable: iş ara ───
exports.searchJobs = (0, https_1.onCall)(async (request) => {
    const { category, city, minPrice, maxPrice, limit = 20 } = request.data;
    let query = db.collection('jobs').where('status', '==', 'active');
    if (category)
        query = query.where('categoryId', '==', category);
    if (city)
        query = query.where('city', '==', city);
    if (minPrice !== undefined)
        query = query.where('budget', '>=', minPrice);
    if (maxPrice !== undefined)
        query = query.where('budget', '<=', maxPrice);
    const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
});
//# sourceMappingURL=index.js.map