import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class SearchState {
  const SearchState({
    this.loading = false,
    this.query = '',
    this.results = const {},
    this.error,
  });

  final bool loading;
  final String query;
  final Map<String, dynamic> results;
  final String? error;

  SearchState copyWith({
    bool? loading,
    String? query,
    Map<String, dynamic>? results,
    String? error,
  }) {
    return SearchState(
      loading: loading ?? this.loading,
      query: query ?? this.query,
      results: results ?? this.results,
      error: error,
    );
  }
}

class SearchNotifier extends StateNotifier<SearchState> {
  SearchNotifier() : super(const SearchState());

  final ApiService _api = ApiService.instance;

  Future<void> search(String query) async {
    if (query.trim().isEmpty) {
      state = const SearchState();
      return;
    }

    state = state.copyWith(loading: true, query: query, error: null);

    try {
      final result = await _api.fetchGlobalSearch(query);
      state = SearchState(
        loading: false,
        query: query,
        results: result,
      );
    } catch (error) {
      state = SearchState(
        loading: false,
        query: query,
        error: _api.describeError(error),
      );
    }
  }
}

final searchProvider = StateNotifierProvider<SearchNotifier, SearchState>(
  (ref) => SearchNotifier(),
);
