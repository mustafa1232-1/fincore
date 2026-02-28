import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/api_service.dart';
import '../widgets/common/smart_table.dart';

typedef RowsLoader = Future<List<Map<String, dynamic>>> Function();

class DataModulePage extends StatefulWidget {
  const DataModulePage({
    super.key,
    required this.title,
    required this.subtitle,
    required this.columns,
    required this.loader,
    this.emptyHint,
    this.moduleKey,
  });

  final String title;
  final String subtitle;
  final List<String> columns;
  final RowsLoader loader;
  final String? emptyHint;
  final String? moduleKey;

  @override
  State<DataModulePage> createState() => _DataModulePageState();
}

class _DataModulePageState extends State<DataModulePage> {
  final ApiService _api = ApiService.instance;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _rows = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rows = await widget.loader();
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = rows;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = _api.describeError(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(widget.subtitle),
                ],
              ),
            ),
            FilledButton.tonalIcon(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? _ErrorBlock(
                  message: _error!,
                  moduleKey: widget.moduleKey,
                  onRetry: _load,
                )
              : _rows.isEmpty
              ? Center(child: Text(widget.emptyHint ?? 'No records found.'))
              : SmartTable(
                  title: '${widget.title} Data',
                  columns: widget.columns,
                  rows: _rows,
                ),
        ),
      ],
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({
    required this.message,
    required this.onRetry,
    this.moduleKey,
  });

  final String message;
  final VoidCallback onRetry;
  final String? moduleKey;

  bool get _isForbidden => message.contains('403');

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isForbidden
                      ? 'Module Disabled or Forbidden'
                      : 'Request Failed',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(message),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.tonal(
                      onPressed: onRetry,
                      child: const Text('Retry'),
                    ),
                    if (_isForbidden && moduleKey != null)
                      FilledButton(
                        onPressed: () => context.go('/modules'),
                        child: const Text('Open Modules'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
