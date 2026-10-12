import 'package:flutter/foundation.dart';
import '../../../data/services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;

  bool _isLoading = true;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _error;

  AuthProvider(this._authService) {
    _checkAuth();
  }

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get error => _error;
  String get userName => _user?['name'] ?? 'دكتور';

  Future<void> _checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _authService.getCurrentUser();
      if (user != null) {
        _user = user;
        _isAuthenticated = true;
      }
    } catch (e) {
      // Not authenticated
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.login(email, password);
      _user = result['user'];
      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
