import 'package:flutter/material.dart';

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
  });

  final String title;
  final String subtitle;
  final List<String> columns;
  final RowsLoader loader;
  final String? emptyHint;

  @override
  State<DataModulePage> createState() => _DataModulePageState();
}

class _DataModulePageState extends State<DataModulePage> {
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
        _error = error.toString();
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
                  Text(widget.title, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text(widget.subtitle),
                ],
              ),
            ),
            FilledButton.tonalIcon(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh'),
            )
          ],
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _rows.isEmpty
                      ? Center(child: Text(widget.emptyHint ?? 'No records found.'))
                      : SmartTable(
                          title: '${widget.title} Data',
                          columns: widget.columns,
                          rows: _rows,
                        ),
        )
      ],
    );
  }
}
