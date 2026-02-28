import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class AuthState {
  const AuthState({
    this.loading = false,
    this.isAuthenticated = false,
    this.tenantId,
    this.userName,
    this.error,
  });

  final bool loading;
  final bool isAuthenticated;
  final String? tenantId;
  final String? userName;
  final String? error;

  AuthState copyWith({
    bool? loading,
    bool? isAuthenticated,
    String? tenantId,
    String? userName,
    String? error,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      tenantId: tenantId ?? this.tenantId,
      userName: userName ?? this.userName,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(loading: true)) {
    _bootstrap();
  }

  final ApiService _api = ApiService.instance;

  Future<void> _bootstrap() async {
    await _api.init();
    state = state.copyWith(
      loading: false,
      isAuthenticated: _api.hasSession,
      tenantId: _api.tenantId,
      error: null,
    );
  }

  Future<bool> login({
    required String tenantId,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(loading: true, error: null);

    try {
      final result = await _api.login(
        tenantId: tenantId,
        email: email,
        password: password,
      );

      await _api.saveSession(
        accessToken: result['accessToken'] as String,
        refreshToken: result['refreshToken'] as String,
        tenantId: tenantId,
      );

      final user = result['user'] as Map<String, dynamic>?;

      state = AuthState(
        loading: false,
        isAuthenticated: true,
        tenantId: tenantId,
        userName: user?['name'] as String?,
      );

      return true;
    } catch (error) {
      state = AuthState(
        loading: false,
        isAuthenticated: false,
        error: _api.describeError(error),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearSession();
    state = const AuthState(
      loading: false,
      isAuthenticated: false,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
