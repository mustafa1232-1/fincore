import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  ApiService._();

  static final ApiService instance = ApiService._();

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _tenantKey = 'tenant_id';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'https://keen-beauty-production-ed20.up.railway.app/api/v1',
      ),
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  String? _accessToken;
  String? _tenantId;

  String? get tenantId => _tenantId;
  bool get hasSession => _accessToken != null && _tenantId != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString(_accessKey);
    _tenantId = prefs.getString(_tenantKey);

    _dio.interceptors.clear();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required String tenantId,
  }) async {
    _accessToken = accessToken;
    _tenantId = tenantId;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessKey, accessToken);
    await prefs.setString(_refreshKey, refreshToken);
    await prefs.setString(_tenantKey, tenantId);
  }

  Future<void> clearSession() async {
    _accessToken = null;
    _tenantId = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessKey);
    await prefs.remove(_refreshKey);
    await prefs.remove(_tenantKey);
  }

  Future<Map<String, dynamic>> login({
    required String tenantId,
    required String email,
    required String password,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        'tenantId': tenantId,
        'email': email,
        'password': password,
      },
    );

    return response.data ?? {};
  }

  Future<Map<String, dynamic>> fetchDashboardOverview() async {
    final response = await _dio.get<Map<String, dynamic>>('/dashboard/overview');
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> fetchModules() async {
    final response = await _dio.get<List<dynamic>>('/modules');
    return {
      'data': response.data ?? [],
    };
  }

  Future<Map<String, dynamic>> fetchGlobalSearch(String query) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/search',
      queryParameters: {'q': query},
    );
    return response.data ?? {};
  }

  Future<List<dynamic>> fetchAccounts() async {
    final response = await _dio.get<Map<String, dynamic>>('/accounting/accounts');
    return (response.data?['flat'] as List<dynamic>? ?? []);
  }

  Future<List<dynamic>> fetchTrialBalance({required String from, required String to}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/reports/trial-balance',
      queryParameters: {'from': from, 'to': to},
    );

    return (response.data?['lines'] as List<dynamic>? ?? []);
  }

  Future<Map<String, dynamic>> fetchIncomeStatement({
    required String from,
    required String to,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/reports/income-statement',
      queryParameters: {'from': from, 'to': to},
    );

    return response.data ?? {};
  }

  Future<List<dynamic>> fetchBudgets() async {
    final response = await _dio.get<List<dynamic>>('/budgets');
    return response.data ?? [];
  }

  Future<List<dynamic>> fetchForecasts() async {
    final response = await _dio.get<List<dynamic>>('/forecasts');
    return response.data ?? [];
  }

  Future<List<dynamic>> fetchItems() async {
    final response = await _dio.get<List<dynamic>>('/inventory/items');
    return response.data ?? [];
  }

  Future<List<dynamic>> fetchInvoices() async {
    final response = await _dio.get<List<dynamic>>('/invoices');
    return response.data ?? [];
  }

  Future<Map<String, dynamic>> askAi(String message) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/ai/ask',
      data: {'message': message},
    );
    return response.data ?? {};
  }

  String describeError(Object error) {
    if (error is DioException) {
      final message = error.response?.data is Map<String, dynamic>
          ? (error.response?.data['message'] as String? ?? error.message)
          : error.message;
      return message ?? 'Network request failed';
    }

    if (kDebugMode) {
      return error.toString();
    }

    return 'Unexpected error';
  }
}
