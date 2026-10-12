import '../../core/constants/api_constants.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _apiService.post(
      ApiConstants.login,
      data: {
        'email': email,
        'password': password,
      },
    );

    if (response.statusCode == 200) {
      final token = response.data['token'];
      await _apiService.setToken(token);
      return response.data;
    }

    throw Exception(response.data['error'] ?? 'Login failed');
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final response = await _apiService.get(ApiConstants.me);
      if (response.statusCode == 200) {
        return response.data['user'];
      }
    } catch (e) {
      // Not authenticated
    }
    return null;
  }

  Future<void> logout() async {
    await _apiService.clearToken();
  }

  bool get isAuthenticated => _apiService.token != null;
}
