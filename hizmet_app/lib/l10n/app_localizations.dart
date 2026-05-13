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
