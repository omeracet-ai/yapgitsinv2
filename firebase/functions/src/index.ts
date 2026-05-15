import * as admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import * as functionsV1 from 'firebase-functions/v1';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

// ─── Auth trigger: yeni kullanıcı kaydında Firestore profili oluştur ───
export const onUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    phone: user.phoneNumber ?? null,
    role: 'client',
    isVerified: false,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ─── Auth trigger: kullanıcı silinince Firestore kaydını temizle ───
export const onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  const batch = db.batch();
  batch.delete(db.collection('users').doc(user.uid));
  batch.delete(db.collection('providers').doc(user.uid));
  await batch.commit();
});

// ─── Firestore trigger: iş tamamlanınca bildirim gönder ───
export const onJobStatusChange = onDocumentUpdated('jobs/{jobId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before['status'] === after['status']) return;

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
export const onOfferAccepted = onDocumentUpdated('offers/{offerId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before['status'] !== 'pending' || after['status'] !== 'accepted') return;

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
export const setAdminRole = onCall(async (request) => {
  if (!request.auth || request.auth.token['role'] !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin yetkisi gerekli.');
  }
  const { uid } = request.data as { uid: string };
  await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
  await db.collection('users').doc(uid).update({ role: 'admin' });
  return { success: true };
});

// ─── Callable: iş ara ───
export const searchJobs = onCall(async (request) => {
  const { category, city, minPrice, maxPrice, limit = 20 } = request.data as {
    category?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  };

  let query: admin.firestore.Query = db.collection('jobs').where('status', '==', 'active');
  if (category) query = query.where('categoryId', '==', category);
  if (city) query = query.where('city', '==', city);
  if (minPrice !== undefined) query = query.where('budget', '>=', minPrice);
  if (maxPrice !== undefined) query = query.where('budget', '<=', maxPrice);

  const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
