import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_tr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('tr')
  ];

  /// App display name
  ///
  /// In tr, this message translates to:
  /// **'Yapgitsin'**
  String get appTitle;

  /// No description provided for @tabYaptir.
  ///
  /// In tr, this message translates to:
  /// **'Yaptır'**
  String get tabYaptir;

  /// No description provided for @tabYapgitsin.
  ///
  /// In tr, this message translates to:
  /// **'Yapgitsin'**
  String get tabYapgitsin;

  /// No description provided for @tabIsIlanlari.
  ///
  /// In tr, this message translates to:
  /// **'İş İlanları'**
  String get tabIsIlanlari;

  /// No description provided for @tabBildirim.
  ///
  /// In tr, this message translates to:
  /// **'Bildirim'**
  String get tabBildirim;

  /// No description provided for @tabProfil.
  ///
  /// In tr, this message translates to:
  /// **'Profil'**
  String get tabProfil;

  /// No description provided for @subTabHizmetIlanlari.
  ///
  /// In tr, this message translates to:
  /// **'Hizmet İlanları'**
  String get subTabHizmetIlanlari;

  /// No description provided for @subTabFirsatlar.
  ///
  /// In tr, this message translates to:
  /// **'Fırsatlar'**
  String get subTabFirsatlar;

  /// No description provided for @subTabHarita.
  ///
  /// In tr, this message translates to:
  /// **'Harita'**
  String get subTabHarita;

  /// No description provided for @subTabIslerim.
  ///
  /// In tr, this message translates to:
  /// **'İşlerim'**
  String get subTabIslerim;

  /// No description provided for @loading.
  ///
  /// In tr, this message translates to:
  /// **'Yükleniyor…'**
  String get loading;

  /// No description provided for @errorGeneric.
  ///
  /// In tr, this message translates to:
  /// **'Bir hata oluştu'**
  String get errorGeneric;

  /// No description provided for @retry.
  ///
  /// In tr, this message translates to:
  /// **'Tekrar dene'**
  String get retry;

  /// No description provided for @save.
  ///
  /// In tr, this message translates to:
  /// **'Kaydet'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In tr, this message translates to:
  /// **'İptal'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In tr, this message translates to:
  /// **'Sil'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In tr, this message translates to:
  /// **'Düzenle'**
  String get edit;

  /// No description provided for @ok.
  ///
  /// In tr, this message translates to:
  /// **'Tamam'**
  String get ok;

  /// No description provided for @loginTitle.
  ///
  /// In tr, this message translates to:
  /// **'Giriş Yap'**
  String get loginTitle;

  /// No description provided for @loginEmailLabel.
  ///
  /// In tr, this message translates to:
  /// **'E-posta'**
  String get loginEmailLabel;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In tr, this message translates to:
  /// **'Şifre'**
  String get loginPasswordLabel;

  /// No description provided for @loginButton.
  ///
  /// In tr, this message translates to:
  /// **'Giriş Yap'**
  String get loginButton;

  /// No description provided for @registerButton.
  ///
  /// In tr, this message translates to:
  /// **'Kayıt Ol'**
  String get registerButton;

  /// No description provided for @forgotPassword.
  ///
  /// In tr, this message translates to:
  /// **'Şifremi unuttum'**
  String get forgotPassword;

  /// No description provided for @logout.
  ///
  /// In tr, this message translates to:
  /// **'Çıkış Yap'**
  String get logout;

  /// No description provided for @invalidCredentials.
  ///
  /// In tr, this message translates to:
  /// **'E-posta veya şifre hatalı'**
  String get invalidCredentials;

  /// No description provided for @confirm.
  ///
  /// In tr, this message translates to:
  /// **'Onayla'**
  String get confirm;

  /// No description provided for @back.
  ///
  /// In tr, this message translates to:
  /// **'Geri'**
  String get back;

  /// No description provided for @next.
  ///
  /// In tr, this message translates to:
  /// **'İleri'**
  String get next;

  /// No description provided for @done.
  ///
  /// In tr, this message translates to:
  /// **'Bitti'**
  String get done;

  /// No description provided for @share.
  ///
  /// In tr, this message translates to:
  /// **'Paylaş'**
  String get share;

  /// No description provided for @noJobsFound.
  ///
  /// In tr, this message translates to:
  /// **'İlan bulunamadı'**
  String get noJobsFound;

  /// No description provided for @searchPlaceholder.
  ///
  /// In tr, this message translates to:
  /// **'Ara…'**
  String get searchPlaceholder;

  /// No description provided for @filterButton.
  ///
  /// In tr, this message translates to:
  /// **'Filtrele'**
  String get filterButton;

  /// No description provided for @sortButton.
  ///
  /// In tr, this message translates to:
  /// **'Sırala'**
  String get sortButton;

  /// No description provided for @seeAll.
  ///
  /// In tr, this message translates to:
  /// **'Tümünü gör'**
  String get seeAll;

  /// No description provided for @editProfile.
  ///
  /// In tr, this message translates to:
  /// **'Profili Düzenle'**
  String get editProfile;

  /// No description provided for @myAddresses.
  ///
  /// In tr, this message translates to:
  /// **'Adreslerim'**
  String get myAddresses;

  /// No description provided for @myWallet.
  ///
  /// In tr, this message translates to:
  /// **'Cüzdanım'**
  String get myWallet;

  /// No description provided for @mySubscription.
  ///
  /// In tr, this message translates to:
  /// **'Aboneliğim'**
  String get mySubscription;

  /// No description provided for @notifications.
  ///
  /// In tr, this message translates to:
  /// **'Bildirimler'**
  String get notifications;

  /// No description provided for @privacy.
  ///
  /// In tr, this message translates to:
  /// **'Gizlilik'**
  String get privacy;

  /// No description provided for @support.
  ///
  /// In tr, this message translates to:
  /// **'Destek'**
  String get support;

  /// No description provided for @networkError.
  ///
  /// In tr, this message translates to:
  /// **'Bağlantı hatası'**
  String get networkError;

  /// No description provided for @unauthorized.
  ///
  /// In tr, this message translates to:
  /// **'Yetkisiz erişim'**
  String get unauthorized;

  /// No description provided for @notFound.
  ///
  /// In tr, this message translates to:
  /// **'Bulunamadı'**
  String get notFound;

  /// No description provided for @serverError.
  ///
  /// In tr, this message translates to:
  /// **'Sunucu hatası'**
  String get serverError;

  /// No description provided for @languageSettingTitle.
  ///
  /// In tr, this message translates to:
  /// **'Dil / Language'**
  String get languageSettingTitle;

  /// No description provided for @languageSheetTitle.
  ///
  /// In tr, this message translates to:
  /// **'Dil Seçin'**
  String get languageSheetTitle;

  /// No description provided for @welcomeTitle.
  ///
  /// In tr, this message translates to:
  /// **'Hoş Geldiniz!'**
  String get welcomeTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'Devam etmek için giriş yapın.'**
  String get loginSubtitle;

  /// No description provided for @noAccountRegister.
  ///
  /// In tr, this message translates to:
  /// **'Hesabınız yok mu? Kayıt Olun'**
  String get noAccountRegister;

  /// No description provided for @emailPasswordEmpty.
  ///
  /// In tr, this message translates to:
  /// **'E-posta ve şifre boş olamaz'**
  String get emailPasswordEmpty;

  /// No description provided for @postJobTitle.
  ///
  /// In tr, this message translates to:
  /// **'İş Başlığı'**
  String get postJobTitle;

  /// No description provided for @postJobTitleHint.
  ///
  /// In tr, this message translates to:
  /// **'Örn: 3+1 Daire Boyatma'**
  String get postJobTitleHint;

  /// No description provided for @postJobDescription.
  ///
  /// In tr, this message translates to:
  /// **'Açıklama'**
  String get postJobDescription;

  /// No description provided for @postJobBudget.
  ///
  /// In tr, this message translates to:
  /// **'Tahmini Bütçe (₺)'**
  String get postJobBudget;

  /// No description provided for @postJobBudgetHint.
  ///
  /// In tr, this message translates to:
  /// **'Opsiyonel'**
  String get postJobBudgetHint;

  /// No description provided for @postJobCategorySelect.
  ///
  /// In tr, this message translates to:
  /// **'Kategori seçin'**
  String get postJobCategorySelect;

  /// No description provided for @postJobCategoryRequired.
  ///
  /// In tr, this message translates to:
  /// **'Lütfen bir kategori seçin'**
  String get postJobCategoryRequired;

  /// No description provided for @postJobTitleRequired.
  ///
  /// In tr, this message translates to:
  /// **'İş başlığı boş bırakılamaz'**
  String get postJobTitleRequired;

  /// No description provided for @postJobDescriptionRequired.
  ///
  /// In tr, this message translates to:
  /// **'Açıklama boş bırakılamaz'**
  String get postJobDescriptionRequired;

  /// No description provided for @postJobPhotoRequired.
  ///
  /// In tr, this message translates to:
  /// **'En az 1 fotoğraf eklemelisiniz'**
  String get postJobPhotoRequired;

  /// No description provided for @postJobSubmit.
  ///
  /// In tr, this message translates to:
  /// **'İlanı Yayınla'**
  String get postJobSubmit;

  /// No description provided for @postJobLocation.
  ///
  /// In tr, this message translates to:
  /// **'Konum'**
  String get postJobLocation;

  /// No description provided for @postJobLocationHint.
  ///
  /// In tr, this message translates to:
  /// **'Haritadan seçin veya yazın'**
  String get postJobLocationHint;

  /// No description provided for @postJobDraftFound.
  ///
  /// In tr, this message translates to:
  /// **'Taslak bulundu'**
  String get postJobDraftFound;

  /// No description provided for @postJobDraftContinue.
  ///
  /// In tr, this message translates to:
  /// **'Devam et'**
  String get postJobDraftContinue;

  /// No description provided for @postJobDraftDiscard.
  ///
  /// In tr, this message translates to:
  /// **'Hayır, sıfırla'**
  String get postJobDraftDiscard;

  /// No description provided for @postJobDraftSaved.
  ///
  /// In tr, this message translates to:
  /// **'Taslak kaydedildi'**
  String get postJobDraftSaved;

  /// No description provided for @postJobDraftDeleted.
  ///
  /// In tr, this message translates to:
  /// **'Taslak silindi'**
  String get postJobDraftDeleted;

  /// No description provided for @myJobsTitle.
  ///
  /// In tr, this message translates to:
  /// **'İşlerim'**
  String get myJobsTitle;

  /// No description provided for @myJobsListings.
  ///
  /// In tr, this message translates to:
  /// **'İlanlarım'**
  String get myJobsListings;

  /// No description provided for @myJobsExplore.
  ///
  /// In tr, this message translates to:
  /// **'Fırsatları Keşfet'**
  String get myJobsExplore;

  /// No description provided for @myJobsViewDetails.
  ///
  /// In tr, this message translates to:
  /// **'Detayları Gör'**
  String get myJobsViewDetails;

  /// No description provided for @myJobsRepost.
  ///
  /// In tr, this message translates to:
  /// **'Tekrar İlan Aç'**
  String get myJobsRepost;

  /// No description provided for @myJobsWithdrawOffer.
  ///
  /// In tr, this message translates to:
  /// **'Teklifi Geri Çek'**
  String get myJobsWithdrawOffer;

  /// No description provided for @myJobsWithdraw.
  ///
  /// In tr, this message translates to:
  /// **'Geri Çek'**
  String get myJobsWithdraw;

  /// No description provided for @fieldRequired.
  ///
  /// In tr, this message translates to:
  /// **'Boş bırakılamaz'**
  String get fieldRequired;

  /// No description provided for @emailInvalid.
  ///
  /// In tr, this message translates to:
  /// **'Geçersiz e-posta'**
  String get emailInvalid;

  /// No description provided for @passwordTooShort.
  ///
  /// In tr, this message translates to:
  /// **'Şifre çok kısa'**
  String get passwordTooShort;

  /// No description provided for @phoneInvalid.
  ///
  /// In tr, this message translates to:
  /// **'Geçersiz telefon numarası'**
  String get phoneInvalid;

  /// No description provided for @registerTitle.
  ///
  /// In tr, this message translates to:
  /// **'Hesap Oluştur'**
  String get registerTitle;

  /// No description provided for @registerSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'Kişisel bilgilerinizi girin.'**
  String get registerSubtitle;

  /// No description provided for @registerFullName.
  ///
  /// In tr, this message translates to:
  /// **'Ad Soyad *'**
  String get registerFullName;

  /// No description provided for @registerEmailOptional.
  ///
  /// In tr, this message translates to:
  /// **'E-posta (opsiyonel)'**
  String get registerEmailOptional;

  /// No description provided for @registerPhone.
  ///
  /// In tr, this message translates to:
  /// **'Telefon Numarası *'**
  String get registerPhone;

  /// No description provided for @registerPassword.
  ///
  /// In tr, this message translates to:
  /// **'Şifre *'**
  String get registerPassword;

  /// No description provided for @registerPersonalInfo.
  ///
  /// In tr, this message translates to:
  /// **'Kişisel Bilgiler'**
  String get registerPersonalInfo;

  /// No description provided for @registerBirthDateOptional.
  ///
  /// In tr, this message translates to:
  /// **'Doğum Tarihi (opsiyonel)'**
  String get registerBirthDateOptional;

  /// No description provided for @registerCityOptional.
  ///
  /// In tr, this message translates to:
  /// **'Şehir (opsiyonel)'**
  String get registerCityOptional;

  /// No description provided for @registerDistrictOptional.
  ///
  /// In tr, this message translates to:
  /// **'İlçe (opsiyonel)'**
  String get registerDistrictOptional;

  /// No description provided for @registerAddressOptional.
  ///
  /// In tr, this message translates to:
  /// **'Adres (opsiyonel)'**
  String get registerAddressOptional;

  /// No description provided for @registerContinue.
  ///
  /// In tr, this message translates to:
  /// **'Devam Et →'**
  String get registerContinue;

  /// No description provided for @registerRequiredFields.
  ///
  /// In tr, this message translates to:
  /// **'Ad soyad, telefon ve şifre zorunludur.'**
  String get registerRequiredFields;

  /// No description provided for @twoFactorTitle.
  ///
  /// In tr, this message translates to:
  /// **'İki Adımlı Doğrulama'**
  String get twoFactorTitle;

  /// No description provided for @twoFactorHeader.
  ///
  /// In tr, this message translates to:
  /// **'Doğrulama Kodu'**
  String get twoFactorHeader;

  /// No description provided for @twoFactorPrompt.
  ///
  /// In tr, this message translates to:
  /// **'Authenticator uygulamanızdaki 6 haneli kodu giriniz.'**
  String get twoFactorPrompt;

  /// No description provided for @twoFactorVerify.
  ///
  /// In tr, this message translates to:
  /// **'Doğrula'**
  String get twoFactorVerify;

  /// No description provided for @twoFactorInvalid.
  ///
  /// In tr, this message translates to:
  /// **'6 haneli kodu giriniz'**
  String get twoFactorInvalid;

  /// No description provided for @notificationsTitle.
  ///
  /// In tr, this message translates to:
  /// **'Bildirimler'**
  String get notificationsTitle;

  /// No description provided for @notificationsLoginPrompt.
  ///
  /// In tr, this message translates to:
  /// **'Bildirimleri görmek için giriş yapın.'**
  String get notificationsLoginPrompt;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In tr, this message translates to:
  /// **'Tümünü Oku'**
  String get notificationsMarkAllRead;

  /// No description provided for @notificationsEmpty.
  ///
  /// In tr, this message translates to:
  /// **'Bildirim yok'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyMessage.
  ///
  /// In tr, this message translates to:
  /// **'Yeni gelişmeler burada görünecek.'**
  String get notificationsEmptyMessage;

  /// No description provided for @chatTitle.
  ///
  /// In tr, this message translates to:
  /// **'Mesajlar'**
  String get chatTitle;

  /// No description provided for @chatRefresh.
  ///
  /// In tr, this message translates to:
  /// **'Yenile'**
  String get chatRefresh;

  /// No description provided for @chatEmpty.
  ///
  /// In tr, this message translates to:
  /// **'Henüz mesaj yok'**
  String get chatEmpty;

  /// No description provided for @chatEmptyHint.
  ///
  /// In tr, this message translates to:
  /// **'Merhaba diyerek başlayın!'**
  String get chatEmptyHint;

  /// No description provided for @chatTypeMessage.
  ///
  /// In tr, this message translates to:
  /// **'Mesaj yazın...'**
  String get chatTypeMessage;

  /// No description provided for @chatTemplate.
  ///
  /// In tr, this message translates to:
  /// **'Şablon'**
  String get chatTemplate;

  /// No description provided for @chatAttachmentPhoto.
  ///
  /// In tr, this message translates to:
  /// **'Fotoğraf'**
  String get chatAttachmentPhoto;

  /// No description provided for @chatOnline.
  ///
  /// In tr, this message translates to:
  /// **'Çevrimiçi'**
  String get chatOnline;

  /// No description provided for @chatTyping.
  ///
  /// In tr, this message translates to:
  /// **'yazıyor…'**
  String get chatTyping;

  /// No description provided for @chatLoadFailed.
  ///
  /// In tr, this message translates to:
  /// **'Konuşmalar yüklenemedi'**
  String get chatLoadFailed;

  /// No description provided for @chatNoConversations.
  ///
  /// In tr, this message translates to:
  /// **'Henüz mesaj yok'**
  String get chatNoConversations;

  /// No description provided for @chatNoConversationsMessage.
  ///
  /// In tr, this message translates to:
  /// **'Bir ilana teklif verdiğinde veya teklif aldığında konuşmalar burada görünecek.'**
  String get chatNoConversationsMessage;

  /// No description provided for @chatUnknownUser.
  ///
  /// In tr, this message translates to:
  /// **'Kullanıcı'**
  String get chatUnknownUser;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'tr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'tr':
      return AppLocalizationsTr();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
