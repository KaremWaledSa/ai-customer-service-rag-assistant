import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/api_constants.dart';

class ApiService {
  late final Dio _dio;
  String? _token;
  bool _tokenLoaded = false;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add interceptor for auth token
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Wait for token to be loaded before making requests
        if (!_tokenLoaded) {
          await _waitForTokenLoad();
        }
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired - try to refresh
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Retry the request
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $_token';
            try {
              final response = await _dio.fetch(opts);
              return handler.resolve(response);
            } catch (e) {
              return handler.next(error);
            }
          }
        }
        return handler.next(error);
      },
    ));

    _loadToken();
  }

  Future<void> _waitForTokenLoad() async {
    // Wait up to 2 seconds for token to be loaded
    int attempts = 0;
    while (!_tokenLoaded && attempts < 20) {
      await Future.delayed(const Duration(milliseconds: 100));
      attempts++;
    }
  }

  Future<void> _loadToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('auth_token');
    } finally {
      _tokenLoaded = true;
    }
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  String? get token => _token;

  Future<bool> _refreshToken() async {
    if (_token == null) return false;

    try {
      final response = await _dio.post(
        ApiConstants.refresh,
        options: Options(headers: {'Authorization': 'Bearer $_token'}),
      );

      if (response.statusCode == 200) {
        final newToken = response.data['token'];
        await setToken(newToken);
        return true;
      }
    } catch (e) {
      // Refresh failed
    }
    return false;
  }

  // Generic HTTP methods
  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) {
    return _dio.get(path, queryParameters: queryParams);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }

  // Multipart upload
  Future<Response> uploadFile(String path, String filePath, {Map<String, dynamic>? data}) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(filePath),
      ...?data,
    });
    return _dio.post(path, data: formData);
  }
}
