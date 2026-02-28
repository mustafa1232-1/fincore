import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DraftState {
  const DraftState({this.values = const {}, this.history = const []});

  final Map<String, String> values;
  final List<Map<String, String>> history;

  DraftState copyWith({
    Map<String, String>? values,
    List<Map<String, String>>? history,
  }) {
    return DraftState(
      values: values ?? this.values,
      history: history ?? this.history,
    );
  }
}

class DraftNotifier extends StateNotifier<DraftState> {
  DraftNotifier() : super(const DraftState()) {
    _load();
  }

  static const _storageKey = 'fincore_form_drafts';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_storageKey) ?? [];
    final map = <String, String>{};

    for (final row in raw) {
      final split = row.split('::');
      if (split.length == 2) {
        map[split[0]] = split[1];
      }
    }

    state = state.copyWith(values: map);
  }

  Future<void> saveField(String key, String value) async {
    final nextValues = Map<String, String>.from(state.values)..[key] = value;
    final nextHistory = [...state.history, state.values];
    state = state.copyWith(values: nextValues, history: nextHistory);

    await _persist();
  }

  Future<void> undo() async {
    if (state.history.isEmpty) {
      return;
    }

    final previous = state.history.last;
    final nextHistory = [...state.history]..removeLast();

    state = state.copyWith(values: previous, history: nextHistory);
    await _persist();
  }

  String getValue(String key) => state.values[key] ?? '';

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final rows = state.values.entries
        .map((e) => '${e.key}::${e.value}')
        .toList();
    await prefs.setStringList(_storageKey, rows);
  }
}

final draftProvider = StateNotifierProvider<DraftNotifier, DraftState>(
  (ref) => DraftNotifier(),
);
