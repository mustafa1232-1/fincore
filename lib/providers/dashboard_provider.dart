import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard_models.dart';
import '../services/api_service.dart';

class DashboardState {
  const DashboardState({
    this.loading = false,
    this.data,
    this.error,
  });

  final bool loading;
  final DashboardOverview? data;
  final String? error;

  DashboardState copyWith({
    bool? loading,
    DashboardOverview? data,
    String? error,
  }) {
    return DashboardState(
      loading: loading ?? this.loading,
      data: data ?? this.data,
      error: error,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  DashboardNotifier() : super(const DashboardState());

  final ApiService _api = ApiService.instance;

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);

    try {
      final json = await _api.fetchDashboardOverview();
      state = DashboardState(
        loading: false,
        data: DashboardOverview.fromJson(json),
      );
    } catch (error) {
      state = DashboardState(
        loading: false,
        error: _api.describeError(error),
      );
    }
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>(
  (ref) => DashboardNotifier(),
);
