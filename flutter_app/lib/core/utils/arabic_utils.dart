import 'package:intl/intl.dart';

class ArabicUtils {
  /// Format number with Arabic numerals
  static String formatNumber(num number) {
    final arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return number.toString().split('').map((char) {
      final digit = int.tryParse(char);
      return digit != null ? arabicNumerals[digit] : char;
    }).join();
  }

  /// Format date in Arabic
  static String formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 60) {
      return 'الآن';
    } else if (diff.inMinutes < 60) {
      final minutes = diff.inMinutes;
      if (minutes == 1) return 'منذ دقيقة';
      if (minutes == 2) return 'منذ دقيقتين';
      if (minutes <= 10) return 'منذ $minutes دقائق';
      return 'منذ $minutes دقيقة';
    } else if (diff.inHours < 24) {
      final hours = diff.inHours;
      if (hours == 1) return 'منذ ساعة';
      if (hours == 2) return 'منذ ساعتين';
      if (hours <= 10) return 'منذ $hours ساعات';
      return 'منذ $hours ساعة';
    } else if (diff.inDays < 7) {
      final days = diff.inDays;
      if (days == 1) return 'أمس';
      if (days == 2) return 'منذ يومين';
      return 'منذ $days أيام';
    } else {
      return DateFormat('d/M/yyyy').format(date);
    }
  }

  /// Format time in Arabic (12-hour format)
  static String formatTime(DateTime time) {
    final hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = hour < 12 ? 'ص' : 'م';
    final hour12 = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return '$hour12:$minute $period';
  }

  /// Get greeting based on time of day
  static String getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'صباح الخير';
    } else if (hour < 17) {
      return 'مساء الخير';
    } else {
      return 'مساء النور';
    }
  }

  /// Truncate Arabic text with ellipsis
  static String truncate(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return '${text.substring(0, maxLength)}...';
  }

  /// Format percentage
  static String formatPercentage(double value) {
    return '${(value * 100).toStringAsFixed(0)}٪';
  }

  /// Format file size
  static String formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes بايت';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} كيلوبايت';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} ميجابايت';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} جيجابايت';
  }
}
