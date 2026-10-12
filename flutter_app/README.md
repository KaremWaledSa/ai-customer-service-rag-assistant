# 📱 Flutter App - مساعد التغذية

## الحالة: ✅ مكتمل

تطبيق Flutter متعدد المنصات (Windows, Android, iOS) للدكتور لإدارة ردود WhatsApp.

---

## 🚀 البدء السريع

### 1. المتطلبات
- Flutter 3.0+
- Dart 3.0+

### 2. التثبيت

```bash
cd flutter_app

# تثبيت المكتبات
flutter pub get

# تشغيل على Windows
flutter run -d windows

# تشغيل على Android
flutter run

# بناء APK
flutter build apk

# بناء Windows exe
flutter build windows
```

---

## 📁 هيكل المشروع

```
flutter_app/
├── lib/
│   ├── main.dart                    # نقطة البداية
│   ├── core/
│   │   ├── constants/
│   │   │   └── api_constants.dart   # روابط API
│   │   └── themes/
│   │       └── app_theme.dart       # الألوان والتصميم
│   ├── data/
│   │   ├── models/
│   │   │   ├── message.dart         # نموذج الرسالة
│   │   │   └── knowledge_entry.dart # نموذج المحادثة
│   │   └── services/
│   │       ├── api_service.dart     # HTTP client
│   │       ├── auth_service.dart    # تسجيل الدخول
│   │       └── websocket_service.dart # Real-time
│   └── features/
│       ├── auth/
│       │   ├── providers/
│       │   │   └── auth_provider.dart
│       │   └── presentation/screens/
│       │       └── login_screen.dart
│       ├── home/
│       │   └── presentation/screens/
│       │       └── home_screen.dart
│       ├── inbox/
│       │   ├── providers/
│       │   │   └── inbox_provider.dart
│       │   └── presentation/screens/
│       │       ├── inbox_screen.dart
│       │       └── message_detail_screen.dart
│       ├── knowledge/
│       │   ├── providers/
│       │   │   └── knowledge_provider.dart
│       │   └── presentation/screens/
│       │       └── knowledge_screen.dart
│       └── settings/
│           └── presentation/screens/
│               └── settings_screen.dart
└── pubspec.yaml
```

---

## 🖥️ الشاشات

### 1. تسجيل الدخول
- البريد: `doctor@nutrition.sa`
- كلمة المرور: `doctor123`

### 2. الوارد (Inbox)
- قائمة الرسائل المعلّقة
- بادج لعدد الرسائل الجديدة
- تحديث تلقائي عبر WebSocket

### 3. تفاصيل الرسالة
- رسالة العميل
- أمثلة RAG المشابهة
- رد الذكاء الاصطناعي (قابل للتعديل)
- أزرار: موافقة / تعديل وإرسال / رفض

### 4. قاعدة المعرفة
- عرض كل المحادثات
- بحث بالتشابه الدلالي
- إضافة محادثات جديدة
- حذف المحادثات

### 5. الإعدادات
- معلومات المستخدم
- إحصائيات
- تسجيل الخروج

---

## ⚙️ الإعدادات

### تغيير عنوان الخادم

في `lib/core/constants/api_constants.dart`:

```dart
static const String baseUrl = 'http://your-server:3001';
```

### للإنتاج (Production)

```dart
static const String baseUrl = 'https://your-domain.com';
```

---

## 🔧 التقنيات

- **State Management**: Provider
- **HTTP**: Dio
- **WebSocket**: web_socket_channel
- **Storage**: shared_preferences, sqflite
- **UI**: Material 3

---

## 📱 الميزات

- ✅ تسجيل دخول آمن (JWT)
- ✅ عرض الرسائل المعلّقة
- ✅ عرض أمثلة RAG
- ✅ تعديل الردود قبل الإرسال
- ✅ إضافة للمعرفة تلقائياً
- ✅ بحث في قاعدة المعرفة
- ✅ تحديثات فورية (WebSocket)
- ✅ دعم RTL العربي
- ✅ تصميم متجاوب
