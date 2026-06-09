# Zombi Kasa İndex

Tarih: 2026-06-09
Sürüm: 1 (manuel sweep — Flutter unused full-file kasası)

Bu klasör canlı kaynaktan çıkarılmış ama "yarın geri çağırılabilir" kodları tutar.
Orijinal yol struct'u korunur, böylece `git mv` ile yerine geri konabilir.

## Geri çağırma genel kalıp

```bash
# Tam dosya
git mv _zombi_kasa/<full_path> <full_path>
# Ardından silinen import/yorum bloklarını commit history'den geri al
```

---

## Dosya: hizmet_app/lib/features/auth/presentation/screens/customer_public_profile_screen.dart

- **Tür:** tam dosya (660 satır, `CustomerPublicProfileScreen` widget'ı)
- **Sebep:** Phase 453'te `/musteri/:id` route'u `PublicProfileScreen`'e yönlendirildi; sınıf hiçbir yerden çağrılmıyor. Router'da sadece "ignore: unused_import" ile referans tutuluyordu.
- **Geri çağırma:**
  ```bash
  git mv _zombi_kasa/hizmet_app/lib/features/auth/presentation/screens/customer_public_profile_screen.dart \
         hizmet_app/lib/features/auth/presentation/screens/customer_public_profile_screen.dart
  ```
  `app_router.dart`'ta `customer_public_profile_screen.dart` import'unu yeniden ekle, `/musteri/:id` GoRoute builder'ını `CustomerPublicProfileScreen(userId: ...)` ile değiştir.
- **Bağlam:** Müşteri profilleri için ayrı tasarımdı; Phase 453'te tek `PublicProfileScreen` ile birleşince işsiz kaldı. Tasarım stats card + customer-only stat blokları içeriyor — gelecekte müşteri-spesifik public görünüm istenirse referans dosya.

## Dosya: hizmet_app/lib/features/offers/widgets/offer_line_items_editor.dart

- **Tür:** tam dosya (229 satır, `OfferLineItemsEditor` StatefulWidget)
- **Sebep:** Phase 447 (hatalar.txt #7) — "Kalem Bazlı Detay" alanı kullanıcı isteğiyle gizlendi. `job_detail_screen.dart` içindeki kullanım yorum satırına alınmıştı; import "ignore: unused_import" ile tutuluyordu. View versiyonu (`offer_line_items_view.dart`) HÂLÂ KULLANIMDA — sadece editor zombi.
- **Geri çağırma:**
  ```bash
  git mv _zombi_kasa/hizmet_app/lib/features/offers/widgets/offer_line_items_editor.dart \
         hizmet_app/lib/features/offers/widgets/offer_line_items_editor.dart
  ```
  `job_detail_screen.dart` import'unu geri ekle ve ~line 2329 civarındaki "Kalem Bazlı Detay" ExpansionTile bloğunu uncomment et (git history `9c985333` öncesi versiyona bak).
- **Bağlam:** Teklif formunda usta'nın kalem-kalem fiyat girmesine yarayan editör. Kullanıcı bunu istemedi → gizlendi ama widget tasarımı sağlam, tekrar açmak isterse hazır.
