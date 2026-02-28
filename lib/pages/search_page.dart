import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/search_provider.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key, this.query = ''});

  final String query;

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  @override
  void initState() {
    super.initState();
    _trigger(widget.query);
  }

  @override
  void didUpdateWidget(covariant SearchPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query) {
      _trigger(widget.query);
    }
  }

  void _trigger(String query) {
    if (query.trim().isEmpty) {
      return;
    }
    Future.microtask(() => ref.read(searchProvider.notifier).search(query));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(searchProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Global Search', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text('Instant results across accounts, entries, invoices, items and users.'),
        const SizedBox(height: 12),
        if (state.loading) const LinearProgressIndicator(),
        if (state.error != null) Text(state.error!, style: const TextStyle(color: Color(0xFFDC2626))),
        const SizedBox(height: 8),
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: ListView(
                children: [
                  _block(context, 'Accounts', state.results['accounts'] as List<dynamic>? ?? []),
                  _block(context, 'Journal Entries', state.results['journalEntries'] as List<dynamic>? ?? []),
                  _block(context, 'Invoices', state.results['invoices'] as List<dynamic>? ?? []),
                  _block(context, 'Items', state.results['items'] as List<dynamic>? ?? []),
                  _block(context, 'Users', state.results['users'] as List<dynamic>? ?? []),
                ],
              ),
            ),
          ),
        )
      ],
    );
  }

  Widget _block(BuildContext context, String title, List<dynamic> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...items.take(8).map((item) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(item.values.join(' | ')),
            )),
        const Divider(height: 20)
      ],
    );
  }
}
